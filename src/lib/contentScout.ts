// The content scout: every day the bot offers the admins (in Telegram, with ✅ / ❌) a few things
// for the Dizaynerlar and Jurnal sections:
//  - a profile of a well-known designer, built from open data (lib/wikidata), and
//  - design news from the feeds the admin chose (lib/rssFeed): the publisher's own short summary
//    and a link to the original, never the article or its pictures.
// ✅ puts it on the site (and, if asked, in the channel); ❌ is never offered again.
import crypto from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "./db";
import { casUpdate, readSetting } from "./settingCas";
import { tashkentDay } from "./analytics";
import { shortHash, slugify } from "./fontmeta";
import { CATALOG_TAG } from "./stats";
import { submitIndexNow } from "./indexnow";
import { fetchFeed, shorten, type FeedItem } from "./rssFeed";
import { translateNews, type UzText } from "./translate";
import { absoluteImage, esc, pause, sendMessage, sendPhotoOrText, siteLink, tg, type Keyboard } from "./telegram";
import { ALL_DAYS, AUTOPOST_MAX_TIMES, getTgState, isClock } from "./tgState";
import { dueSlots } from "./tgAutopost";
import { adminPress, answer, setKeyboard, type CallbackQuery } from "./tgAdmin";
import { postDraft, type PostDraft } from "./tgPosts";
import { SEED_NAMES, WikiUnavailable, designerFacts, designerSummary, findDesigner, portraitInfo, savePortrait, type DesignerFacts, type Portrait } from "./wikidata";

/* ---------------- state ---------------- */

export type Feed = { name: string; url: string; on: boolean };
type Msg = { chatId: string; messageId: number };
export type NewsOffer = { title: string; link: string; source: string; excerpt: string; date: string | null; uz?: UzText };
export type Offer = {
  id: string;
  kind: "news" | "designer";
  at: string;
  msgs: Msg[];
  news?: NewsOffer;
  designer?: { facts: DesignerFacts; portrait: Portrait | null };
};
export type ContentState = {
  on: boolean;
  times: string[]; // Tashkent "HH:MM", up to 4 a day; none = off
  days: number[]; // ISO weekdays (1 = Monday)
  news: number; // news offers each time (0 = none)
  designerDays: number; // a designer offer every N days (0 = none)
  lastDesigner: string | null; // Tashkent day of the last designer offer
  feeds: Feed[];
  pending: Offer[];
  seen: string[]; // links already offered
  rejected: string[]; // designers' names or Wikidata ids not to offer again
};

const KEY = "content-scout";
const PENDING_MAX = 20;
const PENDING_DAYS = 14;
export const NEWS_PER_DAY = [0, 1, 2, 3, 4, 5];
export const DESIGNER_EVERY = [0, 1, 2, 3, 7];

export const DEFAULT_FEEDS: Feed[] = [
  { name: "Creative Boom", url: "https://www.creativeboom.com/feed/", on: true },
  { name: "Designboom", url: "https://www.designboom.com/feed/", on: true },
  { name: "Typographica", url: "https://typographica.org/feed/", on: true },
];

const DEFAULT: ContentState = { on: true, times: ["12:00"], days: ALL_DAYS, news: 2, designerDays: 2, lastDesigner: null, feeds: DEFAULT_FEEDS, pending: [], seen: [], rejected: [] };

/** Feeds are read over https; the test suites serve theirs from 127.0.0.1 (CONTENT_ALLOW_LOCAL=1). */
export const feedUrlOk = (u: string) => {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || (process.env.CONTENT_ALLOW_LOCAL === "1" && url.protocol === "http:" && url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
};

function parse(raw: string | undefined): ContentState {
  let o: Partial<ContentState> = {};
  try { o = raw ? (JSON.parse(raw) as Partial<ContentState>) : {}; } catch { /* use defaults */ }
  const strs = (a: unknown, max: number) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === "string").slice(-max) : []);
  return {
    on: typeof o.on === "boolean" ? o.on : DEFAULT.on,
    // An empty list is a choice (= off); the old single "time" becomes a one-item list.
    times: Array.isArray(o.times)
      ? [...new Set(o.times.filter((t): t is string => typeof t === "string" && isClock(t)))].sort().slice(0, AUTOPOST_MAX_TIMES)
      : typeof (o as { time?: unknown }).time === "string" && isClock((o as { time: string }).time) ? [(o as { time: string }).time] : [...DEFAULT.times],
    days: Array.isArray(o.days) && o.days.some((d) => ALL_DAYS.includes(Number(d)))
      ? [...new Set(o.days.map(Number).filter((d) => ALL_DAYS.includes(d)))].sort()
      : [...ALL_DAYS],
    news: NEWS_PER_DAY.includes(Number(o.news)) ? Number(o.news) : DEFAULT.news,
    designerDays: DESIGNER_EVERY.includes(Number(o.designerDays)) ? Number(o.designerDays) : DEFAULT.designerDays,
    lastDesigner: typeof o.lastDesigner === "string" ? o.lastDesigner : null,
    feeds: Array.isArray(o.feeds)
      ? o.feeds.filter((f): f is Feed => !!f && typeof f.name === "string" && typeof f.url === "string" && feedUrlOk(f.url)).slice(0, 12).map((f) => ({ name: f.name.slice(0, 60), url: f.url.slice(0, 300), on: f.on !== false }))
      : DEFAULT.feeds,
    pending: Array.isArray(o.pending) ? o.pending.filter((p) => p && typeof p.id === "string" && (p.kind === "news" || p.kind === "designer")).slice(0, 60) : [],
    seen: strs(o.seen, 800),
    rejected: strs(o.rejected, 1000),
  };
}

export const getContent = () => readSetting(KEY, parse);
export const updateContent = (change: (s: ContentState) => void) => casUpdate(KEY, parse, change);

const idOf = (key: string) => crypto.createHash("sha1").update(key).digest("hex").slice(0, 8);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---------------- picking ---------------- */

const DAY = 24 * 60 * 60 * 1000;

/** New items from the chosen feeds: not offered before, not already on the site, newest first, one feed after another. */
export async function pickNews(st: ContentState, n: number): Promise<NewsOffer[]> {
  if (n <= 0) return [];
  const feeds = st.feeds.filter((f) => f.on);
  const fetched = await Promise.all(feeds.map(async (f) => ({ f, items: await fetchFeed(f.url) })));
  const known = new Set([...st.seen, ...st.pending.flatMap((p) => (p.news ? [p.news.link] : []))]);
  const onSite = new Set((await db.article.findMany({ where: { sourceUrl: { not: null } }, select: { sourceUrl: true } })).map((a) => a.sourceUrl!));
  const fresh = (i: FeedItem) => !known.has(i.link) && !onSite.has(i.link) && i.title.length >= 8 && (!i.date || Date.now() - i.date.getTime() < 14 * DAY) && /^https?:\/\//.test(i.link);
  const queues = fetched.map(({ f, items }) => ({
    f,
    items: items.filter(fresh).sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)),
  }));
  const out: NewsOffer[] = [];
  for (let round = 0; out.length < n && queues.some((q) => q.items.length > round); round++) {
    for (const q of queues) {
      const i = q.items[round];
      if (!i || out.length >= n) continue;
      out.push({ title: i.title, link: i.link, source: q.f.name, excerpt: shorten(i.excerpt, 280), date: i.date?.toISOString() ?? null });
    }
  }
  return out;
}

function shuffled<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const seedNames = () => (process.env.CONTENT_SEED_NAMES ? process.env.CONTENT_SEED_NAMES.split(",").map((s) => s.trim()).filter(Boolean) : shuffled(SEED_NAMES));

/** One well-known designer not on the site yet, verified on Wikidata. Names that turn out not to be
 * designers are remembered (never looked up again); an unreachable Wikidata is not held against a name. */
export async function pickDesigner(st: ContentState): Promise<{ facts: DesignerFacts; portrait: Portrait | null } | null> {
  const have = new Set((await db.designer.findMany({ select: { wikidataId: true, name: true } })).flatMap((d) => [d.wikidataId, norm(d.name)]));
  const waiting = new Set(st.pending.flatMap((p) => (p.designer ? [p.designer.facts.wikidataId, norm(p.designer.facts.name)] : [])));
  const skip = new Set(st.rejected.map((r) => (/^Q\d+$/.test(r) ? r : norm(r))));
  const names = seedNames().filter((n) => !skip.has(norm(n)) && !have.has(norm(n)) && !waiting.has(norm(n)));
  const bad: string[] = [];
  let found: { facts: DesignerFacts; portrait: Portrait | null } | null = null;
  try {
    for (const name of names.slice(0, 5)) {
      const facts = await findDesigner(name);
      if (!facts) { bad.push(name); continue; }
      if (have.has(facts.wikidataId) || waiting.has(facts.wikidataId) || skip.has(facts.wikidataId)) continue;
      found = { facts, portrait: facts.imageFile ? await portraitInfo(facts.imageFile) : null };
      break;
    }
  } catch (e) {
    if (!(e instanceof WikiUnavailable)) throw e;
  }
  if (bad.length) await updateContent((s) => { s.rejected.push(...bad.filter((b) => !s.rejected.includes(b))); });
  return found;
}

/* ---------------- offers ---------------- */

const yearsOf = (f: Pick<DesignerFacts, "born" | "died">) => (f.born ? `${f.born}–${f.died ?? ""}`.replace(/–$/, "") : "");

function offerHtml(o: Offer): string {
  if (o.news) {
    const uz = o.news.uz;
    return [
      `📰 <b>Yangilik taklifi</b> · ${esc(o.news.source)}`,
      "",
      `<b>${esc((uz ?? o.news).title)}</b>`,
      (uz ?? o.news).excerpt ? esc((uz ?? o.news).excerpt) : null,
      uz ? `\n<i>Asl sarlavha: ${esc(o.news.title)}</i>` : "\n⚠️ Oʻzbekchaga tarjima qilinmadi. Matn inglizcha: saytda tahrirlab, keyin tasdiqlang.",
      `<a href="${esc(o.news.link)}">Asl maqola ↗</a>`,
    ].filter((l) => l !== null).join("\n");
  }
  const { facts: f, portrait } = o.designer!;
  return [
    "🎨 <b>Dizayner profili taklifi</b>",
    "",
    `<b>${esc(f.name)}</b>${yearsOf(f) ? ` (${yearsOf(f)})` : ""}`,
    esc([f.roles.join(", "), f.country].filter(Boolean).join(" · ")),
    f.knownFor.length ? esc(`Mashhur ishlari: ${f.knownFor.slice(0, 4).join(", ")}`) : null,
    portrait ? esc(`Rasm: ${portrait.credit}`) : "Rasm: yoʻq (erkin litsenziyali rasm topilmadi)",
    f.wikiUrl ? `<a href="${esc(f.wikiUrl)}">Wikipedia ↗</a>` : null,
  ].filter((l) => l !== null).join("\n");
}

const offerKeyboard = (o: Offer): Keyboard => o.news && !o.news.uz ? [
  [{ text: "✏️ Tahrirlash va tasdiqlash", url: siteLink("/admin/content#offers") }],
  [{ text: "❌ Kerak emas", callback_data: `cs:r:${o.id}` }],
] : [
  [{ text: "✅ Sayt + kanal", callback_data: `cs:a:${o.id}` }, { text: "🌐 Faqat sayt", callback_data: `cs:s:${o.id}` }],
  [{ text: "📣 Faqat kanal", callback_data: `cs:c:${o.id}` }, { text: "❌ Kerak emas", callback_data: `cs:r:${o.id}` }],
];

async function sendOffer(o: Offer, admins: { chatId: string }[]): Promise<Msg[]> {
  const msgs: Msg[] = [];
  const photo = o.designer?.portrait?.thumb ?? null;
  for (const a of admins) {
    const r = await (photo ? sendPhotoOrText(a.chatId, photo, offerHtml(o), offerKeyboard(o)) : sendMessage(a.chatId, offerHtml(o), offerKeyboard(o))).catch(() => null);
    if (r?.ok) msgs.push({ chatId: a.chatId, messageId: (r.result as { message_id: number }).message_id });
    await pause(40);
  }
  return msgs;
}

export type ContentResult = { news: number; designers: number; reason?: "off" | "noadmins" | "notdue" | "busy" | "full" };

/** The daily offers (at the set time, once a day; `force` = the admin's "now"). */
export async function runContentScout({ force = false } = {}): Promise<ContentResult> {
  const st = await getContent();
  // CONTENT_SCOUT=off keeps the scheduled run quiet (the test suites that aren't about it).
  if (!force && (!st.on || st.times.length === 0 || process.env.CONTENT_SCOUT === "off")) return { news: 0, designers: 0, reason: "off" };
  const { admins } = await getTgState();
  if (!force && admins.length === 0) return { news: 0, designers: 0, reason: "noadmins" };
  const day = tashkentDay();
  if (!force) {
    // Same schedule as the font posts: each time of each chosen weekday is claimed once.
    const due = dueSlots({ on: true, times: st.times, days: st.days, lastAt: null, skip: [] });
    if (due.length === 0) return { news: 0, designers: 0, reason: "notdue" };
    let claimed = false;
    for (const slot of due) {
      claimed = await db.loginAttempt.create({ data: { key: slot.key.replace(/^autopost:/, "cscout:"), count: 1 } }).then(() => true, () => false);
      if (claimed) break;
    }
    if (!claimed) return { news: 0, designers: 0, reason: "busy" };
  }
  const cutoff = Date.now() - PENDING_DAYS * DAY;
  const cur = await updateContent((s) => { s.pending = s.pending.filter((p) => Date.parse(p.at) > cutoff); });
  const room = PENDING_MAX - cur.pending.length;
  if (room <= 0) return { news: 0, designers: 0, reason: "full" };

  const offers: Offer[] = [];
  const news = await pickNews(cur, Math.min(cur.news, room));
  for (const n of news) n.uz = (await translateNews({ title: n.title, excerpt: n.excerpt })) ?? undefined;
  for (const n of news) offers.push({ id: idOf(n.link), kind: "news", at: new Date().toISOString(), msgs: [], news: n });
  const due = cur.designerDays > 0 && (force || !cur.lastDesigner || (Date.parse(`${day}T12:00:00+05:00`) - Date.parse(`${cur.lastDesigner}T12:00:00+05:00`)) / DAY >= cur.designerDays);
  if (due && offers.length < room) {
    const d = await pickDesigner(cur);
    if (d) offers.push({ id: idOf(d.facts.wikidataId), kind: "designer", at: new Date().toISOString(), msgs: [], designer: d });
  }
  for (const o of offers) o.msgs = await sendOffer(o, admins);
  await updateContent((s) => {
    for (const o of offers) if (!s.pending.some((x) => x.id === o.id)) s.pending.push(o);
    s.seen.push(...offers.flatMap((o) => (o.news ? [o.news.link] : [])));
    s.seen = s.seen.slice(-800);
    if (offers.some((o) => o.kind === "designer")) s.lastDesigner = day;
  });
  return { news: offers.filter((o) => o.kind === "news").length, designers: offers.filter((o) => o.kind === "designer").length };
}

/* ---------------- putting it on the site and in the channel ---------------- */

function refresh(paths: string[]) {
  revalidateTag(CATALOG_TAG);
  for (const p of ["/", "/blog", "/dizaynerlar", "/dizaynerlar/profil", "/admin/content", ...paths]) revalidatePath(p);
}

export type Published = { ok: true; kind: "news" | "designer"; slug: string; path: string; title: string; posted: boolean } | { ok: false; reason: "exists" | "failed" };

async function articleSlug(title: string, link: string): Promise<string> {
  const base = slugify(title).slice(0, 60).replace(/-+$/, "") || "yangilik";
  const slug = `${base}-${shortHash(link)}`;
  return (await db.article.findUnique({ where: { slug }, select: { id: true } })) ? `${slug}-${Date.now().toString(36)}` : slug;
}

export async function publishNews(n: NewsOffer, edited?: UzText): Promise<{ slug: string; draft: PostDraft } | null> {
  if (await db.article.findFirst({ where: { sourceUrl: n.link }, select: { id: true } })) return null;
  const txt = edited ?? n.uz ?? { title: n.title, excerpt: n.excerpt };
  const slug = await articleSlug(n.title, n.link);
  const excerpt = shorten(txt.excerpt, 240);
  const translated = txt.title !== n.title;
  await db.article.create({
    data: {
      slug, type: "news", title: txt.title, excerpt: excerpt || null,
      body: `${txt.excerpt}\n\n${translated ? `*Asl sarlavhasi: ${n.title.replace(/[*_\[\]]/g, "")}*\n\n` : ""}**Manba:** [${n.source}](${n.link}). Maqolaning toʻliq matni va rasmlari manba saytida.`,
      author: "Feekr", tags: "yangilik,dizayn", sourceName: n.source, sourceUrl: n.link, isPublished: true, publishedAt: new Date(),
    },
  });
  refresh([`/blog/${slug}`]);
  return {
    slug,
    draft: {
      kind: "news", ref: slug, title: txt.title, image: null,
      caption: [txt.title, "", txt.excerpt, "", `Manba: ${n.source}`, "#dizayn #yangilik #feekr"].filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n"),
      keyboard: [[{ text: "Feekr’da oʻqish", url: siteLink(`/blog/${slug}`, "channel") }, { text: "Asl maqola ↗", url: n.link }]],
      backHref: "/admin/content",
    },
  };
}

/** The channel post without a site page: the buttons point at the source only. */
function channelOnlyDraft(o: Offer, edited?: UzText): PostDraft {
  if (o.news) {
    const n = o.news;
    const txt = edited ?? n.uz ?? { title: n.title, excerpt: n.excerpt };
    return {
      kind: "news", ref: `ch-${shortHash(n.link)}`, title: txt.title, image: null,
      caption: [txt.title, "", txt.excerpt, "", `Manba: ${n.source}`, "#dizayn #yangilik #feekr"].join("\n").replace(/\n{3,}/g, "\n\n"),
      keyboard: [[{ text: "Asl maqola ↗", url: n.link }]], backHref: "/admin/content",
    };
  }
  const f = o.designer!.facts, portrait = o.designer!.portrait;
  const keyboard: Keyboard = f.wikiUrl ? [[{ text: "Wikipedia ↗", url: f.wikiUrl }]] : [];
  return {
    kind: "designer", ref: `ch-${f.slug}`, title: f.name, image: portrait?.thumb ?? null,
    caption: [`${f.name}${yearsOf(f) ? ` (${yearsOf(f)})` : ""}`, "", designerSummary(f).replace(/^[^—]*—\s*/, "").trim(), portrait ? `\nRasm: ${portrait.credit} · Wikimedia Commons` : "", "\n#dizayner #feekr"].join("\n").replace(/\n{3,}/g, "\n\n"),
    keyboard, backHref: "/admin/content",
  };
}

export async function publishDesigner(o: NonNullable<Offer["designer"]>): Promise<{ slug: string; draft: PostDraft } | null> {
  const f = o.facts;
  if (await db.designer.findFirst({ where: { OR: [{ wikidataId: f.wikidataId }, { slug: f.slug }] }, select: { id: true } })) return null;
  const image = o.portrait ? await savePortrait(o.portrait, f.slug) : null;
  const summary = designerSummary(f);
  try {
    await db.designer.create({
      data: {
        slug: f.slug, name: f.name, wikidataId: f.wikidataId, summary, born: f.born, died: f.died, country: f.country,
        roles: f.roles.join(", "), knownFor: JSON.stringify(f.knownFor.map((label) => ({ label }))), wikiUrl: f.wikiUrl, website: f.website,
        image, imageCredit: image ? o.portrait!.credit : null, imageSource: image ? o.portrait!.source || null : null,
      },
    });
  } catch {
    return null; // the same person added at the same moment
  }
  refresh([`/dizaynerlar/profil/${f.slug}`]);
  const keyboard: Keyboard = [[{ text: "Profilni koʻrish", url: siteLink(`/dizaynerlar/profil/${f.slug}`, "channel") }]];
  if (f.wikiUrl) keyboard.push([{ text: "Wikipedia ↗", url: f.wikiUrl }]);
  return {
    slug: f.slug,
    draft: {
      kind: "designer", ref: f.slug, title: f.name, image: absoluteImage(image),
      caption: [`${f.name}${yearsOf(f) ? ` (${yearsOf(f)})` : ""}`, "", summary.replace(/^[^—]*—\s*/, "").trim(), image ? `\nRasm: ${o.portrait!.credit} · Wikimedia Commons` : "", "\n#dizayner #feekr"].join("\n").replace(/\n{3,}/g, "\n\n"),
      keyboard, backHref: "/admin/content",
    },
  };
}

const markOffer = async (o: Offer, keyboard: Keyboard) => {
  for (const m of o.msgs) {
    await tg("editMessageReplyMarkup", { chat_id: m.chatId, message_id: m.messageId, reply_markup: { inline_keyboard: keyboard } }).catch(() => null);
  }
};
const done = (text: string): Keyboard => [[{ text, callback_data: "cs:n:0" }]];

export type Decision = "both" | "site" | "channel" | "reject";

/** ✅ / ❌ from Telegram or the admin page. The offer leaves the waiting list first (one winner for a double press). */
export async function decideContent(id: string, how: Decision, edited?: UzText): Promise<{ offer: Offer | null; result: Published | null }> {
  let taken: Offer | null = null;
  await updateContent((s) => {
    taken = s.pending.find((p) => p.id === id) ?? null;
    s.pending = s.pending.filter((p) => p.id !== id);
    if (taken && (how === "reject" || how === "channel")) s.rejected.push(taken.designer ? taken.designer.facts.wikidataId : taken.news!.link);
  });
  const o = taken as Offer | null;
  if (!o) return { offer: null, result: null };
  if (how === "reject") {
    await markOffer(o, done("❌ Rad etildi"));
    return { offer: o, result: null };
  }
  if (how === "channel") {
    // Channel only: nothing is added to the site, so the buttons lead to the source.
    const draft = channelOnlyDraft(o, edited);
    const ok = (await postDraft(draft, draft.caption).catch(() => ({ ok: false as const }))).ok;
    if (!ok) {
      await updateContent((s) => {
        s.rejected = s.rejected.filter((r) => r !== (o.designer ? o.designer.facts.wikidataId : o.news!.link));
        if (!s.pending.some((x) => x.id === o.id)) s.pending.push(o);
      });
      await markOffer(o, offerKeyboard(o));
      return { offer: o, result: { ok: false, reason: "failed" } };
    }
    await markOffer(o, done("✅ Kanalda"));
    return { offer: o, result: { ok: true, kind: o.kind, slug: "", path: "", title: draft.title, posted: true } };
  }
  await markOffer(o, done("⏳ Saytga qoʻshilmoqda…"));
  const made = await (o.news ? publishNews(o.news, edited) : publishDesigner(o.designer!)).catch(() => undefined);
  if (made === undefined) {
    // Something broke while saving: back on the list, with its buttons.
    await updateContent((s) => { if (!s.pending.some((x) => x.id === o.id)) s.pending.push(o); });
    await markOffer(o, offerKeyboard(o));
    return { offer: o, result: { ok: false, reason: "failed" } };
  }
  if (made === null) {
    await markOffer(o, done("Bu allaqachon saytda bor"));
    return { offer: o, result: { ok: false, reason: "exists" } };
  }
  const path = o.news ? `/blog/${made.slug}` : `/dizaynerlar/profil/${made.slug}`;
  let posted = false;
  if (how === "both") posted = (await postDraft(made.draft, made.draft.caption).catch(() => ({ ok: false as const }))).ok;
  void submitIndexNow([path]).catch(() => null);
  await markOffer(o, [[{ text: posted ? "✅ Saytda va kanalda · koʻrish" : "✅ Saytda · koʻrish", url: siteLink(path) }]]);
  return { offer: o, result: { ok: true, kind: o.kind, slug: made.slug, path, title: made.draft.title, posted } };
}

export async function handleContentCallback(q: CallbackQuery): Promise<void> {
  if (!(await adminPress(q))) return;
  const m = /^cs:([asrc]):([0-9a-f]{8})$/.exec(q.data ?? "");
  if (!m) {
    await answer(q.id, "");
    return;
  }
  const how: Decision = m[1] === "a" ? "both" : m[1] === "s" ? "site" : m[1] === "c" ? "channel" : "reject";
  if (how !== "reject") {
    const cur = (await getContent()).pending.find((p) => p.id === m[2]);
    if (cur?.news && !cur.news.uz) {
      await answer(q.id, "Avval saytda tahrirlang");
      return;
    }
  }
  await answer(q.id, how === "reject" ? "Rad etildi" : how === "channel" ? "Kanalga chiqarilmoqda…" : "Saytga qoʻshilmoqda…");
  const { offer, result } = await decideContent(m[2], how);
  if (!offer) {
    await setKeyboard(q, done("Bu taklif koʻrib chiqilgan"));
    return;
  }
  if (how === "reject" || !result) return;
  const chat = String(q.from.id);
  if (result.ok && how === "channel") {
    await sendMessage(chat, `📣 <b>${esc(result.title)}</b> kanalga chiqdi (saytga qoʻshilmadi).`).catch(() => null);
  } else if (result.ok) {
    await sendMessage(chat, `✅ <b>${esc(result.title)}</b> saytga qoʻshildi${result.posted ? " va kanalga chiqdi" : how === "both" ? ", lekin kanalga chiqmadi (kanal ulanganini tekshiring)" : ""}.`, [[{ text: "Saytda koʻrish", url: siteLink(result.path) }]]).catch(() => null);
  } else if (result.reason === "failed") {
    await sendMessage(chat, "⚠️ Saqlashda xatolik: taklif roʻyxatda qoldi, keyinroq qayta bosing.").catch(() => null);
  }
}

/* ---------------- by hand (admin page) ---------------- */

/** Add a designer the admin picked from the search results. */
export async function addDesignerById(qid: string, how: "site" | "both"): Promise<Published> {
  let facts: DesignerFacts | null = null;
  try { facts = await designerFacts(qid); } catch { return { ok: false, reason: "failed" }; }
  if (!facts) return { ok: false, reason: "failed" };
  const portrait = facts.imageFile ? await portraitInfo(facts.imageFile) : null;
  const made = await publishDesigner({ facts, portrait });
  if (!made) return { ok: false, reason: "exists" };
  const path = `/dizaynerlar/profil/${made.slug}`;
  const posted = how === "both" ? (await postDraft(made.draft, made.draft.caption).catch(() => ({ ok: false as const }))).ok : false;
  void submitIndexNow([path]).catch(() => null);
  return { ok: true, kind: "designer", slug: made.slug, path, title: facts.name, posted };
}
