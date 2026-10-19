"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";
import crypto from "node:crypto";
import { draftFontTexts, pairFonts, readDraft } from "@/lib/aiFonts";
import { dropQuoteDraft, draftArticle, draftQuotes, getArticleAuto, readQuoteDrafts, saveArticleAuto } from "@/lib/aiIdeas";
import { translatePending } from "@/lib/articleRu";
import { updateTgState, isClock, ALL_DAYS } from "@/lib/tgState";

const BACK = "/admin/ai-texts";
const done = (q: string) => { revalidatePath(BACK); redirect(`${BACK}?${q}`); };

export async function draftFontsAction() {
  await requireAdmin();
  const r = await draftFontTexts();
  done(r.made ? `ok=drafted&n=${r.made}` : `error=draft&detail=${encodeURIComponent(r.detail ?? "qoralama qolmadi")}`);
}

export async function pairFontsAction() {
  await requireAdmin();
  const r = await pairFonts();
  if (r.made) revalidatePath("/fonts/[slug]", "page");
  done(r.made ? `ok=paired&n=${r.made}` : `error=pair&detail=${encodeURIComponent(r.detail ?? "juftlik qolmadi")}`);
}

/** Accept: the Russian text always; the Uzbek text only where the admin has not written their own. */
export async function acceptDraftAction(fd: FormData) {
  await requireAdmin();
  const slug = String(fd.get("slug") ?? "");
  const f = await db.family.findUnique({ where: { slug }, select: { aiDraft: true, tagline: true, description: true } });
  const d = f && readDraft(f.aiDraft);
  if (!f || !d) done("error=gone");
  else {
    await db.family.update({ where: { slug }, data: {
      taglineRu: d.taglineRu, descriptionRu: d.descriptionRu, aiDraft: null,
      ...(f.tagline ? {} : { tagline: d.tagline }), ...(f.description ? {} : { description: d.description }),
    } });
    revalidatePath(`/fonts/${slug}`);
    done("ok=accepted");
  }
}

export async function rejectDraftAction(fd: FormData) {
  await requireAdmin();
  await db.family.update({ where: { slug: String(fd.get("slug") ?? "") }, data: { aiDraft: "-" } }).catch(() => null);
  done("ok=rejected");
}

export async function draftQuotesAction() {
  await requireAdmin();
  const r = await draftQuotes();
  done(r.made ? `ok=quotes&n=${r.made}` : `error=quotes&detail=${encodeURIComponent(r.detail ?? "ibora qolmadi")}`);
}

export async function acceptQuoteAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const d = (await readQuoteDrafts()).find((x) => x.id === id);
  if (d) {
    await updateTgState((s) => { s.quotes.custom = [{ id: `c${crypto.randomBytes(4).toString("hex")}`, text: d.text, author: null, mood: d.mood }, ...s.quotes.custom].slice(0, 200); });
    await dropQuoteDraft(id);
  }
  done("ok=quoteadded");
}

export async function rejectQuoteAction(fd: FormData) {
  await requireAdmin();
  await dropQuoteDraft(String(fd.get("id") ?? ""));
  done("ok=rejected");
}

export async function saveArticleAutoAction(fd: FormData) {
  await requireAdmin();
  const day = Number(fd.get("day")), time = String(fd.get("time") ?? "");
  if (!ALL_DAYS.includes(day) || !isClock(time)) done("error=sched&detail=kun+yoki+vaqt+notoʻgʻri");
  await saveArticleAuto({ ...(await getArticleAuto()), on: fd.get("on") === "on", day, time });
  done("ok=saved");
}

export async function draftArticleNowAction() {
  await requireAdmin();
  const r = await draftArticle();
  done(r.id ? "ok=article" : `error=article&detail=${encodeURIComponent(r.reason ?? "qoralama yaratilmadi")}`);
}

export async function translateArticlesAction() {
  await requireAdmin();
  const r = await translatePending(3);
  done(r.done ? `ok=translated&n=${r.done}` : `error=translate&detail=${encodeURIComponent(r.detail ?? "tarjima qilinadigan maqola qolmadi")}`);
}
