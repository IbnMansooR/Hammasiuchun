// The font scout: once a day the bot picks a few Google Fonts families the site doesn't have
// (Uzbek-ready ones first), sends them to the admins with a picture and ✅ / ❌ buttons, and on
// ✅ adds the family to the site (every style, with an Uzbek description from a template). From
// there the autopost queue takes it to the channel. Only OFL / Apache fonts are ever added.
import crypto from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "./db";
import { CATEGORY_LABEL } from "./fonts";
import { parseFontBuffer, safeFolder, slugify, styleSlug } from "./fontmeta";
import { coverage, gfCatalog, gfDownload, gfFamily, gfFiles, gfPage, licenceOf, type Coverage, type GfFamily } from "./googleFonts";
import { writeFont } from "./storage";
import { CATALOG_TAG } from "./stats";
import { SITE_URL } from "./site";
import { tashkentDay } from "./analytics";
import { esc, pause, sendMessage, sendPhotoOrText, siteLink, tg, type Keyboard } from "./telegram";
import { getTgState, isClock } from "./tgState";
import { adminPress, answer, setKeyboard, type CallbackQuery } from "./tgAdmin";

/* ---------------- state ---------------- */

export type ScoutPending = { id: string; family: string; at: string; cov: Coverage; msgs: { chatId: string; messageId: number }[] };
export type ScoutState = { on: boolean; perDay: number; time: string; pending: ScoutPending[]; rejected: string[]; imported: string[] };
export const SCOUT_PER_DAY = [1, 2, 3, 4, 5];
const KEY = "font-scout";
const DEFAULT: ScoutState = { on: true, perDay: 3, time: "11:00", pending: [], rejected: [], imported: [] };
const PENDING_MAX = 15;
const PENDING_DAYS = 14;

function read(v: unknown): ScoutState {
  const o = (v && typeof v === "object" ? v : {}) as Partial<ScoutState>;
  const strs = (a: unknown, max: number) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === "string").slice(-max) : []);
  return {
    on: typeof o.on === "boolean" ? o.on : DEFAULT.on,
    perDay: SCOUT_PER_DAY.includes(Number(o.perDay)) ? Number(o.perDay) : DEFAULT.perDay,
    time: typeof o.time === "string" && isClock(o.time) ? o.time : DEFAULT.time,
    pending: Array.isArray(o.pending) ? o.pending.filter((p) => p && typeof p.id === "string" && typeof p.family === "string").slice(0, 50) : [],
    rejected: strs(o.rejected, 3000),
    imported: strs(o.imported, 3000),
  };
}

function parse(value: string | undefined): ScoutState {
  try {
    return read(value ? JSON.parse(value) : null);
  } catch {
    return read(null);
  }
}

export async function getScout(): Promise<ScoutState> {
  const row = await db.setting.findUnique({ where: { key: KEY } }).catch(() => null);
  return parse(row?.value);
}

/** Saved only if nobody saved in between (else read again and redo the change): two admins
 * pressing at once can't both take the same offer, and no decision is lost. */
export async function updateScout(change: (s: ScoutState) => void): Promise<ScoutState> {
  for (let i = 0; i < 8; i++) {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    const s = parse(row?.value);
    change(s);
    const value = JSON.stringify(s);
    const saved = row
      ? (await db.setting.updateMany({ where: { key: KEY, value: row.value }, data: { value } })).count === 1
      : await db.setting.create({ data: { key: KEY, value } }).then(() => true, () => false);
    if (saved) return s;
    await pause(20 + Math.random() * 80);
  }
  throw new Error("font-scout: busy");
}

const idOf = (family: string) => crypto.createHash("sha1").update(family).digest("hex").slice(0, 8);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---------------- picking ---------------- */

/** How ready a family is for Uzbek: both alphabets with their own letters first. */
const rank = (c: Coverage) => (c.uzLatin && c.uzCyrillic ? 0 : c.uzCyrillic ? 1 : c.uzLatin ? 2 : c.cyrillic ? 3 : 4);

/** Families the site doesn't have yet (by name, hidden ones included), never rejected or waiting.
 * The likeliest few are checked on their real regular file: licence and Uzbek letters. */
export async function pickCandidates(st: ScoutState, n: number): Promise<{ f: GfFamily; cov: Coverage }[]> {
  const [catalog, fams] = await Promise.all([gfCatalog(), db.family.findMany({ select: { name: true, slug: true } })]);
  const taken = new Set([...fams.flatMap((f) => [norm(f.name), norm(f.slug)]), ...st.rejected.map(norm), ...st.imported.map(norm), ...st.pending.map((p) => norm(p.family))]);
  const pool = catalog
    .filter((f) => !taken.has(norm(f.family)))
    .sort((a, b) =>
      Number(!a.subsets.includes("cyrillic")) - Number(!b.subsets.includes("cyrillic")) ||
      Number(!a.subsets.includes("latin-ext")) - Number(!b.subsets.includes("latin-ext")) ||
      a.popularity - b.popularity)
    .slice(0, n * 4);
  const checked = await Promise.all(pool.map(async (f) => {
    const [first] = await gfFiles(f, 1).catch(() => []);
    const buf = first ? await gfDownload(first.url) : null;
    if (!buf) return { f, cov: null, bad: false }; // Google didn't answer: maybe next time
    const cov = coverage(buf);
    return cov?.latin && licenceOf(buf) ? { f, cov, bad: false } : { f, cov: null, bad: true };
  }));
  // Ones that can't be added (no licence in the file, no Latin): never offered again.
  const bad = checked.filter((c) => c.bad).map((c) => c.f.family);
  if (bad.length) await updateScout((s) => { s.rejected.push(...bad.filter((b) => !s.rejected.includes(b))); });
  return checked
    .flatMap((c) => (c.cov ? [{ f: c.f, cov: c.cov }] : []))
    .sort((a, b) => rank(a.cov) - rank(b.cov) || a.f.popularity - b.f.popularity)
    .slice(0, n);
}

/* ---------------- the description (a template, in Uzbek) ---------------- */

const WEIGHT: Record<number, string> = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };
const KIND: Record<string, string[]> = {
  Sans: ["zamonaviy va toza sans-serif", "oddiy, oʻqishli sans-serif", "betaraf va koʻp qirrali sans-serif"],
  Serif: ["klassik serifli shrift", "nafis serifli matn shrifti", "anʼanaviy ruhdagi serif"],
  Slab: ["qalin seriflari bilan kuchli slab-serif", "baquvvat slab-serif"],
  Display: ["sarlavhalar uchun koʻzga tashlanadigan display shrift", "afisha va logotiplar uchun yorqin display shrift"],
  Script: ["qoʻlyozma uslubidagi iliq shrift", "jonli, qoʻlda yozilgandek shrift"],
  Monospace: ["kod va jadvallar uchun monospace shrift"],
};
const USE: Record<string, string[]> = {
  Sans: ["Sayt, ilova va brending uchun qulay: kichik oʻlchamda ham aniq oʻqiladi.", "Interfeys, taqdimot va reklama matnlarida tartibli koʻrinadi."],
  Serif: ["Kitob, jurnal va uzun matnlarga mos: koʻzni charchatmaydi.", "Jiddiy, ishonchli ohang kerak boʻlgan loyihalarga yarashadi."],
  Slab: ["Sarlavha, plakat va qadoqlarda kuchli taassurot qoldiradi."],
  Display: ["Sarlavha, logotip va afishalarda eʼtiborni darhol tortadi.", "Katta oʻlchamda ishlatilganda oʻz xarakterini toʻliq koʻrsatadi."],
  Script: ["Taklifnoma, qadoq va ijtimoiy tarmoq postlariga iliqlik qoʻshadi.", "Shaxsiy, samimiy ohang kerak boʻlgan dizaynlarga mos."],
  Monospace: ["Har bir belgisi bir xil kenglikda: kod, jadval va texnik matnlar uchun."],
};
const pick = <T,>(list: T[], seed: string) => list[parseInt(crypto.createHash("md5").update(seed).digest("hex").slice(0, 6), 16) % list.length];

export function describe(f: GfFamily, styles: { weight: number; italic: boolean }[], cov: Coverage, licence: "OFL" | "Apache") {
  const kind = pick(KIND[f.category] ?? KIND.Sans, f.family);
  const weights = [...new Set(styles.map((s) => s.weight))].sort((a, b) => a - b);
  const italics = styles.some((s) => s.italic);
  const stylesLine = styles.length === 1
    ? `Bitta uslubda: ${WEIGHT[weights[0]] ?? weights[0]}.`
    : weights.length > 1
      ? `Oilada ${styles.length} ta uslub bor: ${WEIGHT[weights[0]] ?? weights[0]} dan ${WEIGHT[weights[weights.length - 1]] ?? weights[weights.length - 1]} gacha${italics ? ", kursivlari bilan" : ""}.`
      : `Oilada ${styles.length} ta uslub bor${italics ? ": toʻgʻri va kursiv" : ""}.`;
  const scripts = cov.cyrillic ? "Lotin va kirill yozuvlarini qoʻllaydi." : "Lotin yozuvini qoʻllaydi.";
  const uz = cov.uzLatin && cov.uzCyrillic
    ? " Oʻzbekcha oʻ, gʻ va kirilldagi ў, қ, ғ, ҳ harflari bor."
    : cov.uzLatin ? " Oʻzbekcha oʻ, gʻ harflari bor." : cov.uzCyrillic ? " Kirilldagi oʻzbekcha ў, қ, ғ, ҳ harflari bor." : "";
  const who = f.designers.length ? `${f.designers.length > 1 ? "Mualliflar" : "Muallif"}: ${f.designers.join(", ")}.` : "";
  const lic = licence === "OFL"
    ? "SIL Open Font License asosida tarqatiladi: shaxsiy va tijorat loyihalarida bepul."
    : "Apache License 2.0 asosida tarqatiladi: shaxsiy va tijorat loyihalarida bepul.";
  return {
    tagline: `${f.family} shrifti – ${kind}.`,
    description: [pick(USE[f.category] ?? USE.Sans, `${f.family}:use`), stylesLine, scripts + uz, who, `${lic} Manba: Google Fonts.`].filter(Boolean).join(" "),
  };
}

/* ---------------- adding a family ---------------- */

export type ImportResult = { ok: true; slug: string } | { ok: false; reason: "exists" | "gone" | "files" | "licence" };

export async function importFamily(name: string): Promise<ImportResult> {
  const f = await gfFamily(name);
  if (!f) return { ok: false, reason: "gone" };
  const folder = safeFolder(f.family);
  const slug = slugify(f.family);
  const clash = await db.family.findFirst({
    where: { OR: [{ slug }, { name: { equals: f.family, mode: "insensitive" } }, { folder: folder }] },
    select: { id: true },
  });
  if (clash) return { ok: false, reason: "exists" };
  const files = await gfFiles(f);
  const bufs = await Promise.all(files.map((x) => gfDownload(x.url)));
  const parts = files.map((x, i) => ({ ...x, buf: bufs[i] })).filter((p): p is typeof p & { buf: Buffer } => !!p.buf);
  if (parts.length === 0) return { ok: false, reason: "files" };
  const licence = licenceOf(parts[0].buf);
  const cov = coverage(parts[0].buf);
  if (!licence || !cov) return { ok: false, reason: "licence" };

  const base = folder.replace(/[^A-Za-z0-9]/g, "") || slug;
  const seen = new Set<string>();
  const styles = parts.flatMap((p) => {
    const style = styleSlug(p.weight, p.italic);
    if (seen.has(style)) return [];
    seen.add(style);
    let subfamily = style;
    try { subfamily = parseFontBuffer(p.buf).subfamily; } catch { /* the CSS said what it is */ }
    return [{ style, subfamily, weight: p.weight, italic: p.italic, ext: "ttf", file: `${base}-${style}.ttf`, size: p.buf.length, buf: p.buf }];
  });
  await Promise.all(styles.map((s) => writeFont(folder, s.file, s.buf)));
  const meta = parseFontBuffer(parts[0].buf);
  const { tagline, description } = describe(f, styles, cov, licence);
  await db.family.create({
    data: {
      slug, name: f.family, folder, category: f.category,
      designer: f.designers.join(", ") || meta.designer, manufacturer: meta.manufacturer, copyright: meta.copyright,
      license: licence === "OFL" ? "SIL Open Font License 1.1" : "Apache License 2.0",
      licenseUrl: licence === "OFL" ? "https://openfontlicense.org" : "https://www.apache.org/licenses/LICENSE-2.0",
      licenseClass: licence, version: meta.version, glyphs: meta.glyphs,
      hasLatin: cov.latin, hasCyrillic: cov.cyrillic, hasItalic: styles.some((s) => s.italic), styleCount: styles.length,
      tagline, description, tier: "free", isFree: true, priceCents: 0, isPublished: true, isNew: true, popularity: styles.length,
      styles: { create: styles.map(({ buf: _b, ...s }) => s) },
    },
  });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  for (const p of ["/fonts", `/fonts/${slug}`, "/", "/about", "/admin/fonts", "/admin/telegram"]) revalidatePath(p);
  return { ok: true, slug };
}

/* ---------------- offering them ---------------- */

const sign = (family: string) =>
  crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "feekr").update(`gf-preview\n${family}`).digest("base64url").slice(0, 22);

/** The candidate's picture (rendered by /api/tg-image/gf from Google's file); signed, so nobody
 * else can make the server fetch and draw fonts. */
export const previewUrl = (family: string) => `${SITE_URL}/api/tg-image/gf?${new URLSearchParams({ f: family, s: sign(family) })}`;
export function verifyPreview(family: string, s: string): boolean {
  const want = Buffer.from(sign(family));
  const got = Buffer.from(s);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

const mark = (ok: boolean) => (ok ? "✓" : "—");

function offerHtml(f: GfFamily, cov: Coverage): string {
  return [
    "🆕 <b>Yangi shrift taklifi</b> · Google Fonts",
    "",
    `<b>${esc(f.family)}</b>`,
    esc(`${CATEGORY_LABEL[f.category] ?? f.category} · ${f.variants.length} uslub · bepul (OFL/Apache)`),
    esc(`${cov.cyrillic ? "Lotin + Kirill" : "Lotin"} · oʻ gʻ ${mark(cov.uzLatin)} · ў қ ғ ҳ ${mark(cov.uzCyrillic)}`),
    f.designers.length ? esc(`Dizayner: ${f.designers.join(", ")}`) : null,
    "",
    "Saytga qoʻshilsa, kanal navbatiga ham tushadi.",
  ].filter((l) => l !== null).join("\n");
}

const offerKeyboard = (p: ScoutPending): Keyboard => [
  [{ text: "✅ Saytga qoʻshish", callback_data: `gf:a:${p.id}` }, { text: "❌ Kerak emas", callback_data: `gf:r:${p.id}` }],
  [{ text: "Google Fonts’da koʻrish", url: gfPage(p.family) }],
];

const GRACE = 6 * 60 * 60 * 1000;

export type ScoutResult = { sent: number; reason?: "off" | "noadmins" | "notdue" | "busy" | "full" | "none" };

/** Offer today's candidates (at the set time, once a day; `force` = the admin's "now", which also
 * works with no admin on Telegram: the offers wait on the admin page). */
export async function runScout({ force = false } = {}): Promise<ScoutResult> {
  const st = await getScout();
  if (!force && !st.on) return { sent: 0, reason: "off" };
  const { admins } = await getTgState();
  if (!force && admins.length === 0) return { sent: 0, reason: "noadmins" };
  if (!force) {
    const day = tashkentDay();
    const at = Date.parse(`${day}T${st.time}:00+05:00`);
    if (Date.now() < at || Date.now() - at > GRACE) return { sent: 0, reason: "notdue" };
    const claimed = await db.loginAttempt.create({ data: { key: `scout:${day}`, count: 1 } }).then(() => true, () => false);
    if (!claimed) return { sent: 0, reason: "busy" };
  }
  // Old offers nobody answered make room for new ones.
  const cutoff = Date.now() - PENDING_DAYS * 24 * 60 * 60 * 1000;
  const fresh = await updateScout((s) => { s.pending = s.pending.filter((p) => Date.parse(p.at) > cutoff); });
  const room = Math.min(fresh.perDay, PENDING_MAX - fresh.pending.length);
  if (room <= 0) return { sent: 0, reason: "full" };
  const picks = await pickCandidates(fresh, room);
  if (picks.length === 0) return { sent: 0, reason: "none" };

  const offers: ScoutPending[] = [];
  for (const { f, cov } of picks) {
    const p: ScoutPending = { id: idOf(f.family), family: f.family, at: new Date().toISOString(), cov, msgs: [] };
    for (const a of admins) {
      const r = await sendPhotoOrText(a.chatId, previewUrl(f.family), offerHtml(f, cov), offerKeyboard(p)).catch(() => null);
      if (r?.ok) p.msgs.push({ chatId: a.chatId, messageId: (r.result as { message_id: number }).message_id });
      await pause(40);
    }
    offers.push(p);
  }
  await updateScout((s) => { s.pending.push(...offers.filter((o) => !s.pending.some((x) => x.id === o.id))); });
  return { sent: offers.length };
}

/** The same buttons on every admin's copy of the offer. */
async function markOffer(p: ScoutPending, keyboard: Keyboard) {
  for (const m of p.msgs) {
    await tg("editMessageReplyMarkup", { chat_id: m.chatId, message_id: m.messageId, reply_markup: { inline_keyboard: keyboard } }).catch(() => null);
  }
}

const done = (text: string): Keyboard => [[{ text, callback_data: "gf:n:0" }]];

/** ✅ or ❌, from Telegram or the admin page. Taken off the waiting list first, so a double
 * press can't add a family twice. */
export async function decide(id: string, approve: boolean): Promise<{ family: string | null; result: ImportResult | null }> {
  let taken: ScoutPending | null = null;
  await updateScout((s) => {
    taken = s.pending.find((p) => p.id === id) ?? null;
    s.pending = s.pending.filter((p) => p.id !== id);
    if (taken && !approve) s.rejected.push(taken.family);
  });
  const p = taken as ScoutPending | null;
  if (!p) return { family: null, result: null };
  if (!approve) {
    await markOffer(p, done("❌ Rad etildi"));
    return { family: p.family, result: null };
  }
  await markOffer(p, done("⏳ Saytga qoʻshilmoqda…"));
  const result = await importFamily(p.family).catch((): ImportResult => ({ ok: false, reason: "files" }));
  if (result.ok) {
    await updateScout((s) => { s.imported.push(p.family); });
    await markOffer(p, [[{ text: "✅ Saytga qoʻshildi · koʻrish", url: siteLink(`/fonts/${result.slug}`) }]]);
  } else if (result.reason === "exists") {
    await updateScout((s) => { s.imported.push(p.family); });
    await markOffer(p, done("Bu shrift saytda allaqachon bor"));
  } else if (result.reason === "files") {
    // Files Google wouldn't give us now: back to the list, to try again.
    await updateScout((s) => { if (!s.pending.some((x) => x.id === p.id)) s.pending.push(p); });
    await markOffer(p, offerKeyboard(p));
  } else {
    // No open licence in the file, or gone from Google Fonts: never offered again.
    await updateScout((s) => { if (!s.rejected.includes(p.family)) s.rejected.push(p.family); });
    await markOffer(p, done("⚠️ Qoʻshib boʻlmadi"));
  }
  return { family: p.family, result };
}

const FAIL: Record<string, string> = {
  files: "Google fayllarni bermadi, keyinroq qayta urinib koʻring.",
  licence: "Faylda ochiq litsenziya topilmadi, qoʻshilmadi.",
  gone: "Bu shrift Google Fonts’dan olib tashlangan.",
};

export async function handleScoutCallback(q: CallbackQuery): Promise<void> {
  if (!(await adminPress(q))) return;
  const m = /^gf:([ar]):([0-9a-f]{8})$/.exec(q.data ?? "");
  if (!m) {
    await answer(q.id, "");
    return;
  }
  const approve = m[1] === "a";
  await answer(q.id, approve ? "Saytga qoʻshilmoqda…" : "Rad etildi");
  const { family, result } = await decide(m[2], approve);
  if (!family) {
    await setKeyboard(q, done("Bu taklif koʻrib chiqilgan"));
    return;
  }
  if (!approve || !result) return;
  const chat = String(q.from.id);
  if (result.ok) {
    await sendMessage(chat, `✅ <b>${esc(family)}</b> saytga qoʻshildi. Kanal navbatiga ham tushdi.`, [[
      { text: "Saytda koʻrish", url: siteLink(`/fonts/${result.slug}`) },
      { text: "Navbat", url: `${SITE_URL}/admin/telegram#auto` },
    ]]).catch(() => null);
  } else if (FAIL[result.reason]) {
    await sendMessage(chat, `⚠️ <b>${esc(family)}</b>: ${FAIL[result.reason]}`).catch(() => null);
  }
}

export { FAIL as SCOUT_FAIL };
