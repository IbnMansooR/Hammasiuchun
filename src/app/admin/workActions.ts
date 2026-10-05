"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGuard";
import { slugify, shortHash } from "@/lib/fontmeta";
import { WORKS_TAG, splitLines, splitTags, isSafeImageUrl } from "@/lib/works";
import crypto from "node:crypto";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

function httpsOrNull(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

function revalidateWorks(slugs: string[], fonts: string[]) {
  revalidateTag(WORKS_TAG);
  revalidatePath("/dizaynerlar");
  for (const s of slugs) revalidatePath(`/dizaynerlar/${s}`);
  for (const f of fonts) revalidatePath(`/fonts/${f}`);
  revalidatePath("/");
  revalidatePath("/admin/works");
}

/** A personal message from the admin to the person who sent the work. It ignores the news opt-out. */
async function tellSubmitter(userId: number | null, title: string, body: string, link?: string) {
  if (!userId || !(await db.user.findUnique({ where: { id: userId }, select: { id: true } }))) return;
  await db.notification.create({ data: { userId, batch: crypto.randomUUID(), title, body, link: link ?? null } });
}

export async function saveWorkAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  const back = id ? `/admin/works/${id}` : "/admin/works/new";
  const title = str(fd, "title").slice(0, 200);
  if (!title) redirect(`${back}?error=title`);

  const existing = id ? await db.work.findUnique({ where: { id } }) : null;
  if (id && !existing) redirect("/admin/works");
  // A member's work stays a member's work; the radio buttons only choose between the admin's own kinds.
  const kind = existing?.kind === "member" ? "member" : str(fd, "kind") === "partner" ? "partner" : "own";
  const authorName = str(fd, "authorName").slice(0, 120) || null;
  if (kind === "partner" && !authorName) redirect(`${back}?error=author`);

  const images = splitLines(str(fd, "images")).filter(isSafeImageUrl).slice(0, 60);
  const coverRaw = str(fd, "coverImage");
  const coverImage = coverRaw && isSafeImageUrl(coverRaw) ? coverRaw : images[0] ?? null;
  const yearN = Number(str(fd, "year"));
  const fontSlugs = [...new Set(splitTags(str(fd, "fonts")).map((s) => slugify(s)))].slice(0, 12);
  const published = fd.get("isPublished") === "on";

  const data = {
    title,
    slug: slugify(str(fd, "slug") || title),
    summary: str(fd, "summary").slice(0, 300) || null,
    body: str(fd, "body").slice(0, 20000),
    kind,
    authorName,
    authorUrl: httpsOrNull(str(fd, "authorUrl")),
    client: str(fd, "client").slice(0, 120) || null,
    year: Number.isInteger(yearN) && yearN >= 1900 && yearN <= 2100 ? yearN : null,
    tags: splitTags(str(fd, "tags")).slice(0, 12).join(", "),
    coverImage,
    images: images.join("\n"),
    fonts: fontSlugs.join(","),
    isPublished: published,
    isFeatured: fd.get("isFeatured") === "on",
    sortOrder: Math.max(-9999, Math.min(9999, Math.trunc(Number(str(fd, "sortOrder")) || 0))),
    publishedAt: published ? new Date() : null,
    // Published means approved. Otherwise a pending or rejected member work keeps its state.
    status: published ? "approved" : existing?.status ?? "approved",
    rejectReason: published ? null : existing?.rejectReason ?? null,
  };

  let oldFonts: string[] = [];
  let oldSlug = "";
  if (id && existing) {
    oldFonts = splitTags(existing.fonts);
    oldSlug = existing.slug;
    data.publishedAt = published ? (existing.publishedAt ?? new Date()) : existing.publishedAt;
    const clash = await db.work.findUnique({ where: { slug: data.slug } });
    if (clash && clash.id !== id) data.slug = `${data.slug}-${shortHash(String(id))}`;
    await db.work.update({ where: { id }, data });
    if (existing.kind === "member" && existing.status !== "approved" && published) {
      await tellSubmitter(existing.submittedById, "Ishingiz chop etildi", `“${data.title}” “Dizaynerlar” boʻlimida koʻrinadi.`, `/dizaynerlar/${data.slug}`);
    }
  } else {
    if (await db.work.findUnique({ where: { slug: data.slug } })) data.slug = `${data.slug}-${Date.now().toString(36)}`;
    await db.work.create({ data });
  }
  revalidateWorks([data.slug, oldSlug].filter(Boolean), [...new Set([...fontSlugs, ...oldFonts])]);
  redirect("/admin/works?ok=saved");
}

export async function deleteWorkAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const w = await db.work.findUnique({ where: { id } });
  if (w) {
    await db.work.delete({ where: { id } });
    revalidateWorks([w.slug], splitTags(w.fonts));
  }
  redirect("/admin/works?ok=deleted");
}

export async function toggleWorkAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const field = str(fd, "field");
  if (!Number.isInteger(id) || id <= 0 || (field !== "isPublished" && field !== "isFeatured")) return;
  const w = await db.work.findUnique({ where: { id } });
  if (!w) return;
  const on = !w[field];
  await db.work.update({
    where: { id },
    data: field === "isPublished" ? { isPublished: on, publishedAt: on ? (w.publishedAt ?? new Date()) : w.publishedAt } : { isFeatured: on },
  });
  revalidateWorks([w.slug], splitTags(w.fonts));
}

export async function approveWorkAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const w = await db.work.findUnique({ where: { id } });
  if (!w || (w.status === "approved" && w.isPublished)) return;
  await db.work.update({
    where: { id },
    data: { status: "approved", isPublished: true, rejectReason: null, publishedAt: w.publishedAt ?? new Date() },
  });
  await tellSubmitter(w.submittedById, "Ishingiz chop etildi", `“${w.title}” “Dizaynerlar” boʻlimida koʻrinadi.`, `/dizaynerlar/${w.slug}`);
  revalidateWorks([w.slug], splitTags(w.fonts));
  redirect("/admin/works?ok=approved");
}

export async function rejectWorkAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const reason = str(fd, "reason").slice(0, 300);
  const w = await db.work.findUnique({ where: { id } });
  if (!w) return;
  await db.work.update({ where: { id }, data: { status: "rejected", isPublished: false, rejectReason: reason || null } });
  await tellSubmitter(
    w.submittedById,
    "Ishingiz qabul qilinmadi",
    reason ? `“${w.title}”: ${reason}` : `“${w.title}” hozircha chop etilmadi. Savollar boʻlsa, yordam boʻlimiga yozing.`,
    "/account/ishlarim",
  );
  revalidateWorks([w.slug], splitTags(w.fonts));
  redirect("/admin/works?ok=rejected");
}
