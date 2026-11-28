// More work for Claude: original Uzbek sayings for the poster quotes, a one-line fact about the
// font behind a channel quiz answer, and a weekly article draft that the admin approves in Telegram.
// Everything is written from our own database or free invention that the admin looks at first.
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { ai } from "./ai";
import { db } from "./db";
import { PUBLIC_FAMILY } from "./license";
import { CATEGORY_LABEL } from "./fonts";
import { MOODS, QUOTE_MAX, cleanQuote, type Mood } from "./quotes";
import { ALL_DAYS, getTgState, isClock } from "./tgState";
import { dueSlots } from "./tgAutopost";
import { absoluteImage, esc, pause, sendMessage, siteLink, type Keyboard } from "./telegram";
import { answer, adminPress, setKeyboard, type CallbackQuery } from "./tgAdmin";
import { submitIndexNow } from "./indexnow";
import { translateSoon } from "./articleRu";

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    return row ? (JSON.parse(row.value) as T) : fallback;
  } catch {
    return fallback;
  }
}
const writeSetting = (key: string, v: unknown) => {
  const value = JSON.stringify(v);
  return db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
};
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const badText = (s: string) => /https?:|www\.|<|>|#\w|[\u{1F300}-\u{1FAFF}]/u.test(s);

/* ---------------- 7. original quotes ---------------- */

export type QuoteDraft = { id: string; text: string; mood: Mood };
const QD = "ai-quote-drafts";
export const readQuoteDrafts = () => readSetting<QuoteDraft[]>(QD, []).then((a) => (Array.isArray(a) ? a : []));

const QUOTE_SYSTEM = `You write short original sayings in Uzbek for a font website's Telegram posters.
Write 8 NEW sayings, 2 for each mood: hikmat (wisdom and learning), mehr (kindness, friendship, homeland), gayrat (effort, courage, work), hayot (life, patience, time).
Rules: Uzbek Latin script with oʻ gʻ (U+02BB) and tutuq ʼ; each at most 110 characters, one sentence, warm and simple; in the spirit of a proverb but NOT a copy of a real proverb or of any known author; no names, no quotation marks, no emoji, no attribution; avoid clichés about fonts.
Answer with JSON only: [{"mood":"hikmat","text":"…"}]`;

export function parseQuoteDrafts(raw: string): QuoteDraft[] {
  const m = /\[[\s\S]*\]/.exec(raw);
  if (!m) return [];
  try {
    return (JSON.parse(m[0]) as Record<string, unknown>[]).flatMap((o) => {
      const mood = o?.mood as Mood;
      const text = cleanQuote(clip(o?.text, QUOTE_MAX));
      if (!MOODS.includes(mood) || text.length < 12 || text.length > 140 || badText(text)) return [];
      return [{ id: `q${crypto.randomBytes(4).toString("hex")}`, text, mood }];
    }).slice(0, 8);
  } catch { return []; }
}

export async function draftQuotes(): Promise<{ made: number; detail?: string }> {
  const r = await ai({ task: "quote", system: QUOTE_SYSTEM, user: "Yangi 8 ta ibora yoz.", maxTokens: 1500, effort: "low", timeoutMs: 60_000 });
  if (!r.ok) return { made: 0, detail: r.detail };
  const got = parseQuoteDrafts(r.text);
  if (!got.length) return { made: 0, detail: "javob kutilgan koʻrinishda emas" };
  await writeSetting(QD, [...got, ...(await readQuoteDrafts())].slice(0, 24));
  return { made: got.length };
}
export const dropQuoteDraft = async (id: string) => { await writeSetting(QD, (await readQuoteDrafts()).filter((d) => d.id !== id)); };

/* ---------------- 8. a fact under the quiz answer ---------------- */

const FACTS = "ai-facts";
const FACT_SYSTEM = `You write ONE short fun line in Uzbek (Latin, oʻ gʻ with U+02BB) about a font, for under a quiz answer in a Telegram channel.
Use only the facts given (JSON). Never invent a year, a designer, a story or a famous use. If the facts are thin, say something simple and true: its category, how many styles it has, whether it supports Cyrillic.
At most 120 characters, no emoji, no link, no hashtag, no quotation marks. Answer with the line only.`;

/** The cached line for a family, or one new Haiku call. null when there is none (the post goes out without it). */
export async function fontFact(slug: string): Promise<string | null> {
  const cache = await readSetting<Record<string, string>>(FACTS, {});
  if (cache[slug]) return cache[slug];
  const f = await db.family.findFirst({ where: { slug, ...PUBLIC_FAMILY }, select: { name: true, category: true, styleCount: true, hasCyrillic: true, hasItalic: true, glyphs: true, designer: true, manufacturer: true } });
  if (!f) return null;
  const r = await ai({ task: "fact", model: "haiku", system: FACT_SYSTEM, user: JSON.stringify({ ...f, category: CATEGORY_LABEL[f.category] ?? f.category }), maxTokens: 300, timeoutMs: 20_000 });
  if (!r.ok) return null;
  const line = clip(r.text.replace(/^["“«]|["”»]$/g, ""), 130);
  if (line.length < 15 || badText(line)) return null;
  const entries = Object.entries({ ...cache, [slug]: line }).slice(-300);
  await writeSetting(FACTS, Object.fromEntries(entries)).catch(() => null);
  return line;
}

/* ---------------- 3. weekly article drafts ---------------- */

export type ArticleAuto = { on: boolean; day: number; time: string; used: string[] };
const AA = "ai-articles";
const AA_DEFAULT: ArticleAuto = { on: false, day: 3, time: "11:00", used: [] };
export async function getArticleAuto(): Promise<ArticleAuto> {
  const v = await readSetting<Partial<ArticleAuto>>(AA, {});
  return {
    on: typeof v.on === "boolean" ? v.on : AA_DEFAULT.on,
    day: ALL_DAYS.includes(Number(v.day)) ? Number(v.day) : AA_DEFAULT.day,
    time: typeof v.time === "string" && isClock(v.time) ? v.time : AA_DEFAULT.time,
    used: Array.isArray(v.used) ? v.used.filter((x): x is string => typeof x === "string").slice(-80) : [],
  };
}
export const saveArticleAuto = (a: ArticleAuto) => writeSetting(AA, a);

type Topic = { id: string; title: string; where: Record<string, unknown>; note: string };
const TOPICS: Topic[] = [
  { id: "cyr", title: "Kirill alifbosini qoʻllaydigan shriftlar", where: { hasCyrillic: true }, note: "Shriftlar kirill harflarini qoʻllaydi: oʻzbek kirill matnlari uchun mos." },
  { id: "serif", title: "Uzun matn uchun serif shriftlar", where: { category: "Serif" }, note: "Serif shriftlar: kitob va uzun maqolalar uchun." },
  { id: "display", title: "Sarlavha va afisha uchun display shriftlar", where: { category: "Display" }, note: "Display shriftlar: katta oʻlchamda sarlavhalar uchun." },
  { id: "sans", title: "Interfeys va veb uchun sans shriftlar", where: { category: "Sans" }, note: "Sans shriftlar: sayt va ilova interfeysi uchun." },
  { id: "script", title: "Qoʻlyozma uslubidagi shriftlar", where: { category: "Script" }, note: "Qoʻlyozma shriftlar: taklifnoma va logotiplar uchun." },
  { id: "mono", title: "Dasturchilar uchun monospace shriftlar", where: { category: "Monospace" }, note: "Monospace shriftlar: kod yozish uchun." },
  { id: "new", title: "Saytga yangi qoʻshilgan shriftlar", where: { isNew: true }, note: "Yaqinda qoʻshilgan shriftlar." },
];

/** Design themes for the weekly article: graphic, web, UI and mobile design. `cat`: fonts of this category may be named as examples. */
type Theme = { id: string; title: string; cat?: string };
const THEMES: Theme[] = [
  { id: "t-grid", title: "Setka tizimi: Shveytsariya uslubidan zamonaviy veb-dizaynga", cat: "Sans" },
  { id: "t-bauhaus", title: "Bauhaus nima berdi: zamonaviy dizaynning birinchi qadamlari", cat: "Sans" },
  { id: "t-hierarchy", title: "UI dizaynda tipografik ierarxiya: sarlavha, matn va izoh", cat: "Sans" },
  { id: "t-tap", title: "Mobil ilovada tugma va teginish maydoni oʻlchamlari" },
  { id: "t-contrast", title: "Rang kontrasti va oʻqilishi: WCAG qoidalari oddiy tilda" },
  { id: "t-responsive", title: "Responsiv dizayn asoslari: har ekranga mos sahifa" },
  { id: "t-logo", title: "Logotip yaratish bosqichlari: brifdan tayyor belgigacha", cat: "Display" },
  { id: "t-system", title: "Dizayn tizimi nima va kichik jamoaga u nima uchun kerak" },
  { id: "t-dark", title: "Qorongʻi rejim dizayni: oddiy ranglarni teskari qilish yetmaydi" },
  { id: "t-onboarding", title: "Ilovaga kirish ekranlari (onboarding): foydalanuvchini qanday yoʻqotmaslik kerak" },
  { id: "t-poster", title: "Plakat kompozitsiyasi: diqqatni qanday boshqarish mumkin", cat: "Display" },
  { id: "t-cyrillic", title: "Lotin va kirill aralash matnda tipografiya: oʻzbek dizaynerlari uchun maslahatlar", cat: "Sans" },
  { id: "t-whitespace", title: "Boʻsh joy (white space) dizaynning eng kuchli vositasi" },
  { id: "t-forms", title: "Forma dizayni: maydonlar, xatolar va yordamchi matnlar" },
  { id: "t-icons", title: "Ikonka toʻplamini izchil qilish: chiziq qalinligi, burchaklar, tarmoq" },
  { id: "t-speed", title: "Sayt tezligi va dizayn: shrift va rasmlar qanday ta’sir qiladi", cat: "Sans" },
  { id: "t-motion", title: "Mikro-animatsiyalar: qachon yordam beradi, qachon xalaqit beradi" },
  { id: "t-color", title: "Brend uchun rang palitrasi tuzish: asosiy, yordamchi va holat ranglari" },
  { id: "t-portfolio", title: "Dizayner portfoliosi: nimani koʻrsatish va nimani tashlab yuborish" },
  { id: "t-ux-copy", title: "UX matnlar: tugma va xabarlarni yozishning oddiy qoidalari" },
  { id: "t-kerning", title: "Kerning, tracking va leading: harflar orasidagi masofa sirlari", cat: "Serif" },
  { id: "t-a11y", title: "Hamma uchun dizayn: ekran oʻqiydigan dasturlar va klaviatura bilan ishlash" },
];

const THEME_SYSTEM = `You write a short helpful article in Uzbek (Latin, oʻ gʻ with U+02BB) for the blog of feekrfont.uz, a free Uzbek font library whose readers are young designers (graphic, web, UI and mobile design).
You get a topic and optionally a few real fonts from our library (JSON: slug, name, category). Explain the topic with general, well-established design principles and practical advice. Never invent statistics, studies, dates, quotes, company claims or names of people; if you are not sure a fact is true, leave it out. You may mention the given fonts at most once each as examples, linked as [Name](/fonts/slug) with exactly the given slug; no other links.
Format: "TITLE: …" (up to 90 characters), "EXCERPT: …" (up to 200 characters), then "BODY:" and Markdown: short intro, 3-5 sections with "## " headings, concrete tips, a short closing. About 400-550 words. No emoji, no hashtags, no exclamation marks. Plain, friendly voice.`;

const ART_SYSTEM = `You write a short helpful article in Uzbek (Latin, oʻ gʻ with U+02BB) for the blog of feekrfont.uz, a free Uzbek font library.
You get a topic and a list of real fonts from our library (JSON: slug, name, category, styles, cyrillic, designer). Write about ONLY those fonts and only from those facts plus general typographic knowledge about the category. Never invent years, histories, awards or famous uses.
Format: a title line "TITLE: …" (up to 90 characters), then "EXCERPT: …" (up to 200 characters), then "BODY:" and the body in Markdown: a short intro, one "## " section per font (2-3 sentences, what it suits and which scripts it supports), and a closing paragraph. About 300-450 words. Link each font name once as [Name](/fonts/slug) using exactly the given slugs and no other links. No emoji, no hashtags, no exclamation marks. Plain, friendly voice.`;

export function parseArticle(raw: string, slugs: Set<string>): { title: string; excerpt: string; body: string } | null {
  const t = /TITLE:\s*(.+)/.exec(raw)?.[1], e = /EXCERPT:\s*(.+)/.exec(raw)?.[1], b = /BODY:\s*([\s\S]+)$/.exec(raw)?.[1];
  if (!t || !e || !b) return null;
  const title = clip(t, 120), excerpt = clip(e, 260), body = b.trim();
  if (title.length < 8 || body.length < 600 || body.length > 6000 || badText(title + excerpt)) return null;
  // Only links to the fonts we gave it; any other link, raw URL or HTML means the draft is not used.
  const links = [...body.matchAll(/\[[^\]]*\]\(([^)]*)\)/g)].map((m) => m[1]);
  if (links.some((l) => !/^\/fonts\/[a-z0-9-]+$/.test(l) || !slugs.has(l.slice(7)))) return null;
  if (/<[a-z/!]|https?:\/\/|www\./i.test(body.replace(/\[[^\]]*\]\([^)]*\)/g, ""))) return null;
  return { title, excerpt, body };
}

const reviewKeyboard = (id: number): Keyboard => [
  [{ text: "✅ Chop etish", callback_data: `aa:p:${id}` }, { text: "🗑 Kerak emas", callback_data: `aa:d:${id}` }],
  [{ text: "✏️ Tahrirlash", url: siteLink(`/admin/articles/${id}`) }],
];

/** One draft (unpublished) and a message to the admins. Returns the article's id or a reason. */
export async function draftArticle(): Promise<{ id?: number; reason?: string }> {
  const auto = await getArticleAuto();
  // Mostly design themes; after every three of them, one roundup of real fonts from the library.
  const mixed: ({ kind: "theme"; t: Theme } | { kind: "fonts"; t: Topic })[] = [];
  THEMES.forEach((t, i) => { mixed.push({ kind: "theme", t }); if (i % 3 === 2 && TOPICS[Math.floor(i / 3)]) mixed.push({ kind: "fonts", t: TOPICS[Math.floor(i / 3)] }); });
  const fresh = mixed.filter((m) => !auto.used.includes(m.t.id));
  const order = fresh.length ? fresh : mixed;
  const base = fresh.length ? auto.used : [];
  for (const pick of order) {
    if (pick.kind === "theme") {
      const t = pick.t;
      const ex = t.cat ? await db.family.findMany({ where: { ...PUBLIC_FAMILY, category: t.cat }, orderBy: [{ downloads: "desc" }, { popularity: "desc" }], take: 3, select: { slug: true, name: true, category: true } }) : [];
      const r = await ai({ task: "article", system: THEME_SYSTEM, user: JSON.stringify({ topic: t.title, fonts: ex }), maxTokens: 4000, effort: "medium", timeoutMs: 100_000 });
      if (!r.ok) return { reason: r.detail };
      const a = parseArticle(r.text, new Set(ex.map((f) => f.slug)));
      if (!a) return { reason: "javob kutilgan koʻrinishda emas" };
      return finishDraft(a, t.id, [...base, t.id]);
    }
    const topic = pick.t;
    const rows = await db.family.findMany({
      where: { ...PUBLIC_FAMILY, ...topic.where }, orderBy: [{ downloads: "desc" }, { popularity: "desc" }], take: 5,
      select: { slug: true, name: true, category: true, styleCount: true, hasCyrillic: true, designer: true },
    });
    if (rows.length < 3) continue;
    const r = await ai({ task: "article", system: ART_SYSTEM, user: JSON.stringify({ topic: topic.title, note: topic.note, fonts: rows.map((f) => ({ ...f, category: CATEGORY_LABEL[f.category] ?? f.category })) }), maxTokens: 4000, effort: "medium", timeoutMs: 100_000 });
    if (!r.ok) return { reason: r.detail };
    const a = parseArticle(r.text, new Set(rows.map((f) => f.slug)));
    if (!a) return { reason: "javob kutilgan koʻrinishda emas" };
    return finishDraft(a, topic.id, [...base, topic.id]);
  }
  return { reason: "mavzu qolmadi" };
}

async function finishDraft(a: { title: string; excerpt: string; body: string }, topicId: string, used: string[]): Promise<{ id?: number; reason?: string }> {
  const auto = await getArticleAuto();
  const slug = `${a.title.toLowerCase().normalize("NFKD").replace(/[ʻʼ'‘’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${crypto.randomBytes(2).toString("hex")}`;
  const art = await db.article.create({ data: { slug, type: "blog", title: a.title, excerpt: a.excerpt, body: a.body, author: "Feekr", tags: `dizayn,${topicId}`, isPublished: false } });
  await saveArticleAuto({ ...auto, used });
  const { admins } = await getTgState();
  const html = `📝 <b>Haftalik maqola qoralamasi</b>\n\n<b>${esc(a.title)}</b>\n${esc(a.excerpt)}\n\n<i>AI yozdi. Chop etishdan oldin oʻqib chiqing.</i>`;
  for (const ad of admins) { await sendMessage(ad.chatId, html, reviewKeyboard(art.id)).catch(() => null); await pause(40); }
  revalidatePath("/admin/articles");
  return { id: art.id };
}

/** Weekly, at the admin's day and time; each slot claimed once. */
export async function runArticleDraft({ force = false, now = Date.now() }: { force?: boolean; now?: number } = {}): Promise<{ made: boolean; reason?: string }> {
  const a = await getArticleAuto();
  if (!force) {
    if (!a.on || process.env.AI_ARTICLES === "off") return { made: false, reason: "off" };
    const due = dueSlots({ on: true, times: [a.time], days: [a.day], lastAt: null, skip: [] }, now);
    let claimed = false;
    for (const d of due) {
      claimed = await db.loginAttempt.create({ data: { key: d.key.replace(/^autopost:/, "aart:"), count: 1 } }).then(() => true, () => false);
      if (claimed) break;
    }
    if (!claimed) return { made: false, reason: "notdue" };
  }
  const r = await draftArticle();
  return r.id ? { made: true } : { made: false, reason: r.reason };
}

export async function handleArticleCallback(q: CallbackQuery): Promise<void> {
  if (!(await adminPress(q))) return;
  const m = /^aa:([pd]):(\d{1,9})$/.exec(q.data ?? "");
  if (!m) { await answer(q.id, ""); return; }
  const id = Number(m[2]);
  const art = await db.article.findUnique({ where: { id }, select: { slug: true, isPublished: true, type: true, tags: true } });
  if (!art || art.isPublished) { await answer(q.id, "Bu qoralama koʻrib chiqilgan"); await setKeyboard(q, [[{ text: "Koʻrib chiqilgan", callback_data: "aa:n:0" }]]); return; }
  if (m[1] === "d") {
    await db.article.delete({ where: { id } }).catch(() => null);
    await answer(q.id, "Oʻchirildi");
    await setKeyboard(q, [[{ text: "🗑 Oʻchirildi", callback_data: "aa:n:0" }]]);
    return;
  }
  await db.article.update({ where: { id }, data: { isPublished: true, publishedAt: new Date() } });
  translateSoon(id);
  for (const p of ["/", "/blog", `/blog/${art.slug}`, "/admin/articles"]) revalidatePath(p);
  void submitIndexNow([`/blog/${art.slug}`]).catch(() => null);
  await answer(q.id, "Chop etildi");
  await setKeyboard(q, [[{ text: "✅ Chop etildi · koʻrish", url: siteLink(`/blog/${art.slug}`) }]]);
}
