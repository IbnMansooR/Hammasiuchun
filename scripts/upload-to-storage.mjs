/**
 * One-time migration: upload the local font library + media to Supabase Storage,
 * then repoint existing DB URLs (/uploads/*) at the Supabase public bucket.
 *
 *   Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 *   Run:  node scripts/upload-to-storage.mjs
 *
 * Resumable: already-uploaded files are recorded in .upload-progress.json and skipped.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(url.fileURLToPath(new URL("..", import.meta.url)));
const LIB = path.join(ROOT, "font");
const UPLOADS = path.join(ROOT, "public", "uploads");
const PROGRESS = path.join(ROOT, ".upload-progress.json");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first."); process.exit(1);
}
const sb = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const CONCURRENCY = 8;

const MIME = { ttf: "font/ttf", otf: "font/otf", woff2: "font/woff2",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif" };
const mimeOf = (f) => MIME[path.extname(f).slice(1).toLowerCase()] || "application/octet-stream";

const done = fs.existsSync(PROGRESS) ? new Set(JSON.parse(fs.readFileSync(PROGRESS, "utf8"))) : new Set();
const saveProgress = () => fs.writeFileSync(PROGRESS, JSON.stringify([...done]));

function* walk(dir, base = dir) {
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, base);
    else yield { abs: p, key: path.relative(base, p).replace(/\\/g, "/") };
  }
}

async function uploadAll(dirLabel, files, bucket) {
  let ok = 0, skip = 0, fail = 0, i = 0;
  const total = files.length;
  async function worker() {
    while (i < total) {
      const { abs, key } = files[i++];
      const tag = `${bucket}/${key}`;
      if (done.has(tag)) { skip++; continue; }
      try {
        const buf = fs.readFileSync(abs);
        const { error } = await sb.storage.from(bucket).upload(key, buf, { contentType: mimeOf(key), upsert: true });
        if (error) throw error;
        done.add(tag); ok++;
        if (ok % 200 === 0) { saveProgress(); console.log(`[${dirLabel}] ${ok + skip}/${total} (ok=${ok} skip=${skip} fail=${fail})`); }
      } catch (e) { fail++; console.warn(`[${dirLabel}] FAIL ${key}: ${e.message || e}`); }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  saveProgress();
  console.log(`[${dirLabel}] done: ok=${ok} skip=${skip} fail=${fail}`);
}

async function main() {
  console.log("Uploading font library → 'fonts' bucket…");
  await uploadAll("fonts", [...walk(LIB)].filter((f) => /\.(ttf|otf|woff2)$/i.test(f.key)), "fonts");

  console.log("Uploading media → 'uploads' bucket…");
  const mediaFiles = fs.existsSync(UPLOADS) ? [...walk(UPLOADS)] : [];
  await uploadAll("uploads", mediaFiles, "uploads");

  // Repoint existing /uploads/* URLs at the public Supabase bucket.
  const base = `${SUPABASE_URL}/storage/v1/object/public/uploads/`;
  const db = new PrismaClient();
  try {
    const media = await db.media.findMany({ where: { url: { startsWith: "/uploads/" } } });
    for (const m of media) {
      await db.media.update({ where: { id: m.id }, data: { url: base + m.filename } });
    }
    const arts = await db.article.findMany({ where: { coverImage: { startsWith: "/uploads/" } } });
    for (const a of arts) {
      await db.article.update({ where: { id: a.id }, data: { coverImage: base + a.coverImage.replace("/uploads/", "") } });
    }
    console.log(`[db] repointed ${media.length} media + ${arts.length} article covers to Supabase`);
  } finally {
    await db.$disconnect();
  }
  console.log("All done.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
