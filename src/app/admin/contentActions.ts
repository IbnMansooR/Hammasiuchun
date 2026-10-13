"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGuard";
import { CATALOG_TAG } from "@/lib/stats";
import { isClock } from "@/lib/tgState";
import {
  DESIGNER_EVERY, NEWS_PER_DAY, addDesignerById, decideContent, feedUrlOk, runContentScout, updateContent, type Decision,
} from "@/lib/contentScout";
import { fetchFeed } from "@/lib/rssFeed";

const BACK = "/admin/content";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
function fail(code: string, hash = ""): never {
  return redirect(`${BACK}?error=${code}${hash}`);
}

export async function saveContentSettingsAction(fd: FormData) {
  await requireAdmin();
  const time = str(fd, "time");
  const news = Number(str(fd, "news"));
  const designerDays = Number(str(fd, "designerDays"));
  if (!isClock(time)) fail("time", "#settings");
  if (!NEWS_PER_DAY.includes(news) || !DESIGNER_EVERY.includes(designerDays)) fail("count", "#settings");
  await updateContent((s) => {
    s.on = fd.get("on") === "on";
    s.time = time;
    s.news = news;
    s.designerDays = designerDays;
  });
  revalidatePath(BACK);
  redirect(`${BACK}?ok=saved#settings`);
}

export async function runContentNowAction() {
  await requireAdmin();
  const r = await runContentScout({ force: true }).catch(() => ({ news: 0, designers: 0, reason: "error" as const }));
  revalidatePath(BACK);
  if (r.reason === "full") fail("full", "#offers");
  if (!r.news && !r.designers) fail("none", "#offers");
  redirect(`${BACK}?ok=offered&n=${r.news}&d=${r.designers}#offers`);
}

export async function addFeedAction(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name").slice(0, 60);
  const url = str(fd, "url").slice(0, 300);
  if (!name) fail("feedname", "#feeds");
  if (!feedUrlOk(url)) fail("feedurl", "#feeds");
  if ((await fetchFeed(url)).length === 0) fail("feedread", "#feeds");
  let tooMany = false;
  await updateContent((s) => {
    if (s.feeds.length >= 12) { tooMany = true; return; }
    if (!s.feeds.some((f) => f.url === url)) s.feeds.push({ name, url, on: true });
  });
  if (tooMany) fail("feedmany", "#feeds");
  revalidatePath(BACK);
  redirect(`${BACK}?ok=feed#feeds`);
}

export async function toggleFeedAction(fd: FormData) {
  await requireAdmin();
  const url = str(fd, "url");
  await updateContent((s) => { const f = s.feeds.find((x) => x.url === url); if (f) f.on = !f.on; });
  revalidatePath(BACK);
  redirect(`${BACK}#feeds`);
}

export async function removeFeedAction(fd: FormData) {
  await requireAdmin();
  const url = str(fd, "url");
  await updateContent((s) => { s.feeds = s.feeds.filter((f) => f.url !== url); });
  revalidatePath(BACK);
  redirect(`${BACK}?ok=feedremoved#feeds`);
}

export async function decideContentAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const how = str(fd, "how") as Decision;
  if (!/^[0-9a-f]{8}$/.test(id) || !["both", "site", "reject"].includes(how)) fail("gone", "#offers");
  const { offer, result } = await decideContent(id, how);
  revalidatePath(BACK);
  if (!offer) fail("gone", "#offers");
  if (how === "reject") redirect(`${BACK}?ok=rejected#offers`);
  if (result && !result.ok) fail(result.reason === "exists" ? "exists" : "failed", "#offers");
  redirect(`${BACK}?ok=${result?.ok && result.posted ? "addedposted" : "added"}&to=${encodeURIComponent(result?.ok ? result.path : "")}#offers`);
}

export async function searchDesignerAction(fd: FormData) {
  await requireAdmin();
  const q = str(fd, "q").slice(0, 80);
  if (q.length < 2) fail("q", "#add");
  redirect(`${BACK}?q=${encodeURIComponent(q)}#add`);
}

export async function addDesignerAction(fd: FormData) {
  await requireAdmin();
  const qid = str(fd, "qid");
  const how = str(fd, "how") === "both" ? "both" : "site";
  if (!/^Q\d{1,12}$/.test(qid)) fail("failed", "#add");
  const r = await addDesignerById(qid, how);
  revalidatePath(BACK);
  if (!r.ok) fail(r.reason === "exists" ? "exists" : "notdesigner", "#add");
  redirect(`${BACK}?ok=${r.posted ? "addedposted" : "added"}&to=${encodeURIComponent(r.path)}#designers`);
}

function refreshDesigner(slug: string) {
  revalidateTag(CATALOG_TAG);
  for (const p of ["/dizaynerlar", "/dizaynerlar/profil", `/dizaynerlar/profil/${slug}`, BACK]) revalidatePath(p);
}

export async function saveDesignerAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const summary = String(fd.get("summary") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 3000);
  if (!summary) fail("summary", `#d${id}`);
  const d = await db.designer.update({ where: { id }, data: { summary } }).catch(() => null);
  if (d) refreshDesigner(d.slug);
  redirect(`${BACK}?ok=saved#d${id}`);
}

export async function toggleDesignerAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const d = await db.designer.findUnique({ where: { id } });
  if (d) {
    await db.designer.update({ where: { id }, data: { isPublished: !d.isPublished } });
    refreshDesigner(d.slug);
  }
  redirect(`${BACK}#d${id}`);
}

export async function deleteDesignerAction(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const d = await db.designer.findUnique({ where: { id } });
  if (d) {
    await db.designer.delete({ where: { id } });
    // Not offered again by the scout.
    await updateContent((s) => { if (!s.rejected.includes(d.wikidataId)) s.rejected.push(d.wikidataId); });
    refreshDesigner(d.slug);
  }
  redirect(`${BACK}?ok=deleted#designers`);
}
