"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGuard";
import { ADS_TAG, isPlacement } from "@/lib/ads";
import { isSafeImageUrl, splitLines } from "@/lib/works";
import { saveAdOffer, setAdRequestStatus } from "@/lib/adSales";
import { DELETE_AFTER, TEXT_MAX, TEXT_MAX_PHOTO, reportToken, runChannelAds } from "@/lib/channelAds";
import { tg } from "@/lib/telegram";

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

/* ---------------- advertiser reports, enquiries, channel posts, prices ---------------- */

/** A secret report link for a banner, made on first request. */
export async function bannerReportAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const ad = await db.ad.findUnique({ where: { id }, select: { reportToken: true } });
  if (ad && !ad.reportToken) await db.ad.update({ where: { id }, data: { reportToken: reportToken() } });
  revalidatePath("/admin/ads");
  redirect(`/admin/ads?ok=report#ad${id}`);
}

export async function saveAdRequestAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await setAdRequestStatus(id, str(fd, "status"), str(fd, "note"));
  revalidatePath("/admin/ads/requests");
  redirect(`/admin/ads/requests?ok=saved#r${id}`);
}

export async function saveChannelAdAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id")) || 0;
  const requestId = Number(str(fd, "requestId")) || null;
  // An error keeps the post tied to its enquiry.
  const back = id ? `/admin/ads/channel/${id}` : `/admin/ads/channel/new${requestId ? `?request=${requestId}&` : "?"}`;
  const err = (code: string) => redirect(`${back}${id ? "?" : ""}error=${code}`);
  const text = String(fd.get("text") ?? "").replace(/\r\n/g, "\n").trim();
  const image = splitLines(str(fd, "images")).find(isSafeImageUrl) ?? null;
  if (!text) err("text");
  if (text.length > (image ? TEXT_MAX_PHOTO : TEXT_MAX)) err("long");
  const rawHref = str(fd, "href");
  const href = rawHref ? httpsUrl(rawHref) : null;
  if (rawHref && !href) err("href");
  const buttonText = str(fd, "buttonText").slice(0, 40) || (href ? "Batafsil" : null);
  const postAt = localDate(str(fd, "postAt"));
  if (!postAt || postAt === "bad") err("date");
  const deleteAfterH = Number(str(fd, "deleteAfterH")) || 0;
  if (!(DELETE_AFTER as readonly number[]).includes(deleteAfterH)) err("delete");
  const data = {
    text, image, href, buttonText: href ? buttonText : null, postAt: postAt as Date,
    deleteAfterH: deleteAfterH || null, advertiser: str(fd, "advertiser").slice(0, 120) || null, requestId,
  };
  if (id) {
    // Only a post that hasn't gone out can be changed.
    const n = await db.channelAd.updateMany({ where: { id, status: { in: ["scheduled", "failed", "canceled"] } }, data: { ...data, status: "scheduled", error: null } });
    if (!n.count) redirect("/admin/ads/channel?error=sent");
  } else {
    await db.channelAd.create({ data: { ...data, reportToken: reportToken() } });
    if (requestId) await setAdRequestStatus(requestId, "accepted").catch(() => false);
  }
  revalidatePath("/admin/ads/channel");
  redirect("/admin/ads/channel?ok=saved");
}

export async function cancelChannelAdAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (Number.isInteger(id) && id > 0) await db.channelAd.updateMany({ where: { id, status: "scheduled" }, data: { status: "canceled" } });
  revalidatePath("/admin/ads/channel");
  redirect("/admin/ads/channel?ok=canceled");
}

/** "Send now": the post's time becomes now, and the same code as the cron sends it. */
export async function sendChannelAdNowAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.channelAd.updateMany({ where: { id, status: { in: ["scheduled", "failed", "canceled"] } }, data: { status: "scheduled", postAt: new Date(), error: null } });
  await runChannelAds();
  revalidatePath("/admin/ads/channel");
  const ad = await db.channelAd.findUnique({ where: { id }, select: { status: true } });
  redirect(`/admin/ads/channel?${ad?.status === "posted" ? "ok=posted" : "error=post"}`);
}

/** Take a live post down now (within Telegram's 48 hours). */
export async function deleteChannelAdNowAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const ad = await db.channelAd.findUnique({ where: { id } });
  if (!ad || ad.status !== "posted") redirect("/admin/ads/channel");
  const r = await tg("deleteMessage", { chat_id: ad!.chatId, message_id: ad!.messageId }).catch(() => null);
  await db.channelAd.update({ where: { id }, data: r?.ok ? { status: "deleted", deletedAt: new Date() } : { error: "Telegram postni oʻchirmadi: uni kanalda qoʻlda oʻchiring" } });
  revalidatePath("/admin/ads/channel");
  redirect(`/admin/ads/channel?${r?.ok ? "ok=deleted" : "error=delete"}`);
}

export async function saveAdOfferAction(fd: FormData) {
  await requireAdmin();
  await saveAdOffer({
    channelPrice: str(fd, "channelPrice").slice(0, 80),
    sitePrice: str(fd, "sitePrice").slice(0, 80),
    packagePrice: str(fd, "packagePrice").slice(0, 80),
    note: str(fd, "note").slice(0, 600),
  });
  revalidatePath("/reklama");
  revalidatePath("/ru/reklama");
  revalidatePath("/admin/ads/offer");
  redirect("/admin/ads/offer?ok=saved");
}
