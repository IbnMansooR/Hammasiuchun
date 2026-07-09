// Storage abstraction: uses Supabase Storage in production (Vercel, read-only
// FS) and the local filesystem in development. Switched purely by env — if both
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, Supabase is used.
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const LIB = path.join(ROOT, "font");
const CACHE = path.join(ROOT, ".cache", "webfonts");
const UPLOADS = path.join(ROOT, "public", "uploads");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const usingSupabase = !!(SUPABASE_URL && SERVICE_KEY);

const BUCKET_FONTS = "fonts";
const BUCKET_WEBFONTS = "webfonts";
const BUCKET_UPLOADS = "uploads";

let _client: SupabaseClient | null = null;
async function client(): Promise<SupabaseClient> {
  if (_client) return _client;
  const { createClient } = await import("@supabase/supabase-js");
  _client = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } });
  return _client;
}

function within(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}
// Keep object keys simple/safe (no traversal, forward slashes).
const key = (...parts: string[]) =>
  parts.map((p) => p.replace(/\\/g, "/").replace(/\.\.+/g, "").replace(/^\/+|\/+$/g, "")).join("/");

async function dl(bucket: string, objectKey: string): Promise<Buffer | null> {
  const c = await client();
  const { data, error } = await c.storage.from(bucket).download(objectKey);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
async function up(bucket: string, objectKey: string, buf: Buffer, contentType: string): Promise<void> {
  const c = await client();
  await c.storage.from(bucket).upload(objectKey, buf, { contentType, upsert: true });
}

/** Read a source font file (TTF/OTF/WOFF2). Returns null if missing. */
export async function readFont(folder: string, file: string): Promise<Buffer | null> {
  if (usingSupabase) return dl(BUCKET_FONTS, key(folder, file));
  const p = path.join(LIB, folder, file);
  if (!within(LIB, p) || !fsSync.existsSync(p)) return null;
  return fs.readFile(p);
}

export async function writeFont(folder: string, file: string, buf: Buffer): Promise<void> {
  if (usingSupabase) return up(BUCKET_FONTS, key(folder, file), buf, "font/otf");
  const dir = path.join(LIB, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, file), buf);
}

/** Read a cached WOFF2 (validated by caller). Returns null on miss. */
export async function readWebfont(slug: string, style: string): Promise<Buffer | null> {
  if (usingSupabase) return dl(BUCKET_WEBFONTS, key(slug, `${style}.woff2`));
  const p = path.join(CACHE, slug, `${style}.woff2`);
  if (!within(CACHE, p) || !fsSync.existsSync(p)) return null;
  return fs.readFile(p);
}

export async function writeWebfont(slug: string, style: string, buf: Buffer): Promise<void> {
  if (usingSupabase) { await up(BUCKET_WEBFONTS, key(slug, `${style}.woff2`), buf, "font/woff2"); return; }
  const dir = path.join(CACHE, slug);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `${style}.woff2.${process.pid}.${Date.now().toString(36)}.tmp`);
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, path.join(dir, `${style}.woff2`)); // atomic locally
}

/** Store an uploaded image; returns the URL to persist in Media.url. */
export async function putUpload(name: string, buf: Buffer, contentType: string): Promise<string> {
  if (usingSupabase) {
    await up(BUCKET_UPLOADS, key(name), buf, contentType);
    const c = await client();
    return c.storage.from(BUCKET_UPLOADS).getPublicUrl(key(name)).data.publicUrl;
  }
  await fs.mkdir(UPLOADS, { recursive: true });
  const dest = path.join(UPLOADS, name);
  if (!within(UPLOADS, dest)) throw new Error("bad upload name");
  await fs.writeFile(dest, buf);
  return `/uploads/${name}`;
}

export async function deleteUpload(name: string): Promise<void> {
  if (usingSupabase) { const c = await client(); await c.storage.from(BUCKET_UPLOADS).remove([key(name)]); return; }
  const p = path.join(UPLOADS, name);
  if (within(UPLOADS, p)) { try { await fs.unlink(p); } catch { /* ignore */ } }
}
