/**
 * Re-derive catalog metadata from the actual font files (QA findings FKR-05/11/30):
 *   - category: re-classify families still on the "Display" default using the
 *     font's own hints (post.isFixedPitch, OS/2 sFamilyClass, PANOSE) + name keywords
 *   - hasCyrillic: true only when the full Russian alphabet is present (cmap)
 *   - name: suggest the typographic family name (name ID 16/1) when the stored
 *     name looks like a squashed PostScript name ("LinotypeUnivers Extd")
 * It also reports Uzbek support (ʻ ʼ / Ўў Ққ Ғғ Ҳҳ) per family.
 *
 *   node scripts/refresh-meta.mjs                 # dry run → data/meta-report.csv
 *   node scripts/refresh-meta.mjs --apply         # write category + hasCyrillic
 *   node scripts/refresh-meta.mjs --apply --names # …and the suggested names too
 *
 * Reads fonts from ./font/<folder>/<file> (the local library) or, if a file is
 * missing locally and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, from the
 * "fonts" storage bucket. Needs DATABASE_URL (read from .env by Prisma).
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import * as fontkit from "fontkit";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(url.fileURLToPath(new URL("..", import.meta.url)));
const LIB = path.join(ROOT, "font");
const OUT = path.join(ROOT, "data", "meta-report.csv");
const APPLY = process.argv.includes("--apply");
const NAMES = process.argv.includes("--names");
const CONCURRENCY = 8;

const db = new PrismaClient();

let sb = null;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
if (SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = await import("@supabase/supabase-js");
  sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

async function readFont(folder, file) {
  const p = path.join(LIB, folder, file);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  if (!sb) return null;
  const { data, error } = await sb.storage.from("fonts").download(`${folder}/${file}`.replace(/\\/g, "/"));
  return error || !data ? null : Buffer.from(await data.arrayBuffer());
}

const RU = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const hasAll = (set, chars) => [...chars].every((c) => set.has(c.codePointAt(0)));

/** Returns [category|null, reason]. Only used for families still on "Display". */
function classify(f, name) {
  const n = name.toLowerCase();
  if (f.post?.isFixedPitch) return ["Monospace", "post.isFixedPitch"];
  if (/\b(mono|code|typewriter)\b/.test(n)) return ["Monospace", "name"];
  if (/\bslab\b|egyptian/.test(n)) return ["Slab", "name"];
  if (/script|hand(writ)?|brush|calligraph/.test(n)) return ["Script", "name"];
  if (/\bsans\b|grotesk|grotesque|gothic/.test(n)) return ["Sans", "name"];
  if (/\bserif\b|antiqua|garamond|bodoni|didot|caslon|baskerville|roman\b/.test(n)) return ["Serif", "name"];

  const cls = ((f["OS/2"]?.sFamilyClass ?? 0) >> 8) & 0xff;
  const byClass = { 1: "Serif", 2: "Serif", 3: "Serif", 4: "Slab", 5: "Slab", 7: "Serif", 8: "Sans", 10: "Script", 12: "Dingbat" };
  if (byClass[cls]) return [byClass[cls], `sFamilyClass ${cls}`];

  const p = f["OS/2"]?.panose;
  if (p && p.length >= 2) {
    if (p[0] === 2) {
      const serif = p[1];
      if (serif === 6) return ["Slab", "PANOSE square serif"];
      if (serif >= 11 && serif <= 15) return ["Sans", "PANOSE sans"];
      if (serif >= 2 && serif <= 10) return ["Serif", "PANOSE serif"];
    }
    if (p[0] === 3) return ["Script", "PANOSE hand-written"];
    if (p[0] === 5) return ["Dingbat", "PANOSE symbol"];
  }
  return [null, "no signal"];
}

/** "LinotypeUnivers Extd" / "ZineSerifDis" — glued words without spaces. */
const looksSquashed = (s) => /[a-z][A-Z]/.test(s);

function pickCut(styles) {
  const up = styles.filter((s) => !s.italic);
  const pool = up.length ? up : styles;
  return pool.slice().sort((a, b) => Math.abs(a.weight - 400) - Math.abs(b.weight - 400))[0];
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function main() {
  const families = await db.family.findMany({
    select: { id: true, slug: true, name: true, folder: true, category: true, hasCyrillic: true, licenseClass: true,
      styles: { select: { style: true, weight: true, italic: true, file: true } } },
    orderBy: { slug: "asc" },
  });
  console.log(`[meta] ${families.length} families · ${APPLY ? "APPLY" : "dry run"}${NAMES ? " + names" : ""}`);

  const rows = [];
  let i = 0, changedCat = 0, changedCyr = 0, changedName = 0, missing = 0;
  async function work(fam) {
    const cut = pickCut(fam.styles);
    const buf = cut ? await readFont(fam.folder, cut.file) : null;
    if (!buf) { missing++; rows.push({ fam, note: "file missing" }); return; }
    let font;
    try { font = fontkit.create(buf); } catch { rows.push({ fam, note: "unreadable" }); return; }

    const cps = new Set(font.characterSet);
    const hasCyrillic = hasAll(cps, RU);
    const uzLatin = hasAll(cps, "ʻʼ");
    const uzCyrillic = hasAll(cps, "ЎўҚқҒғҲҳ");
    const typoName = (font.getName?.("preferredFamily") || font.getName?.("fontFamily") || "").trim();
    const [suggested, reason] = fam.category === "Display" ? classify(font, `${fam.name} ${typoName}`) : [null, "kept (not Display)"];
    const nameSuggestion = looksSquashed(fam.name) && typoName && typoName !== fam.name && /\s/.test(typoName) ? typoName : "";

    const data = {};
    if (suggested && suggested !== fam.category) { data.category = suggested; changedCat++; }
    if (hasCyrillic !== fam.hasCyrillic) { data.hasCyrillic = hasCyrillic; changedCyr++; }
    if (NAMES && nameSuggestion) { data.name = nameSuggestion; changedName++; }
    if (APPLY && Object.keys(data).length) await db.family.update({ where: { id: fam.id }, data });

    rows.push({ fam, suggested, reason, hasCyrillic, uzLatin, uzCyrillic, nameSuggestion });
  }

  const queue = [...families];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      await work(queue.shift());
      if (++i % 200 === 0) console.log(`[meta] ${i}/${families.length}`);
    }
  }));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const header = ["slug", "name", "licenseClass", "category", "categorySuggested", "reason", "hasCyrillicOld", "hasCyrillicNew", "uzLatin_ʻʼ", "uzCyrillic_ЎҚҒҲ", "nameSuggestion", "note"];
  const lines = rows
    .sort((a, b) => a.fam.slug.localeCompare(b.fam.slug))
    .map((r) => [r.fam.slug, r.fam.name, r.fam.licenseClass, r.fam.category, r.suggested ?? "", r.reason ?? "",
      r.fam.hasCyrillic, r.hasCyrillic ?? "", r.uzLatin ?? "", r.uzCyrillic ?? "", r.nameSuggestion ?? "", r.note ?? ""].map(csvCell).join(","));
  fs.writeFileSync(OUT, "﻿" + [header.map(csvCell).join(","), ...lines].join("\n"));

  console.log(`[meta] category changes: ${changedCat} · hasCyrillic changes: ${changedCyr} · name changes: ${NAMES ? changedName : "(suggestions only)"} · missing files: ${missing}`);
  console.log(`[meta] report: ${path.relative(ROOT, OUT)}${APPLY ? "" : "  (dry run — nothing written; add --apply)"}`);
}

main().finally(() => db.$disconnect());
