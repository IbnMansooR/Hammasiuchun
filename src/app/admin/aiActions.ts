"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { saveAiSettings } from "@/lib/ai";
import { testTranslation } from "@/lib/translate";

const BACK = "/admin/ai";

export async function saveAiSettingsAction(fd: FormData) {
  await requireAdmin();
  const usd = Number(String(fd.get("monthlyUsd") ?? "").replace(",", "."));
  if (!Number.isFinite(usd) || usd < 1 || usd > 1000) redirect(`${BACK}?error=usd`);
  await saveAiSettings({ on: fd.get("on") === "on", monthlyUsd: Math.round(usd * 100) / 100 });
  revalidatePath(BACK);
  redirect(`${BACK}?ok=saved`);
}

export async function testAiAction() {
  await requireAdmin();
  const r = await testTranslation();
  revalidatePath(BACK);
  if (!r.ok) redirect(`${BACK}?error=test&detail=${encodeURIComponent(r.detail)}`);
  redirect(`${BACK}?ok=test&detail=${encodeURIComponent(`${r.model}: “${r.title}”`)}`);
}
