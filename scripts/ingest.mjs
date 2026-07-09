#!/usr/bin/env node
/**
 * Feekr font ingestion pipeline (Node / fontkit / wawoff2).
 *
 *   node scripts/ingest.mjs scan      [--limit N]   parse metadata -> data/records.jsonl (resumable)
 *   node scripts/ingest.mjs organize                group by family, hardlink into font/<Family>/, write data/catalog.json
 *   node scripts/ingest.mjs web       [--limit N]   compress selected styles to WOFF2 into public/fonts/<slug>/
 *   node scripts/ingest.mjs stats
 *   node scripts/ingest.mjs all       (= scan + organize)
 */
import * as fontkit from "fontkit";
import * as wawoff2 from "wawoff2";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(url.fileURLToPath(new URL("..", import.meta.url)));
const SRC = String.raw`C:\Users\feekr\Documents\feekr\Jama fonts`;
const LIB = path.join(ROOT, "font");
const DATA = path.join(ROOT, "data");
// Generated webfont cache lives outside public/ (served only via /api/webfont).
const PUBFONTS = path.join(ROOT, ".cache", "webfonts");
const RECORDS = path.join(DATA, "records.jsonl");
const CATALOG = path.join(DATA, "catalog.json");
const FONT_EXT = new Set([".ttf", ".otf", ".ttc", ".otc"]);

// ---------- style / weight parsing ----------
const WEIGHT_TOKENS = [
  ["extrablack", 950], ["ultrablack", 950],
  ["extrabold", 800], ["ultrabold", 800],
  ["extralight", 200], ["ultralight", 200],
  ["semibold", 600], ["demibold", 600], ["semilight", 350],
  ["hairline", 100], ["thin", 100],
  ["light", 300], ["medium", 500],
  ["black", 900], ["heavy", 900],
  ["bold", 700],
  ["book", 400], ["regular", 400], ["normal", 400], ["roman", 400], ["plain", 400],
];
const WEIGHT_NAME = {
  100: "Thin", 200: "ExtraLight", 300: "Light", 350: "SemiLight", 400: "Regular",
  500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black", 950: "ExtraBlack",
};
const ITALIC_RE = /(italic|oblique|kursiv)/i;
// Longest-first so "extracondensed" wins over "condensed".
const WIDTH_TOKENS = [
  ["extracondensed", "XCond"], ["semicondensed", "SmCond"], ["ultracondensed", "XCond"],
  ["condensed", "Cond"], ["compressed", "Cmpr"], ["narrow", "Cond"],
  ["extraexpanded", "XExt"], ["semiexpanded", "SmExt"], ["expanded", "Ext"], ["extended", "Ext"], ["wide", "Wide"],
];

function parseStyle(subfamily, weightClass, macItalic, italicAngle) {
  const low = (subfamily || "").toLowerCase();
  // Match tokens against a space/hyphen-stripped form so "Extra Bold" != "Bold".
  const compactLow = low.replace(/[\s_-]+/g, "");
  const italic = ITALIC_RE.test(low) || !!macItalic || (italicAngle && Math.abs(italicAngle) > 0.5);
  let weight = null;
  for (const [tok, w] of WEIGHT_TOKENS) { if (compactLow.includes(tok)) { weight = w; break; } }
  if (weight == null) {
    if (Number.isInteger(weightClass) && weightClass >= 100 && weightClass <= 1000) {
      weight = Math.max(100, Math.min(900, Math.round(weightClass / 100) * 100));
    } else weight = 400;
  }
  let width = "";
  for (const [tok, w] of WIDTH_TOKENS) { if (compactLow.includes(tok)) { width = w; break; } }
  return { weight, italic: !!italic, width };
}
function styleSlug(weight, italic, width) {
  const base = WEIGHT_NAME[weight] || "Regular";
  const w = width || "";
  if (base === "Regular" && italic) return `${w}Italic`;
  return `${w}${base}${italic ? "Italic" : ""}`;
}

// ---------- name helpers ----------
function pick(rec) {
  if (!rec) return null;
  if (typeof rec === "string") return rec.trim() || null;
  // Prefer English, then any Latin-script value, then the first entry — so cuts
  // of one family don't split under different localized name keys.
  const byKey = rec.en || rec["en-US"] || rec.enUS;
  if (byKey) return String(byKey).trim() || null;
  const vals = Object.values(rec).map((v) => String(v).trim()).filter(Boolean);
  const latin = vals.find((v) => /[A-Za-z]/.test(v));
  return latin || vals[0] || null;
}
const INVALID = /[<>:"/\\|?*\x00-\x1f]/g;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
function safeFolder(name) {
  let n = (name || "").replace(INVALID, "").replace(/\s+/g, " ").trim().slice(0, 120)
    .replace(/^[.\s]+|[.\s]+$/g, ""); // strip leading/trailing dot/space AFTER slice
  if (!n || /^\.+$/.test(n)) return "Unnamed";
  if (RESERVED.test(n)) n = `${n}-font`;
  return n;
}
// Cyrillic → Latin so non-Latin family names get meaningful, distinct slugs.
const CYR_MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "i", ь: "",
  э: "e", ю: "yu", я: "ya", ғ: "g", қ: "q", ҳ: "h", ў: "o",
};
function translit(name) {
  return (name || "").replace(/[Ѐ-ӿ]/g, (ch) => CYR_MAP[ch.toLowerCase()] ?? ch);
}
function shortHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}
function slugify(name) {
  const base = translit(name || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return base || (name ? `font-${shortHash(name)}` : "font");
}
function compact(name) {
  return translit(name || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "");
}
function classifyLicense(cpy, lic) {
  const b = ((cpy || "") + " " + (lic || "")).toLowerCase();
  if (/open font license|\bofl\b/.test(b)) return "OFL";
  if (/apache/.test(b)) return "Apache";
  if (/public domain/.test(b)) return "Public Domain";
  if (/freeware|free for|free font/.test(b)) return "Freeware";
  if (/shareware/.test(b)) return "Shareware";
  if (/bitstream/.test(b)) return "Bitstream";
  if (/adobe/.test(b)) return "Adobe";
  if (/monotype/.test(b)) return "Monotype";
  if (/linotype/.test(b)) return "Linotype";
  if (/all rights reserved/.test(b)) return "All Rights Reserved";
  return "Unknown";
}
function guessCategory(family, sub, hasLatin, isFixed) {
  const n = ((family || "") + " " + (sub || "")).toLowerCase();
  if (!hasLatin) return "Dingbat";
  if (isFixed || /\bmono/.test(n)) return "Monospace";
  if (/script|brush|hand|calligr|signature|cursive/.test(n)) return "Script";
  if (/slab/.test(n)) return "Slab";
  if (/sans|grotesk|grotesque|gothic|neue|helvet/.test(n)) return "Sans";
  if (/serif|roman|times|garamond|didot|bodoni/.test(n)) return "Serif";
  return "Display";
}

// ---------- probe one file ----------
function probeFont(f, filePath, ext, size) {
  const r = f.name?.records || {};
  const family = pick(r.preferredFamily) || pick(r.fontFamily) || f.familyName ||
    path.basename(filePath, path.extname(filePath));
  const subfamily = pick(r.preferredSubfamily) || pick(r.fontSubfamily) || f.subfamilyName || "Regular";
  let weightClass = null, fixed = false;
  try { weightClass = f["OS/2"]?.usWeightClass ?? null; } catch {}
  try { fixed = !!f["post"]?.isFixedPitch; } catch {}
  let macItalic = false;
  try { macItalic = !!(f["head"]?.macStyle & 0b10); } catch {}
  const { weight, italic, width } = parseStyle(subfamily, weightClass, macItalic, f.italicAngle);
  let hasLatin = false, glyphs = 0, upm = 1000;
  try { glyphs = f.numGlyphs || 0; } catch {}
  try { upm = f.unitsPerEm || 1000; } catch {}
  try { hasLatin = f.hasGlyphForCodePoint(0x41) && f.hasGlyphForCodePoint(0x61) && f.hasGlyphForCodePoint(0x52); } catch {}
  const cpy = pick(r.copyright), lic = pick(r.license);
  return {
    path: filePath, ext, size,
    family, subfamily, full: pick(r.fullName), ps: pick(r.postscriptName),
    weight, italic, width,
    designer: pick(r.designer), manufacturer: pick(r.manufacturer),
    designerUrl: pick(r.designerURL), vendorUrl: pick(r.vendorURL),
    copyright: cpy, license: lic, licenseUrl: pick(r.licenseURL),
    version: pick(r.version), unitsPerEm: upm, glyphs, hasLatin,
    licenseClass: classifyLicense(cpy, lic),
    category: guessCategory(family, subfamily, hasLatin, fixed),
  };
}

function probePath(filePath) {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  let size = 0; try { size = fs.statSync(filePath).size; } catch {}
  try {
    const opened = fontkit.openSync(filePath);
    if (opened && Array.isArray(opened.fonts)) { // TTC/OTC collection
      // Only the first face is probed and the container can't be losslessly
      // WOFF2-compressed, so flag it and let organize() skip it with a warning.
      return { ...probeFont(opened.fonts[0], filePath, ext, size), collection: true };
    }
    return probeFont(opened, filePath, ext, size);
  } catch (e) {
    return { path: filePath, ext, size, error: String(e.message || e).slice(0, 160) };
  }
}

// ---------- fs walk ----------
function* walk(dir) {
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (FONT_EXT.has(path.extname(e.name).toLowerCase())) yield p;
  }
}

// ---------- commands ----------
function loadDonePaths() {
  const done = new Set();
  if (!fs.existsSync(RECORDS)) return done;
  for (const line of fs.readFileSync(RECORDS, "utf8").split("\n")) {
    if (!line) continue;
    try { done.add(JSON.parse(line).path); } catch {}
  }
  return done;
}

function scan(limit) {
  fs.mkdirSync(DATA, { recursive: true });
  if (!fs.existsSync(RECORDS)) fs.writeFileSync(RECORDS, "");
  const done = loadDonePaths();
  let files = [...walk(SRC)].filter((p) => !done.has(p));
  if (limit) files = files.slice(0, limit);
  const total = files.length;
  console.log(`[scan] ${total} to parse (${done.size} already done)`);
  const t0 = Date.now();
  let n = 0, err = 0, buf = [];
  const flush = () => { if (buf.length) { fs.appendFileSync(RECORDS, buf.join("")); buf = []; } };
  for (const p of files) {
    const rec = probePath(p);
    if (rec.error) err++;
    buf.push(JSON.stringify(rec) + "\n");
    if (++n % 2000 === 0) {
      flush();
      const rate = n / ((Date.now() - t0) / 1000);
      console.log(`[scan] ${n}/${total}  err=${err}  ${rate.toFixed(0)}/s  eta ${Math.round((total - n) / rate)}s`);
    }
  }
  flush();
  console.log(`[scan] done: parsed ${n}, errors ${err}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// Normalize a family name for grouping: fold trademark marks and punctuation so
// "Helvetica", "Helvetica™" and "Helvetica®" become one family.
function groupKey(name) {
  return (name || "")
    .replace(/[™®©]/g, "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ").trim().toLowerCase();
}

// Preserve per-family enrichment (e.g. hasCyrillic) that lives only in an
// existing catalog.json, keyed by slug, when regenerating.
function loadPrevBySlug() {
  const m = new Map();
  try {
    const prev = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
    for (const f of prev.families || []) m.set(f.slug, f);
  } catch { /* no previous catalog */ }
  return m;
}

const FONT_EXT_L = new Set([".ttf", ".otf", ".woff2"]); // extensions we hardlink/serve

function organize() {
  const recs = [];
  let collections = 0;
  for (const line of fs.readFileSync(RECORDS, "utf8").split("\n")) {
    if (!line) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.error) continue;
    if (r.collection) { collections++; continue; } // .ttc/.otc can't be split/converted here
    recs.push(r);
  }
  const fams = new Map();
  for (const r of recs) {
    const key = groupKey(r.family);
    if (!key) continue;
    (fams.get(key) || fams.set(key, []).get(key)).push(r);
  }
  fs.mkdirSync(LIB, { recursive: true });
  const prevBySlug = loadPrevBySlug();
  const usedSlugs = new Set();
  const catalog = [];
  let linked = 0, copied = 0, skipped = 0, failed = 0;
  for (const [, items] of fams) {
    const display = safeFolder(items.reduce((a, b) => ((b.family || "").length > (a || "").length ? b.family : a), ""));
    // Guarantee a unique slug so distinct families never collide in the DB / on disk.
    let slug = slugify(display);
    if (usedSlugs.has(slug)) slug = `${slug}-${shortHash(display)}`;
    while (usedSlugs.has(slug)) slug = `${slug}-${shortHash(slug + "x")}`;
    usedSlugs.add(slug);
    const comp = compact(display) || slug;
    const folder = path.join(LIB, display);
    fs.mkdirSync(folder, { recursive: true });
    // Existing FONT basenames only (ignore stray .txt/.md so a readme can't shadow a font).
    const existing = new Set();
    for (const fn of fs.readdirSync(folder)) {
      if (FONT_EXT_L.has(path.extname(fn).toLowerCase())) existing.add(path.basename(fn, path.extname(fn)).toLowerCase());
    }
    items.sort((a, b) => (a.italic - b.italic) || (a.weight - b.weight) || a.ext.localeCompare(b.ext));
    const seen = new Map(); // styleSlug -> chosen record (prefer otf)
    for (const r of items) {
      const ss = styleSlug(r.weight, r.italic, r.width);
      const prev = seen.get(ss);
      if (prev && !(r.ext === "otf" && prev.ext === "ttf")) { skipped++; continue; }
      seen.set(ss, r);
    }
    const styles = [];
    for (const [ss, r] of seen) {
      const base = `${comp}-${ss}`;
      const file = `${base}.${r.ext}`;
      const dst = path.join(folder, file);
      if (existing.has(base.toLowerCase())) {
        const found = fs.readdirSync(folder).find((fn) =>
          FONT_EXT_L.has(path.extname(fn).toLowerCase()) &&
          path.basename(fn, path.extname(fn)).toLowerCase() === base.toLowerCase());
        if (found) {
          const st = fs.statSync(path.join(folder, found));
          styles.push({ style: ss, subfamily: r.subfamily, weight: r.weight, italic: r.italic,
            ext: path.extname(found).slice(1), size: st.size, file: found });
          continue;
        }
      }
      try { fs.linkSync(r.path, dst); linked++; }
      catch {
        try { fs.copyFileSync(r.path, dst); copied++; }
        catch (e) { failed++; console.warn(`[organize] link+copy failed: ${r.path} -> ${dst}: ${e.message}`); continue; }
      }
      existing.add(base.toLowerCase());
      styles.push({ style: ss, subfamily: r.subfamily, weight: r.weight, italic: r.italic,
        ext: r.ext, size: r.size, file });
    }
    styles.sort((a, b) => (a.italic - b.italic) || (a.weight - b.weight));
    if (!styles.length) continue;
    const sample = items[0];
    catalog.push({
      slug, family: display, folder: display,
      styleCount: styles.length,
      hasItalic: styles.some((s) => s.italic),
      weights: [...new Set(styles.map((s) => s.weight))].sort((a, b) => a - b),
      category: sample.category,
      designer: items.find((i) => i.designer)?.designer || null,
      manufacturer: items.find((i) => i.manufacturer)?.manufacturer || null,
      designerUrl: items.find((i) => i.designerUrl)?.designerUrl || null,
      copyright: sample.copyright || null,
      license: sample.license || null,
      licenseUrl: sample.licenseUrl || null,
      licenseClass: sample.licenseClass,
      version: sample.version || null,
      hasLatin: items.some((i) => i.hasLatin),
      hasCyrillic: prevBySlug.get(slug)?.hasCyrillic ?? false, // carry forward enrichment
      glyphs: Math.max(0, ...items.map((i) => i.glyphs || 0)),
      styles,
    });
  }
  catalog.sort((a, b) => a.family.toLowerCase().localeCompare(b.family.toLowerCase()));
  writeCatalog({ count: catalog.length, generatedAt: new Date().toISOString(), families: catalog });
  const multi = catalog.filter((c) => c.styleCount > 1).length;
  const latin = catalog.filter((c) => c.hasLatin).length;
  console.log(`[organize] families=${catalog.length} linked=${linked} copied=${copied} skipped=${skipped} failed=${failed} collections-skipped=${collections}`);
  console.log(`[organize] multi-style=${multi} latin-capable=${latin}`);
}

// Atomic catalog write (temp + rename) so a crash can't truncate the file.
function writeCatalog(obj) {
  const tmp = `${CATALOG}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1));
  fs.renameSync(tmp, CATALOG);
}

async function web(limit) {
  const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  let fams = cat.families;
  if (limit) fams = fams.slice(0, limit);
  fs.mkdirSync(PUBFONTS, { recursive: true });
  let made = 0, skip = 0, fail = 0, processed = 0;
  const t0 = Date.now();
  for (const fam of fams) {
    const outDir = path.join(PUBFONTS, fam.slug);
    fs.mkdirSync(outDir, { recursive: true });
    for (const st of fam.styles) {
      processed++;
      const outFile = path.join(outDir, `${st.style}.woff2`);
      // Only skip a cache hit that is a real (non-truncated) WOFF2 file.
      try {
        const fd = fs.readFileSync(outFile);
        if (fd.length >= 4 && fd.subarray(0, 4).toString("ascii") === "wOF2") { skip++; continue; }
      } catch { /* missing → generate */ }
      const srcFile = path.join(LIB, fam.folder, st.file);
      try {
        const buf = fs.readFileSync(srcFile);
        const w = await wawoff2.compress(buf);
        // Atomic write so a killed process can't leave a truncated .woff2 behind.
        const tmp = `${outFile}.tmp`;
        fs.writeFileSync(tmp, w);
        fs.renameSync(tmp, outFile);
        made++;
      } catch (e) { fail++; console.warn(`[web] fail ${fam.slug}/${st.style}: ${e.message}`); }
      if (processed % 500 === 0) console.log(`[web] processed=${processed} made=${made} skip=${skip} fail=${fail}`);
    }
  }
  console.log(`[web] done made=${made} skip=${skip} fail=${fail} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

/**
 * Rebuild the catalog from the ACTUAL font/ library (source of truth), treating each
 * folder as one family. Deletes families with fewer than `min` distinct cuts (styles) —
 * those are considered too thin to be worth a page. Hardlink removal does not touch the
 * original files in "Jama fonts".
 */
function rebuildFromLib(min = 3) {
  const dirs = fs.readdirSync(LIB, { withFileTypes: true }).filter((d) => d.isDirectory());
  const prevBySlug = loadPrevBySlug();
  const usedSlugs = new Set();
  const catalog = [];
  let removed = 0, kept = 0, removedLinks = 0;
  // Remove only the font files (keep user-authored specimens/licenses/notes), then
  // drop the folder if it ends up empty.
  const del = (folder, fontFiles, slug) => {
    for (const fn of fontFiles) { try { fs.rmSync(path.join(folder, fn), { force: true }); removedLinks++; } catch {} }
    try { if (fs.readdirSync(folder).length === 0) fs.rmdirSync(folder); } catch {}
    const pub = path.join(PUBFONTS, slug);
    if (fs.existsSync(pub)) { try { fs.rmSync(pub, { recursive: true, force: true }); } catch {} }
    removed++;
  };
  for (const d of dirs) {
    const folder = path.join(LIB, d.name);
    let files;
    try { files = fs.readdirSync(folder).filter((fn) => FONT_EXT.has(path.extname(fn).toLowerCase())); }
    catch { continue; }
    let slug = slugify(d.name);
    if (usedSlugs.has(slug)) slug = `${slug}-${shortHash(d.name)}`;
    // Delete only on RAW file count — never on parse failures (a fontkit quirk
    // must not escalate to deleting real fonts).
    if (files.length < min) { del(folder, files, slug); continue; }
    const items = [];
    let probeErrors = 0;
    const byStyle = new Map(); // styleSlug -> style entry (prefer otf)
    for (const fn of files) {
      const rec = probePath(path.join(folder, fn));
      if (rec.error) { probeErrors++; continue; }
      if (rec.collection) continue;
      items.push(rec);
      const ss = styleSlug(rec.weight, rec.italic, rec.width);
      const prev = byStyle.get(ss);
      const entry = { style: ss, subfamily: rec.subfamily, weight: rec.weight, italic: rec.italic, ext: rec.ext, size: rec.size, file: fn };
      if (!prev || (rec.ext === "otf" && prev.ext === "ttf")) byStyle.set(ss, entry);
    }
    const styles = [...byStyle.values()].sort((a, b) => (a.italic - b.italic) || (a.weight - b.weight));
    if (!styles.length) {
      console.warn(`[rebuild] ${d.name}: ${files.length} files but 0 parseable — keeping folder, skipping catalog.`);
      continue;
    }
    if (probeErrors) console.warn(`[rebuild] ${d.name}: ${probeErrors} file(s) unparseable, kept from the rest.`);
    usedSlugs.add(slug);
    const sample = items[0];
    catalog.push({
      slug, family: d.name, folder: d.name,
      styleCount: styles.length,
      hasItalic: styles.some((s) => s.italic),
      weights: [...new Set(styles.map((s) => s.weight))].sort((a, b) => a - b),
      category: sample.category,
      designer: items.find((i) => i.designer)?.designer || null,
      manufacturer: items.find((i) => i.manufacturer)?.manufacturer || null,
      designerUrl: items.find((i) => i.designerUrl)?.designerUrl || null,
      copyright: sample.copyright || null,
      license: sample.license || null,
      licenseUrl: sample.licenseUrl || null,
      licenseClass: sample.licenseClass,
      version: sample.version || null,
      hasLatin: items.some((i) => i.hasLatin),
      hasCyrillic: prevBySlug.get(slug)?.hasCyrillic ?? false,
      glyphs: Math.max(0, ...items.map((i) => i.glyphs || 0)),
      styles,
    });
    kept++;
  }
  catalog.sort((a, b) => a.family.toLowerCase().localeCompare(b.family.toLowerCase()));
  writeCatalog({ count: catalog.length, minCuts: min, generatedAt: new Date().toISOString(), families: catalog });
  console.log(`[rebuild] kept=${kept} removed=${removed} (min ${min} cuts), removed font files=${removedLinks}`);
  const cats = {}; for (const c of catalog) cats[c.category] = (cats[c.category] || 0) + 1;
  console.log(`[rebuild] categories:`, cats);
}

function stats() {
  const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const fams = cat.families;
  const byLic = {}, byCat = {};
  for (const c of fams) { byLic[c.licenseClass] = (byLic[c.licenseClass] || 0) + 1; byCat[c.category] = (byCat[c.category] || 0) + 1; }
  console.log("families:", cat.count);
  console.log("multi-style:", fams.filter((c) => c.styleCount > 1).length);
  console.log("license classes:", byLic);
  console.log("categories:", byCat);
  console.log("top by styleCount:");
  for (const c of [...fams].sort((a, b) => b.styleCount - a.styleCount).slice(0, 15))
    console.log(`   ${String(c.styleCount).padStart(3)}  ${c.family}`);
}

// ---------- cli ----------
const USAGE = "usage: node scripts/ingest.mjs <scan|organize|web|stats|all|rebuild> [--limit N] [--min N]";
function intArg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  const n = parseInt(process.argv[i + 1], 10);
  if (!Number.isInteger(n)) { console.error(`${flag} requires an integer value`); process.exit(1); }
  return n;
}
const mode = process.argv[2];
const limit = intArg("--limit");
if (mode === "scan" || mode === "all") scan(limit);
if (mode === "organize" || mode === "all") organize();
if (mode === "web") await web(limit);
if (mode === "rebuild") rebuildFromLib(intArg("--min") ?? 3);
if (mode === "stats") stats();
if (!["scan", "organize", "web", "stats", "all", "rebuild"].includes(mode)) {
  console.log(USAGE);
}
