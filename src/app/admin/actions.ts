"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import path from "node:path";
import * as wawoff2 from "wawoff2";
import { db } from "@/lib/db";
import { getSession, verifyCredentials, createSession, destroySession } from "@/lib/auth";
import { parseFontBuffer, slugify, safeFolder, shortHash, styleSlug as mkStyleSlug } from "@/lib/fontmeta";
import { putUpload, deleteUpload, writeFont, writeWebfont } from "@/lib/storage";
import { DEFAULT_SETTINGS, SETTINGS_TAG, getSiteSettings, saveSiteSettings } from "@/lib/settings";
import { cleanVerification } from "@/lib/seo";
import { sniffImageFamily, EXT_FAMILY } from "@/lib/imagesniff";
import { LICENSE_CLASSES } from "@/lib/license";
import { CATALOG_TAG } from "@/lib/stats";
import { esc } from "@/lib/telegram";
import {
  CODE_TTL_S, MAX_CODE_TRIES, TWOFA_COOKIE, alertAdmins, codeHash, newCode, sameHash, sendCode, signPending,
  twoFactorChats, verifyPending, weakPasswordReason, whereLine,
} from "@/lib/adminSecurity";

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

/* ---------------- auth (DB-backed throttling + Telegram second step) ---------------- */
// Persisted in the LoginAttempt table rather than an in-memory Map: this app
// deploys to Vercel serverless, where a module-level Map does not survive
// across separate function instances, so an in-memory lockout is unreliable.
const MAX_FAILS = 8; // per IP
const LOCK_MS = 15 * 60 * 1000;
// Per username too, so many addresses can't share the guessing. Wider limit: a lockout here
// also stops the owner, but the second step (Telegram code) already blocks a stolen password.
const MAX_USER_FAILS = 20;
const USER_LOCK_MS = 60 * 60 * 1000;

async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Count a failure; true when this one locked the key. */
async function countFailure(key: string, max: number, lockMs: number): Promise<boolean> {
  const now = new Date();
  const a = await db.loginAttempt.findUnique({ where: { key } });
  const stale = !!(a?.lockedUntil && a.lockedUntil <= now);
  const count = (stale || !a ? 0 : a.count) + 1;
  const lockedUntil = count >= max ? new Date(now.getTime() + lockMs) : null;
  await db.loginAttempt.upsert({
    where: { key },
    update: { count: lockedUntil ? 0 : count, lockedUntil },
    create: { key, count: lockedUntil ? 0 : count, lockedUntil },
  });
  return !!lockedUntil;
}

const locked = async (key: string) => {
  const a = await db.loginAttempt.findUnique({ where: { key } });
  return !!(a?.lockedUntil && a.lockedUntil > new Date());
};

async function setPendingCookie(token: string | null) {
  const store = await cookies();
  if (!token) { store.delete({ name: TWOFA_COOKIE, path: "/admin" }); return; }
  store.set(TWOFA_COOKIE, token, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/admin", maxAge: CODE_TTL_S,
  });
}

async function signedIn(username: string, passwordHash: string, how: string) {
  await createSession(username, passwordHash);
  const where = await whereLine();
  after(() => alertAdmins(`✅ Admin panelga kirildi (${how}).\n${where}\n\nSiz boʻlmasangiz, darhol parolni almashtiring: Admin → Sozlamalar → Xavfsizlik.`).catch(() => {}));
}

export async function loginAction(fd: FormData) {
  const ipKey = await clientKey();
  if (await locked(ipKey)) redirect("/admin/login?error=locked");

  const username = str(fd, "username").slice(0, 100);
  const password = str(fd, "password").slice(0, 200);
  const userKey = `alogin-u:${username.toLowerCase()}`;
  if (username && (await locked(userKey))) redirect("/admin/login?error=locked");

  const admin = await verifyCredentials(username, password);
  if (admin) {
    await db.loginAttempt.deleteMany({ where: { key: { in: [ipKey, userKey] } } }).catch(() => {});
    const chats = await twoFactorChats();
    if (!chats.length) {
      await signedIn(admin.username, admin.passwordHash, "faqat parol bilan");
      redirect("/admin");
    }
    // Second step: a one-time code in the admin's Telegram.
    const { code, jti } = newCode();
    if (!(await sendCode(chats, code))) redirect("/admin/login?error=tgsend");
    await setPendingCookie(await signPending({ u: admin.username, h: codeHash(jti, code), jti }));
    redirect("/admin/login?step=code");
  }

  // record failure + small delay to blunt brute force
  const ipLocked = await countFailure(ipKey, MAX_FAILS, LOCK_MS);
  const userLocked = username ? await countFailure(userKey, MAX_USER_FAILS, USER_LOCK_MS) : false;
  if (ipLocked || userLocked) {
    const where = await whereLine();
    const what = userLocked
      ? `“${esc(username)}” loginiga ${MAX_USER_FAILS} marta notoʻgʻri parol kiritildi. Bu login 1 soatga yopildi.`
      : `Bitta manzildan ${MAX_FAILS} marta notoʻgʻri parol kiritildi. Bu manzil 15 daqiqaga bloklandi.`;
    after(() => alertAdmins(`⚠️ Admin panelga kirishga urinish. ${what}\n${where}`).catch(() => {}));
  }
  await new Promise((r) => setTimeout(r, 400));
  redirect("/admin/login?error=1");
}

/** Second step: the code from Telegram. */
export async function verifyAdminCodeAction(fd: FormData) {
  const store = await cookies();
  const pending = await verifyPending(store.get(TWOFA_COOKIE)?.value);
  if (!pending) redirect("/admin/login?error=expired");
  const key = `2fa:${pending.jti}`;
  if (await locked(key)) {
    await setPendingCookie(null);
    redirect("/admin/login?error=expired");
  }
  const code = str(fd, "code").replace(/\D/g, "");
  if (code.length !== 6 || !sameHash(codeHash(pending.jti, code), pending.h)) {
    if (await countFailure(key, MAX_CODE_TRIES, CODE_TTL_S * 1000)) {
      await setPendingCookie(null);
      const where = await whereLine();
      after(() => alertAdmins(`⚠️ Admin kirish kodi ${MAX_CODE_TRIES} marta notoʻgʻri kiritildi, kod bekor qilindi. Parol toʻgʻri kiritilgan edi: siz boʻlmasangiz, parolni almashtiring.\n${where}`).catch(() => {}));
      redirect("/admin/login?error=expired");
    }
    await new Promise((r) => setTimeout(r, 400));
    redirect("/admin/login?step=code&error=code");
  }
  // One use only: burn this code before signing in.
  await countFailure(key, 1, CODE_TTL_S * 1000);
  await setPendingCookie(null);
  const admin = await db.admin.findUnique({ where: { username: pending.u }, select: { username: true, passwordHash: true } });
  if (!admin) redirect("/admin/login?error=1");
  await signedIn(admin.username, admin.passwordHash, "parol + Telegram kodi");
  redirect("/admin");
}

/** Change the admin password. Every other device is signed out (their tokens carry the old fingerprint). */
export async function changeAdminPasswordAction(fd: FormData) {
  const s = await assertAdmin();
  const back = (e: string) => redirect(`/admin/settings?pw=${e}#security`);
  const key = `apw:${s.username.toLowerCase()}`;
  if (await locked(key)) back("locked");
  // Trimmed like the login form, so the new password always works there.
  const current = str(fd, "current");
  const next = str(fd, "next");
  const repeat = str(fd, "repeat");
  const admin = await verifyCredentials(s.username, current.slice(0, 200));
  if (!admin) {
    await countFailure(key, 5, LOCK_MS);
    back("current");
  }
  if (next !== repeat) back("repeat");
  if (next === current) back("same");
  const weak = weakPasswordReason(next, s.username);
  if (weak) back(weak);
  const passwordHash = await bcrypt.hash(next, 12);
  await db.admin.update({ where: { username: s.username }, data: { passwordHash } });
  await db.loginAttempt.deleteMany({ where: { key } }).catch(() => {});
  await createSession(s.username, passwordHash);
  const where = await whereLine();
  after(() => alertAdmins(`🔑 Admin paroli almashtirildi. Boshqa barcha qurilmalardagi kirishlar bekor qilindi.\n${where}`).catch(() => {}));
  redirect("/admin/settings?pw=ok#security");
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
  revalidateTag(CATALOG_TAG);
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
  revalidateTag(CATALOG_TAG);
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
  const current = await getSiteSettings();
  await saveSiteSettings({
    ...current,
    socials,
    contactEmail: str(fd, "contactEmail") || DEFAULT_SETTINGS.contactEmail,
    contactTelegram: str(fd, "contactTelegram") || DEFAULT_SETTINGS.contactTelegram,
  });
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout"); // footer is in the shared layout
  revalidatePath("/support");
  redirect("/admin/settings?saved=1");
}

/** Google Search Console / Yandex Webmaster ownership codes, shown as <meta> tags on every page. */
export async function saveSearchVerificationAction(fd: FormData) {
  await assertAdmin();
  const rawG = str(fd, "googleVerification");
  const rawY = str(fd, "yandexVerification");
  // An easy mix-up: the sitemap address goes into Google / Yandex, not here.
  if ([rawG, rawY].some((v) => /sitemap|^https?:\/\//i.test(v))) redirect("/admin/settings?error=sitemap#search");
  // "google-site-verification=…" is the DNS (TXT record) code of a "Domain" property: it cannot work as a meta tag.
  if (/^\s*(google|yandex)-(site-)?verification\s*=/i.test(rawG) || /^\s*yandex-verification\s*[:=]/i.test(rawY)) {
    redirect("/admin/settings?error=dns#search");
  }
  const google = cleanVerification(rawG);
  const yandex = cleanVerification(rawY);
  if ((rawG && !google) || (rawY && !yandex)) redirect("/admin/settings?error=verification#search");
  const current = await getSiteSettings();
  await saveSiteSettings({ ...current, googleVerification: google, yandexVerification: yandex });
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=search#search");
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
  revalidateTag(CATALOG_TAG);
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

  revalidateTag(CATALOG_TAG);
  revalidatePath("/fonts");
  revalidatePath(`/fonts/${slug}`);
  revalidatePath("/about");
  revalidatePath("/admin/fonts");
  redirect(`/admin/fonts/${slug}?uploaded=1`);
}
