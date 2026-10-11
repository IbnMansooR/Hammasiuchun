// Approving or rejecting a member's work, shared by the admin panel and the Telegram buttons.
// Callers check who is allowed; these functions only change the work and tell the member.
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "./db";
import { notifyUser, type Note } from "./notify";
import { WORKS_TAG, splitTags } from "./works";

export function revalidateWorks(slugs: string[], fonts: string[]) {
  revalidateTag(WORKS_TAG);
  revalidatePath("/dizaynerlar");
  for (const s of slugs) revalidatePath(`/dizaynerlar/${s}`);
  for (const f of fonts) revalidatePath(`/fonts/${f}`);
  revalidatePath("/");
  revalidatePath("/admin/works");
}

/** A personal message to the person who sent the work. It ignores the news opt-out. */
export async function tellSubmitter(userId: number | null, note: Note) {
  if (!userId || !(await db.user.findUnique({ where: { id: userId }, select: { id: true } }))) return;
  await notifyUser(userId, note);
}

export const publishedNote = (w: { title: string; slug: string }): Note => ({
  title: "Ishingiz chop etildi",
  body: `“${w.title}” “Dizaynerlar” boʻlimida koʻrinadi.`,
  link: `/dizaynerlar/${w.slug}`,
});

export type ModerationResult = "done" | "missing" | "already";

export async function approveWork(id: number): Promise<ModerationResult> {
  const w = await db.work.findUnique({ where: { id } });
  if (!w) return "missing";
  if (w.status === "approved" && w.isPublished) return "already";
  await db.work.update({
    where: { id },
    data: { status: "approved", isPublished: true, rejectReason: null, publishedAt: w.publishedAt ?? new Date() },
  });
  await tellSubmitter(w.submittedById, publishedNote(w));
  revalidateWorks([w.slug], splitTags(w.fonts));
  return "done";
}

export async function rejectWork(id: number, reason: string): Promise<ModerationResult> {
  const w = await db.work.findUnique({ where: { id } });
  if (!w) return "missing";
  if (w.status === "rejected" && (w.rejectReason ?? "") === reason) return "already";
  await db.work.update({ where: { id }, data: { status: "rejected", isPublished: false, rejectReason: reason || null } });
  await tellSubmitter(w.submittedById, {
    title: "Ishingiz qabul qilinmadi",
    body: reason ? `“${w.title}”: ${reason}` : `“${w.title}” hozircha chop etilmadi. Savollar boʻlsa, yordam boʻlimiga yozing.`,
    link: "/account/ishlarim",
  });
  revalidateWorks([w.slug], splitTags(w.fonts));
  return "done";
}
