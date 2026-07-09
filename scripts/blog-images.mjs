import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(url.fileURLToPath(new URL("..", import.meta.url)));
const UP = path.join(ROOT, "public", "uploads");
fs.mkdirSync(UP, { recursive: true });
const db = new PrismaClient();

// Free image sources: LoremFlickr with a Picsum fallback (both free, no key).
const posts = [
  { slug: "feekrga-xush-kelibsiz", kw: "typography,studio", seed: "feekr-welcome" },
  { slug: "shrift-tanlash-boyicha-qollanma", kw: "lettering,type", seed: "feekr-guide" },
  { slug: "yangi-shriftlar-2026", kw: "graphic-design,abstract", seed: "feekr-news" },
];

const EXT_BY_MIME = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
};

async function tryDownload(u) {
  try {
    const r = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = EXT_BY_MIME[ct];
    if (!ext) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 5000) return null;
    return { buf, ext, mime: ct };
  } catch { return null; }
}

async function main() {
  for (const p of posts) {
    try {
      const candidates = [
        `https://loremflickr.com/1200/675/${p.kw.split(",")[0]}`,
        `https://picsum.photos/seed/${p.seed}/1200/675`,
      ];
      let got = null, src = "";
      for (const u of candidates) { got = await tryDownload(u); if (got) { src = u; break; } }
      if (!got) { console.log("FAILED", p.slug); continue; }
      const name = `blog-${p.slug}.${got.ext}`;
      fs.writeFileSync(path.join(UP, name), got.buf);
      // updateMany returns count 0 instead of throwing when the article is absent.
      const res = await db.article.updateMany({ where: { slug: p.slug }, data: { coverImage: `/uploads/${name}` } });
      if (res.count === 0) console.log("SKIP (no article)", p.slug);
      try {
        await db.media.create({ data: { filename: name, url: `/uploads/${name}`, mime: got.mime, size: got.buf.length, alt: p.slug } });
      } catch { /* media row is optional */ }
      console.log("OK", p.slug, "<-", src.split("/")[2], `(${(got.buf.length / 1024) | 0}KB)`);
    } catch (e) {
      console.error("ERROR", p.slug, e.message);
    }
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exitCode = 1; });
