"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGuard";
import { ADS_TAG, isPlacement } from "@/lib/ads";
import { isSafeImageUrl, splitLines } from "@/lib/works";

const TZ = "+05:00"; // Tashkent

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

/** "2026-10-05T18:30" typed in Tashkent time, or null. */
function localDate(raw: string): Date | null | "bad" {
  if (!raw) return null;
  const d = new Date(`${raw}:00${TZ}`);
  return Number.isNaN(d.getTime()) ? "bad" : d;
}

/** The banner's landing page: https only, so it can never be javascript:, data: or a plain http link. */
function httpsUrl(raw: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.protocol === "https:" ? u.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

function refresh() {
  revalidateTag(ADS_TAG);
  revalidatePath("/");
  revalidatePath("/dizaynerlar");
  revalidatePath("/admin/ads");
}

export async function saveAdAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  const back = id ? `/admin/ads/${id}` : "/admin/ads/new";

  const title = str(fd, "title").slice(0, 120);
  if (!title) redirect(`${back}?error=title`);
  const href = httpsUrl(str(fd, "href"));
  if (!href) redirect(`${back}?error=href`);
  const placement = str(fd, "placement");
  if (!isPlacement(placement)) redirect(`${back}?error=placement`);
  const image = splitLines(str(fd, "images")).find(isSafeImageUrl);
  if (!image) redirect(`${back}?error=image`);
  const startsAt = localDate(str(fd, "startsAt"));
  const endsAt = localDate(str(fd, "endsAt"));
  if (startsAt === "bad" || endsAt === "bad") redirect(`${back}?error=dates`);
  if (startsAt && endsAt && endsAt <= startsAt) redirect(`${back}?error=dates`);

  const data = {
    title, href, placement, image,
    advertiser: str(fd, "advertiser").slice(0, 120) || null,
    startsAt, endsAt,
    isActive: fd.get("isActive") === "on",
    sortOrder: Math.max(-999, Math.min(999, Math.trunc(Number(str(fd, "sortOrder")) || 0))),
  };
  if (id) {
    if (!(await db.ad.findUnique({ where: { id }, select: { id: true } }))) redirect("/admin/ads");
    await db.ad.update({ where: { id }, data });
  } else {
    await db.ad.create({ data });
  }
  refresh();
  redirect("/admin/ads?ok=saved");
}

export async function toggleAdAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const ad = await db.ad.findUnique({ where: { id }, select: { isActive: true } });
  if (!ad) return;
  await db.ad.update({ where: { id }, data: { isActive: !ad.isActive } });
  refresh();
}

export async function deleteAdAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.ad.deleteMany({ where: { id } });
  refresh();
  redirect("/admin/ads?ok=deleted");
}
