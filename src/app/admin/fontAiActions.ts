"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { db } from "@/lib/db";
import { draftFontTexts, pairFonts, readDraft } from "@/lib/aiFonts";

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
