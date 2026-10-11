// Quotes for the first channel poster (lib/fontPoster): Uzbek proverbs and a few classic lines, each
// with a mood, so a family gets words that suit it (a script face gets kindness, a display face gets
// drive). Proverbs only where the attribution is certain: a misattributed "quote" costs trust.
// The admin can switch any of these off and add their own (Admin → Telegram → Iqtiboslar).
import { uzbekize } from "./fontSamples";

export const MOODS = ["hikmat", "mehr", "gayrat", "hayot"] as const;
export type Mood = (typeof MOODS)[number];
export const MOOD_LABEL: Record<Mood, string> = {
  hikmat: "Hikmat va ilm",
  mehr: "Mehr va doʻstlik",
  gayrat: "Gʻayrat va mehnat",
  hayot: "Hayot va sabr",
};

export type Quote = { id: string; text: string; author: string | null; mood: Mood };

const P = "Xalq maqoli";
export const BUILTIN_QUOTES: Quote[] = [
  { id: "h01", mood: "hikmat", author: P, text: "Bilagi zoʻr birni yiqar, bilimi zoʻr — mingni." },
  { id: "h02", mood: "hikmat", author: P, text: "Ilm olish — igna bilan quduq qazishdek gap." },
  { id: "h03", mood: "hikmat", author: P, text: "Aql yoshda emas, boshda." },
  { id: "h04", mood: "hikmat", author: P, text: "Yaxshi soʻz — jon ozigʻi, yomon soʻz — bosh qozigʻi." },
  { id: "h05", mood: "hikmat", author: P, text: "Oʻynab gapirsang ham, oʻylab gapir." },
  { id: "h06", mood: "hikmat", author: P, text: "Ustozni otangdek ulugʻ bil." },
  { id: "h07", mood: "hikmat", author: P, text: "Bilimli ming yashar, bilimsiz bir yashar." },
  { id: "h08", mood: "hikmat", author: P, text: "Ming marta eshitgandan bir marta koʻrgan yaxshi." },
  { id: "h09", mood: "hikmat", author: P, text: "Koʻp yashagan bilmas, koʻp koʻrgan bilar." },
  { id: "h10", mood: "hikmat", author: P, text: "Til — dil kaliti." },
  { id: "h11", mood: "hikmat", author: P, text: "Yetti oʻlchab, bir kes." },
  { id: "h12", mood: "hikmat", author: "Alisher Navoiy", text: "Tilga ixtiyorsiz — elga eʼtiborsiz." },
  { id: "h13", mood: "hikmat", author: "Abdulla Avloniy", text: "Tarbiya biz uchun yo hayot — yo mamot, yo najot — yo halokat, yo saodat — yo falokat masalasidir." },

  { id: "m01", mood: "mehr", author: P, text: "Ona yurting — oltin beshiging." },
  { id: "m02", mood: "mehr", author: P, text: "Ona yurting omon boʻlsa, rangi roʻying somon boʻlmas." },
  { id: "m03", mood: "mehr", author: P, text: "Bulbul chamanni sevar, odam — vatanni." },
  { id: "m04", mood: "mehr", author: P, text: "Doʻstsiz boshim — tuzsiz oshim." },
  { id: "m05", mood: "mehr", author: P, text: "Doʻst achitib gapirar, dushman — kuldirib." },
  { id: "m06", mood: "mehr", author: P, text: "Uzoqdagi qarindoshdan yaqindagi qoʻshni yaxshi." },
  { id: "m07", mood: "mehr", author: P, text: "Mehmon otangdan ulugʻ." },
  { id: "m08", mood: "mehr", author: P, text: "Bir kun tuz ichgan joyingga qirq kun salom ber." },
  { id: "m09", mood: "mehr", author: P, text: "Yaxshilik qil, suvga tashla: baliq bilar, baliq bilmasa — Xoliq bilar." },
  { id: "m10", mood: "mehr", author: P, text: "Oltin olma, duo ol." },
  { id: "m11", mood: "mehr", author: P, text: "Oʻz uyim — oʻlan toʻshagim." },
  { id: "m12", mood: "mehr", author: P, text: "Ot aylanib qozigʻini topar." },
  { id: "m13", mood: "mehr", author: P, text: "Yaxshi bilan yursang, yetarsan murodga, yomon bilan yursang, qolarsan uyatga." },
  { id: "m14", mood: "mehr", author: "Zahiriddin Muhammad Bobur", text: "Har kimki vafo qilsa, vafo topqusidur,\nHar kimki jafo qilsa, jafo topqusidur." },

  { id: "g01", mood: "gayrat", author: P, text: "Mehnatning tagi — rohat." },
  { id: "g02", mood: "gayrat", author: P, text: "Harakatda — barakat." },
  { id: "g03", mood: "gayrat", author: P, text: "Ishlamagan — tishlamas." },
  { id: "g04", mood: "gayrat", author: P, text: "Hunar — hunardan unar." },
  { id: "g05", mood: "gayrat", author: P, text: "Hunarli kishi xor boʻlmas." },
  { id: "g06", mood: "gayrat", author: P, text: "Yigit kishiga yetmish hunar ham oz." },
  { id: "g07", mood: "gayrat", author: P, text: "Tomchi-tomchi koʻl boʻlar." },
  { id: "g08", mood: "gayrat", author: P, text: "Bugungi ishni ertaga qoʻyma." },
  { id: "g09", mood: "gayrat", author: P, text: "Botir bir oʻlar, qoʻrqoq — ming." },
  { id: "g10", mood: "gayrat", author: P, text: "Kuch — birlikda." },
  { id: "g11", mood: "gayrat", author: P, text: "Birlashgan oʻzar, birlashmagan toʻzar." },
  { id: "g12", mood: "gayrat", author: P, text: "Koʻz qoʻrqoq, qoʻl botir." },
  { id: "g13", mood: "gayrat", author: P, text: "Nima eksang, shuni oʻrasan." },

  { id: "y01", mood: "hayot", author: P, text: "Sabrning tagi — sariq oltin." },
  { id: "y02", mood: "hayot", author: P, text: "Sabr qilsang, gʻoʻradan holva pishar." },
  { id: "y03", mood: "hayot", author: P, text: "Oz boʻlsin, soz boʻlsin." },
  { id: "y04", mood: "hayot", author: P, text: "Yaxshi niyat — yarim davlat." },
  { id: "y05", mood: "hayot", author: P, text: "Oʻzingga ravo koʻrmaganni oʻzgaga ravo koʻrma." },
  { id: "y06", mood: "hayot", author: P, text: "Suv keltirgan bir xoru, koʻza sindirgan bir aziz." },
  { id: "y07", mood: "hayot", author: P, text: "Koʻrpangga qarab oyoq uzat." },
  { id: "y08", mood: "hayot", author: P, text: "Yolgʻonning umri qisqa." },
  { id: "y09", mood: "hayot", author: P, text: "Qars ikki qoʻldan chiqadi." },
  { id: "y10", mood: "hayot", author: P, text: "Yaxshidan bogʻ qolar, yomondan — dogʻ." },
  { id: "y11", mood: "hayot", author: P, text: "Toʻgʻri soʻz — tosh yorar." },
];

/** Which moods suit a category. Symbol fonts get no quote. */
const CATEGORY_MOODS: Record<string, Mood[]> = {
  Serif: ["hikmat", "mehr"],
  Slab: ["gayrat", "hikmat"],
  Script: ["mehr"],
  Display: ["gayrat", "hayot", "mehr"],
  Sans: ["hayot", "gayrat", "hikmat"], // most public families are sans: more quotes, fewer repeats
  Monospace: ["hikmat", "hayot"],
};
export const moodsFor = (category: string): Mood[] => CATEGORY_MOODS[category] ?? [];

/** The admin's part, kept in the bot's settings row (lib/tgState). */
export type QuoteState = { custom: Quote[]; off: string[]; recent: string[] };
export const QUOTE_MAX = 220;
export const AUTHOR_MAX = 60;
export const RECENT_MAX = 40;

export const isQuoteId = (id: string) => /^[a-z0-9]{2,12}$/.test(id);

export function readQuoteState(v: unknown): QuoteState {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof QuoteState, unknown>>;
  const ids = (a: unknown, max: number) => (Array.isArray(a) ? a.filter((s): s is string => typeof s === "string" && isQuoteId(s)).slice(0, max) : []);
  const custom = Array.isArray(o.custom)
    ? o.custom.flatMap((q): Quote[] => {
        const c = q as Partial<Quote>;
        if (typeof c.id !== "string" || !isQuoteId(c.id) || typeof c.text !== "string" || !c.text.trim()) return [];
        if (!MOODS.includes(c.mood as Mood)) return [];
        return [{ id: c.id, text: c.text.slice(0, QUOTE_MAX), author: typeof c.author === "string" && c.author.trim() ? c.author.slice(0, AUTHOR_MAX) : null, mood: c.mood as Mood }];
      }).slice(0, 200)
    : [];
  return { custom, off: ids(o.off, 200), recent: ids(o.recent, RECENT_MAX) };
}

/** Admin input → a quote's text: one paragraph per line, Uzbek signs fixed, «» and spare spaces dropped. */
export function cleanQuote(raw: string): string {
  return uzbekize(raw)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/<[^>]*>/g, "").replace(/[<>«»“”"]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4)
    .join("\n")
    .slice(0, QUOTE_MAX)
    .trim();
}

/* ---------------- Uzbek Latin → Cyrillic (for Cyrillic-only fonts) ---------------- */

const L2C: Record<string, string> = {
  a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м", n: "н",
  o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", x: "х", y: "й", z: "з",
};
const DIGRAPHS: [RegExp, string][] = [
  [/oʻ/g, "ў"], [/Oʻ/g, "Ў"], [/gʻ/g, "ғ"], [/Gʻ/g, "Ғ"],
  [/sh/g, "ш"], [/S[hH]/g, "Ш"], [/ch/g, "ч"], [/C[hH]/g, "Ч"],
  [/yo/g, "ё"], [/Y[oO]/g, "Ё"], [/yu/g, "ю"], [/Y[uU]/g, "Ю"], [/ya/g, "я"], [/Y[aA]/g, "Я"], [/ye/g, "е"], [/Y[eE]/g, "Е"],
  [/ʼ/g, "ъ"],
];

export function toCyrillic(s: string): string {
  let out = s;
  for (const [re, c] of DIGRAPHS) out = out.replace(re, c);
  // e at the start of a word or after a vowel is э.
  out = out.replace(/(^|[^\p{L}]|[aiouаеиоуўэюяё])e/gu, "$1э").replace(/(^|[^\p{L}])E/gu, "$1Э");
  return [...out].map((c) => {
    const low = c.toLowerCase();
    const m = L2C[low];
    return m ? (c === low ? m : m.toUpperCase()) : c;
  }).join("");
}

/* ---------------- choosing ---------------- */

export type PickedQuote = { id: string; lines: string; author: string | null; cyrillic: boolean };

/** The text as this font can draw it: Uzbek signs and dashes fall back to plainer ones, and
 * anything else missing rules the quote out. */
function drawable(text: string, has: (c: string) => boolean): string | null {
  let t = text;
  if (!has("ʻ")) t = t.replace(/ʻ/g, has("‘") ? "‘" : "'");
  if (!has("ʼ")) t = t.replace(/ʼ/g, has("’") ? "’" : "'");
  if (!has("—")) t = t.replace(/—/g, has("–") ? "–" : "-");
  return [...t].every((c) => /\s/.test(c) || has(c)) ? t : null;
}

function fit(q: Quote, has: (c: string) => boolean, cyrillicFirst: boolean): PickedQuote | null {
  const tries = cyrillicFirst ? [true, false] : [false, true];
  for (const cyr of tries) {
    const text = drawable(cyr ? toCyrillic(q.text) : q.text, has);
    if (text) return { id: q.id, lines: text, author: q.author && (cyr ? toCyrillic(q.author) : q.author), cyrillic: cyr };
  }
  return null;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};

/** One quote as this font draws it (null when it can't, or when there's no such quote). */
export function fitQuote(st: QuoteState, id: string, has: (c: string) => boolean, cyrillicFirst: boolean): PickedQuote | null {
  const q = findQuote(st, id);
  return q ? fit(q, has, cyrillicFirst) : null;
}

export const allQuotes = (st: QuoteState): Quote[] => [...st.custom, ...BUILTIN_QUOTES];
export const findQuote = (st: QuoteState, id: string) => allQuotes(st).find((q) => q.id === id) ?? null;

/** Every quote this font can draw, the ones that suit its category first. */
export function quotesFor(st: QuoteState, category: string, has: (c: string) => boolean, cyrillicFirst: boolean) {
  const moods = moodsFor(category);
  if (moods.length === 0) return [];
  return allQuotes(st)
    .filter((q) => !st.off.includes(q.id))
    .map((q) => ({ q, fits: fit(q, has, cyrillicFirst), suits: moods.includes(q.mood) }))
    .filter((x) => x.fits)
    .sort((a, b) => Number(b.suits) - Number(a.suits));
}

/** A quote for a family. Deterministic (the admin's preview is what gets posted), but it moves on
 * after every post: quotes not used lately first, the admin's own before the built-in ones, then
 * one picked by the family and the number of posts so far. `want` is the admin's own choice. */
export function pickQuote(st: QuoteState, slug: string, category: string, has: (c: string) => boolean, cyrillicFirst: boolean, want?: string | null): PickedQuote | null {
  if (moodsFor(category).length === 0) return null;
  const chosen = want ? fitQuote(st, want, has, cyrillicFirst) : null;
  if (chosen) return chosen;
  const all = quotesFor(st, category, has, cyrillicFirst);
  const suited = all.filter((x) => x.suits);
  const pool = suited.length ? suited : all;
  if (pool.length === 0) return null;
  // Least recently used first: never used, then the one used longest ago.
  const age = (id: string) => {
    const i = st.recent.indexOf(id);
    return i < 0 ? Infinity : i;
  };
  const best = Math.max(...pool.map((x) => age(x.q.id)));
  let group = pool.filter((x) => age(x.q.id) === best);
  const own = group.filter((x) => st.custom.some((c) => c.id === x.q.id));
  if (own.length) group = own;
  return group[hash(`${slug}:${st.recent.length}:${st.recent[0] ?? ""}`) % group.length].fits;
}

export function rememberQuote(st: QuoteState, id: string): void {
  st.recent = [id, ...st.recent.filter((x) => x !== id)].slice(0, RECENT_MAX);
}
