// Vercel Cron (vercel.json) calls this once a day at 04:00 UTC = 09:00 Tashkent.
// Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is refused.
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { botEnabled } from "@/lib/telegram";
import { sendDailyReport, sendDigestDraft } from "@/lib/tgAdmin";
import { sampleFonts } from "@/lib/fontSamples";
import { TZ_OFFSET_MS } from "@/lib/analytics";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { submitIndexNow } from "@/lib/indexnow";
import { withLocale } from "@/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && given.length === want.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

/** Pages that changed since yesterday (or every public page with ?indexnow=all), for IndexNow. */
async function changedPaths(all: boolean): Promise<string[]> {
  const since = new Date(Date.now() - 26 * 60 * 60 * 1000);
  const [fams, works] = await Promise.all([
    db.family.findMany({ where: { ...PUBLIC_FAMILY, ...(all ? {} : { updatedAt: { gte: since } }) }, select: { slug: true } }),
    db.work.findMany({ where: { isPublished: true, status: "approved", ...(all ? {} : { updatedAt: { gte: since } }) }, select: { slug: true } }),
  ]);
  const paths = [...fams.map((f) => `/fonts/${f.slug}`), ...works.map((w) => `/dizaynerlar/${w.slug}`)];
  if (fams.length) paths.push("/", "/fonts");
  if (works.length) paths.push("/dizaynerlar");
  if (all) paths.push("/", "/fonts", "/dizaynerlar", "/about", "/license", "/support", "/pairs", "/blog");
  // Translated pages have a Russian twin (works and the journal are Uzbek-only).
  return [...paths, ...paths.filter((p) => !/^\/(dizaynerlar\/|blog)/.test(p)).map((p) => withLocale("ru", p))];
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return new NextResponse(null, { status: 401 });
  const indexnow = await submitIndexNow(await changedPaths(req.nextUrl.searchParams.get("indexnow") === "all")).catch(() => null);
  if (!botEnabled()) return NextResponse.json({ sent: 0, reason: "bot not configured", indexnow });
  const report = await sendDailyReport();
  // Fridays (Tashkent): the weekly digest draft, for the admin to publish with one press.
  const friday = new Date(Date.now() + TZ_OFFSET_MS).getUTCDay() === 5 || req.nextUrl.searchParams.get("digest") === "1";
  const digest = friday ? await sendDigestDraft() : null;
  // Keep the bot's font list warm so the first sample of the day is quick.
  const fonts = (await sampleFonts().catch(() => [])).length;
  return NextResponse.json({ ...report, digest, fonts, indexnow });
}
