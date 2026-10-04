"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import crypto from "node:crypto";
import path from "node:path";
import * as wawoff2 from "wawoff2";
import { db } from "@/lib/db";
import { getSession, verifyCredentials, createSession, destroySession } from "@/lib/auth";
import { parseFontBuffer, slugify, safeFolder, shortHash, styleSlug as mkStyleSlug } from "@/lib/fontmeta";
import { putUpload, deleteUpload, writeFont, writeWebfont } from "@/lib/storage";
import { DEFAULT_SETTINGS, saveSiteSettings } from "@/lib/settings";
import { sniffImageFamily, EXT_FAMILY } from "@/lib/imagesniff";
import { LICENSE_CLASSES } from "@/lib/license";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FONT_BYTES = 20 * 1024 * 1024; // 20 MB per file

async function assertAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function bool(fd: FormData, k: string): boolean {
  const v = fd.get(k);
  return v === "on" || v === "true" || v === "1";
}

/* ---------------- auth (DB-backed throttling) ---------------- */
// Persisted in the LoginAttempt table rather than an in-memory Map: this app
// deploys to Vercel serverless, where a module-level Map does not survive
// across separate function instances, so an in-memory lockout is unreliable.
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;

async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export async function loginAction(fd: FormData) {
  const key = await clientKey();
  const now = new Date();
  const a = await db.loginAttempt.findUnique({ where: { key } });
  if (a?.lockedUntil && a.lockedUntil > now) redirect("/admin/login?error=locked");

  const username = str(fd, "username");
  const password = str(fd, "password");
  if (await verifyCredentials(username, password)) {
    if (a) await db.loginAttempt.delete({ where: { key } }).catch(() => {});
    await createSession(username);
    redirect("/admin");
  }
  // record failure + small delay to blunt brute force
  const stale = !!(a?.lockedUntil && a.lockedUntil <= now);
  const count = (stale || !a ? 0 : a.count) + 1;
  const lockedUntil = count >= MAX_FAILS ? new Date(now.getTime() + LOCK_MS) : null;
  await db.loginAttempt.upsert({
    where: { key },
    update: { count: lockedUntil ? 0 : count, lockedUntil },
    create: { key, count: lockedUntil ? 0 : count, lockedUntil },
  });
  await new Promise((r) => setTimeout(r, 400));
  redirect("/admin/login?error=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------------- articles ---------------- */
export async function saveArticleAction(fd: FormData) {
  await assertAdmin();
  const id = Number(fd.get("id")) || 0;
  const title = str(fd, "title");
  if (!title) redirect(id ? `/admin/articles/${id}?error=title` : "/admin/articles/new?error=title");
  let slug = slugify(str(fd, "slug") || title);
  const published = bool(fd, "isPublished");
  const data = {
    title, slug, type: str(fd, "type") || "blog",
    excerpt: str(fd, "excerpt") || null,
    body: str(fd, "body"),
    coverImage: str(fd, "coverImage") || null,
    author: str(fd, "author") || "Feekr",
    tags: str(fd, "tags"),
    isPublished: published,
    publishedAt: published ? new Date() : null,
  };
  if (id) {
    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) redirect("/admin/articles?error=missing");
    // Preserve the original publish date across edits and unpublish/republish.
    data.publishedAt = published ? (existing.publishedAt ?? new Date()) : existing.publishedAt;
    // Avoid a P2002 crash if the (new) slug collides with a different article.
    const clash = await db.article.findUnique({ where: { slug } });
    if (clash && clash.id !== id) { slug = `${slug}-${shortHash(String(id))}`; data.slug = slug; }
    await db.article.update({ where: { id }, data });
  } else {
    if (await db.article.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    await db.article.create({ data: { ...data, slug } });
  }
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
  revalidatePath("/admin/articles");
  redirect("/admin/articles");
}

export async function deleteArticleAction(fd: FormData) {
  await assertAdmin();
  const id = Number(fd.get("id"));
  if (Number.isInteger(id) && id > 0) {
    try { await db.article.delete({ where: { id } }); } catch { /* already gone */ }
  }
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/admin/articles");
}

/* ---------------- media ---------------- */
export async function uploadMediaAction(fd: FormData) {
  await assertAdmin();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  // Validate (and read) every file BEFORE writing any of them. Previously each
  // file was checked-then-written one at a time, so a bad file later in the
  // batch would abort with a single error while earlier, valid files had
  // already been silently saved — the admin had no way to tell.
  const prepared: { buf: Buffer; ext: string; mime: string; name: string; base: string }[] = [];
  for (const file of files) {
    const ext = (path.extname(file.name) || "").toLowerCase();
    if (!IMAGE_EXT.has(ext)) redirect("/admin/media?error=type");
    if (!file.type.startsWith("image/")) redirect("/admin/media?error=type");
    if (file.size > MAX_IMAGE_BYTES) redirect("/admin/media?error=size");
    const buf = Buffer.from(await file.arrayBuffer());
    // Don't trust the extension/MIME alone — confirm the bytes are really that format.
    if (sniffImageFamily(buf) !== EXT_FAMILY[ext]) redirect("/admin/media?error=content");
    const base = slugify(path.basename(file.name, path.extname(file.name))) || "image";
    const name = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
    prepared.push({ buf, ext, mime: file.type, name, base });
  }

  for (const p of prepared) {
    const url = await putUpload(p.name, p.buf, p.mime || "application/octet-stream");
    await db.media.create({
      data: { filename: p.name, url, mime: p.mime || null, size: p.buf.length, alt: p.base },
    });
  }
  revalidatePath("/admin/media");
  redirect("/admin/media");
}

export async function deleteMediaAction(fd: FormData) {
  await assertAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const m = await db.media.findUnique({ where: { id } });
  if (m) {
    await deleteUpload(m.filename);
    await db.media.delete({ where: { id } });
  }
  revalidatePath("/admin/media");
}

/* ---------------- orders ---------------- */
const ORDER_STATUSES = new Set(["new", "contacted", "done"]);

export async function setOrderStatusAction(fd: FormData) {
  await assertAdmin();
  const id = Number(fd.get("id"));
  const status = str(fd, "status");
  if (!Number.isInteger(id) || id <= 0 || !ORDER_STATUSES.has(status)) return;
  await db.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
}

export async function deleteOrderAction(fd: FormData) {
  await assertAdmin();
  const id = Number(fd.get("id"));
  if (Number.isInteger(id) && id > 0) {
    try { await db.order.delete({ where: { id } }); } catch { /* already gone */ }
  }
  revalidatePath("/admin/orders");
}

/* ---------------- site settings (footer socials + contact) ---------------- */
export async function saveSettingsAction(fd: FormData) {
  await assertAdmin();
  const socials = DEFAULT_SETTINGS.socials.map((d) => ({
    key: d.key,
    label: d.label,
    url: str(fd, `${d.key}_url`),
    enabled: bool(fd, `${d.key}_on`),
  }));
  await saveSiteSettings({
    socials,
    contactEmail: str(fd, "contactEmail") || DEFAULT_SETTINGS.contactEmail,
    contactTelegram: str(fd, "contactTelegram") || DEFAULT_SETTINGS.contactTelegram,
  });
  revalidatePath("/", "layout"); // footer is in the shared layout
  revalidatePath("/support");
  redirect("/admin/settings?saved=1");
}

/* ---------------- family metadata edit ---------------- */
export async function saveFamilyAction(fd: FormData) {
  await assertAdmin();
  const slug = str(fd, "slug");
  // Every font is free; whether it may be shown depends on its licence class.
  const licenseClass = str(fd, "licenseClass");
  if (!(LICENSE_CLASSES as readonly string[]).includes(licenseClass)) redirect(`/admin/fonts/${slug}?error=license`);
  await db.family.update({
    where: { slug },
    data: {
      category: str(fd, "category") || "Display",
      tagline: str(fd, "tagline") || null,
      description: str(fd, "description") || null,
      history: str(fd, "history") || null,
      usage: str(fd, "usage") || null,
      designer: str(fd, "designer") || null,
      licenseClass,
      tier: "free",
      isFree: true,
      priceCents: 0,
      isPublished: bool(fd, "isPublished"),
      isFeatured: bool(fd, "isFeatured"),
      isNew: bool(fd, "isNew"),
    },
  });
  revalidatePath(`/fonts/${slug}`);
  revalidatePath("/fonts");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/admin/fonts");
  redirect(`/admin/fonts/${slug}?saved=1`);
}

/* ---------------- font family upload ---------------- */
export async function uploadFontFamilyAction(fd: FormData) {
  await assertAdmin();
  const rawName = str(fd, "familyName");
  if (!rawName) redirect("/admin/fonts/upload?error=name");
  const familyName = safeFolder(rawName);
  const category = str(fd, "category") || "Sans";
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) redirect("/admin/fonts/upload?error=files");

  let slug = slugify(familyName);

  // Guard against hijacking a different, existing family via a slug collision.
  const existingFam = await db.family.findUnique({ where: { slug } });
  if (existingFam && existingFam.folder !== familyName) {
    slug = `${slug}-${shortHash(familyName)}`;
  }

  const byStyle = new Map<string, { style: string; subfamily: string; weight: number; italic: boolean; ext: string; file: string; size: number }>();
  let meta: ReturnType<typeof parseFontBuffer> | null = null;

  for (const file of files) {
    if (file.size > MAX_FONT_BYTES) continue;
    const ext = (path.extname(file.name).replace(".", "") || "ttf").toLowerCase();
    if (!["ttf", "otf", "woff2"].includes(ext)) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    let parsed: ReturnType<typeof parseFontBuffer>;
    try { parsed = parseFontBuffer(buf); } catch { continue; }
    if (!meta) meta = parsed;
    const ss = parsed.styleSlug || mkStyleSlug(parsed.weight, parsed.italic);
    const outName = `${familyName.replace(/[^A-Za-z0-9]/g, "")}-${ss}.${ext}`;
    // Source font + generated webfont go to storage (Supabase in prod, disk in dev).
    await writeFont(familyName, outName, buf);
    try {
      const w = ext === "woff2" ? buf : Buffer.from(await wawoff2.compress(buf));
      await writeWebfont(slug, ss, w);
    } catch { /* web font best-effort */ }
    const prev = byStyle.get(ss);
    if (!prev || (ext === "otf" && prev.ext === "ttf")) {
      byStyle.set(ss, { style: ss, subfamily: parsed.subfamily, weight: parsed.weight, italic: parsed.italic, ext, file: outName, size: buf.length });
    }
  }

  const styles = [...byStyle.values()].sort((a, b) => Number(a.italic) - Number(b.italic) || a.weight - b.weight);
  if (!styles.length || !meta) redirect("/admin/fonts/upload?error=parse");

  const technical = {
    name: familyName, folder: familyName, styleCount: styles.length,
    hasItalic: styles.some((s) => s.italic),
    glyphs: meta.glyphs, hasLatin: meta.hasLatin, version: meta.version,
  };

  const fam = await db.family.upsert({
    where: { slug },
    // On update only refresh file-derived technical fields; keep admin-curated
    // designer/category/copyright/licenseClass untouched.
    update: technical,
    create: {
      slug, ...technical, category,
      designer: meta.designer, manufacturer: meta.manufacturer,
      copyright: meta.copyright, licenseClass: meta.licenseClass,
      tier: "free", isFree: true, priceCents: 0, popularity: styles.length,
    },
  });
  // Replace styles atomically so a failure can't leave the family with zero cuts.
  await db.$transaction([
    db.style.deleteMany({ where: { familyId: fam.id } }),
    db.style.createMany({ data: styles.map((s) => ({ familyId: fam.id, ...s })) }),
  ]);

  revalidatePath("/fonts");
  revalidatePath(`/fonts/${slug}`);
  revalidatePath("/about");
  revalidatePath("/admin/fonts");
  redirect(`/admin/fonts/${slug}?uploaded=1`);
}
