import { PrismaClient } from "@prisma/client";
import * as fontkit from "fontkit";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(url.fileURLToPath(new URL("..", import.meta.url)));
const LIB = path.join(ROOT, "font");
const CATALOG = path.join(ROOT, "data", "catalog.json");
const db = new PrismaClient();

// Core Russian letters incl. Cyrillic-specific shapes (Б Д Ж Й Я) to avoid false positives.
const CYR = [0x0410, 0x0411, 0x0414, 0x0416, 0x0419, 0x042f, 0x0430, 0x0431, 0x0434, 0x044f];
const FONT_EXT = new Set([".ttf", ".otf", ".ttc", ".otc"]);

function hasCyr(file) {
  try {
    let f = fontkit.create(fs.readFileSync(file));
    if (f && f.fonts && Array.isArray(f.fonts)) f = f.fonts[0];
    return CYR.every((cp) => { try { return f.hasGlyphForCodePoint(cp); } catch { return false; } });
  } catch { return false; }
}

// A family counts as Cyrillic-capable if ANY of its cuts covers the codepoints
// (a single unrepresentative pick produced false negatives).
function familyHasCyr(folder) {
  let files;
  try { files = fs.readdirSync(folder).filter((fn) => FONT_EXT.has(path.extname(fn).toLowerCase())); }
  catch { return false; }
  // Check Regular-ish cuts first, then the rest, stopping at the first match.
  files.sort((a, b) => (/-Regular\.|regular/i.test(b) ? 1 : 0) - (/-Regular\.|regular/i.test(a) ? 1 : 0));
  for (const fn of files) if (hasCyr(path.join(folder, fn))) return true;
  return false;
}

async function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

(async () => {
  const cat = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  let yes = 0, n = 0;
  const trueSlugs = [];
  for (const fam of cat.families) {
    const ok = familyHasCyr(path.join(LIB, fam.folder));
    fam.hasCyrillic = ok;
    if (ok) { yes++; trueSlugs.push(fam.slug); }
    if (++n % 400 === 0) console.log(`${n}/${cat.families.length}`);
  }
  // Atomic catalog write (temp + rename) so a crash can't truncate it.
  const tmp = `${CATALOG}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cat, null, 1));
  fs.renameSync(tmp, CATALOG);

  // Reset + set in a single transaction so the live site never sees a half-updated state.
  const trueSet = new Set(trueSlugs);
  const falseSlugs = cat.families.map((f) => f.slug).filter((s) => !trueSet.has(s));
  const ops = [];
  for (const c of await chunk(trueSlugs, 400)) ops.push(db.family.updateMany({ where: { slug: { in: c } }, data: { hasCyrillic: true } }));
  for (const c of await chunk(falseSlugs, 400)) ops.push(db.family.updateMany({ where: { slug: { in: c } }, data: { hasCyrillic: false } }));
  if (ops.length) await db.$transaction(ops);

  console.log(`[cyrillic] capable: ${yes} of ${cat.families.length}`);
  await db.$disconnect();
})().catch(async (e) => { console.error(e); await db.$disconnect(); process.exitCode = 1; });
