"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGuard";

const DAY = 24 * 60 * 60 * 1000;

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function userId(fd: FormData): number {
  const id = Number(fd.get("id"));
  return Number.isInteger(id) && id > 0 ? id : 0;
}

/** Internal path ("/fonts/x") or an absolute https URL; anything else is dropped. */
function safeLink(raw: string): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw.slice(0, 500);
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

/* ---------------- restrictions ---------------- */
export async function restrictUserAction(fd: FormData) {
  await requireAdmin();
  const id = userId(fd);
  if (!id) redirect("/admin/users");
  const period = str(fd, "period"); // "forever" | days ("1", "7", ...) | "custom"
  let until: Date | null = null;
  if (period === "custom") {
    // <input type="datetime-local"> has no zone; the admin works in Tashkent time (UTC+5).
    const local = str(fd, "until");
    const d = local ? new Date(`${local}:00+05:00`) : null;
    if (!d || Number.isNaN(d.getTime()) || d <= new Date()) redirect(`/admin/users/${id}?error=until`);
    until = d;
  } else if (period !== "forever") {
    const days = Number(period);
    if (!Number.isInteger(days) || days < 1 || days > 3650) redirect(`/admin/users/${id}?error=until`);
    until = new Date(Date.now() + days * DAY);
  }
  await db.user.update({
    where: { id },
    data: { blockedAt: new Date(), blockedUntil: until, blockReason: str(fd, "reason").slice(0, 300) || null },
  });
  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}?ok=${until ? "suspended" : "blocked"}`);
}

export async function liftRestrictionAction(fd: FormData) {
  await requireAdmin();
  const id = userId(fd);
  if (!id) redirect("/admin/users");
  await db.user.update({ where: { id }, data: { blockedAt: null, blockedUntil: null, blockReason: null } });
  if (fd.get("notify") === "on") {
    await db.notification.create({
      data: {
        userId: id,
        batch: crypto.randomUUID(),
        title: "Hisobingiz qayta faollashtirildi",
        body: "Cheklov olib tashlandi — Feekr’dan yana toʻliq foydalanishingiz mumkin.",
      },
    });
  }
  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}?ok=lifted`);
}

export async function deleteUserAction(fd: FormData) {
  await requireAdmin();
  const id = userId(fd);
  if (!id) redirect("/admin/users");
  // Orders are kept for the books (detached); purchases go with the account.
  await db.$transaction([
    db.order.updateMany({ where: { userId: id }, data: { userId: null } }),
    db.purchase.deleteMany({ where: { userId: id } }),
    db.user.deleteMany({ where: { id } }),
  ]);
  revalidatePath("/admin/users");
  redirect("/admin/users?ok=deleted");
}

/* ---------------- notifications ---------------- */
type Audience = "user" | "all" | "active";

export async function sendNotificationAction(fd: FormData) {
  await requireAdmin();
  const audience = str(fd, "audience") as Audience;
  const id = userId(fd);
  const back = audience === "user" && id ? `/admin/users/${id}` : "/admin/notifications";

  const title = str(fd, "title").slice(0, 140);
  const body = str(fd, "body").slice(0, 2000);
  const rawLink = str(fd, "link");
  const link = safeLink(rawLink);
  if (!title) redirect(`${back}?error=title`);
  if (rawLink && !link) redirect(`${back}?error=link`);

  let ids: number[];
  if (audience === "user") {
    if (!id || !(await db.user.findUnique({ where: { id }, select: { id: true } }))) redirect("/admin/users");
    ids = [id];
  } else if (audience === "all" || audience === "active") {
    const rows = await db.user.findMany({
      where: audience === "active" ? { lastLoginAt: { gte: new Date(Date.now() - 30 * DAY) } } : {},
      select: { id: true },
    });
    ids = rows.map((r) => r.id);
  } else {
    redirect(back);
  }
  if (ids.length === 0) redirect(`${back}?error=empty`);

  const batch = crypto.randomUUID();
  for (let i = 0; i < ids.length; i += 1000) {
    await db.notification.createMany({
      data: ids.slice(i, i + 1000).map((userId) => ({ userId, batch, title, body, link })),
    });
  }
  revalidatePath("/admin/notifications");
  revalidatePath(back);
  redirect(`${back}?ok=sent&n=${ids.length}`);
}

/** Withdraw a sent message from every recipient's inbox. */
export async function deleteNotificationBatchAction(fd: FormData) {
  await requireAdmin();
  const batch = str(fd, "batch");
  const back = str(fd, "back");
  if (batch) await db.notification.deleteMany({ where: { batch } });
  revalidatePath("/admin/notifications");
  redirect(back.startsWith("/admin/") ? back : "/admin/notifications");
}
