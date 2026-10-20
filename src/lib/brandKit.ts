// "Brend palitrasi": five colours and two fonts of our library for a kind of business and a mood.
// The ready library (BrandKit rows) was written once by Claude and checked by code; the rule-based
// generator below needs no AI at all, so the page never depends on the API key or its money.
import { db } from "./db";
import { ai } from "./ai";
import { PUBLIC_FAMILY } from "./license";

export const INDUSTRIES: [string, string][] = [
  ["kafe", "Kafe va qahvaxona"], ["restoran", "Restoran va oshxona"], ["oziq", "Oziq-ovqat va doʻkon"], ["it", "IT va startap"], ["ilova", "Mobil ilova"],
  ["bolalar", "Bolalar uchun"], ["gozallik", "Goʻzallik va salon"], ["moda", "Kiyim va moda"], ["qurilish", "Qurilish va ta’mirlash"], ["talim", "Taʼlim va kurslar"],
  ["tibbiyot", "Tibbiyot va salomatlik"], ["sport", "Sport va fitnes"], ["avto", "Avto va transport"], ["tadbir", "Toʻy va tadbirlar"], ["sanat", "San’at va galereya"],
  ["foto", "Foto va video"], ["moliya", "Bank va moliya"], ["kochmas", "Koʻchmas mulk"], ["turizm", "Turizm va mehmonxona"], ["konsalting", "Konsalting va huquq"],
];
export const MOODS: [string, string][] = [
  ["jiddiy", "Jiddiy va ishonchli"], ["quvnoq", "Quvnoq va yorqin"], ["hashamatli", "Hashamatli"], ["tinch", "Tinch va yumshoq"], ["jasur", "Jasur va kuchli"],
  ["zamonaviy", "Zamonaviy"], ["milliy", "Milliy va anʼanaviy"], ["nafis", "Nafis va ayollarcha"], ["energik", "Energik"], ["minimal", "Minimal"],
];
export const industryLabel = (id: string) => INDUSTRIES.find(([k]) => k === id)?.[1] ?? id;
export const moodLabel = (id: string) => MOODS.find(([k]) => k === id)?.[1] ?? id;
export const isIndustry = (v: string) => INDUSTRIES.some(([k]) => k === v);
export const isMood = (v: string) => MOODS.some(([k]) => k === v);

/* ---------------- colour maths ---------------- */

export type Kit = { bg: string; text: string; primary: string; accent: string; soft: string };
export const ROLES = ["bg", "text", "primary", "accent", "soft"] as const;
export const ROLE_LABEL: Record<(typeof ROLES)[number], string> = { bg: "Fon", text: "Matn", primary: "Asosiy", accent: "Urgʻu", soft: "Yumshoq" };

export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const rgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = (h: string) => { const [r, g, b] = rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** OKLab (a perceptual colour space): distance there is roughly "how different do they look". */
function oklab(h: string): [number, number, number] {
  const [r, g, b] = rgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function distance(a: string, b: string): number {
  const [p, q] = [oklab(a), oklab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
export function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return `#${hex2(f(0) * 255)}${hex2(f(8) * 255)}${hex2(f(4) * 255)}`;
}
export function toHsl(h: string): [number, number, number] {
  const [r, g, b] = rgb(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hue * 60 + 360) % 360, s, l];
}

/** Text on the fon must read well; the main colour must show against the fon; no two roles may look the same. */
export function kitProblems(k: Kit): string | null {
  if (!ROLES.every((r) => isHex(k[r]))) return "rang formati";
  if (contrast(k.text, k.bg) < 4.5) return "matn kontrasti";
  if (contrast(k.primary, k.bg) < 3) return "asosiy rang fonda koʻrinmaydi";
  if (distance(k.primary, k.accent) < 0.1) return "asosiy va urgʻu oʻxshash";
  if (distance(k.bg, k.soft) < 0.03) return "fon va yumshoq rang bir xil";
  if (distance(k.bg, k.primary) < 0.15) return "fon va asosiy rang oʻxshash";
  return null;
}

/** How alike two kits look: the smallest difference of their three loudest colours. Below ~0.09 they are "the same". */
export function kitDistance(a: Kit, b: Kit): number {
  return distance(a.primary, b.primary) + distance(a.accent, b.accent) * 0.6 + distance(a.bg, b.bg) * 0.8;
}
export const MIN_KIT_DISTANCE = 0.2;

/** Text colour that reads on a swatch (for labels). */
export const readableOn = (bg: string) => (contrast("#ffffff", bg) >= contrast("#0e0e0d", bg) ? "#ffffff" : "#0e0e0d");

/* ---------------- fonts ---------------- */

// A mood leans towards some categories for the heading and a quiet one for the text.
const HEAD: Record<string, string[]> = {
  jiddiy: ["Serif", "Sans"], quvnoq: ["Display", "Script"], hashamatli: ["Serif", "Script"], tinch: ["Sans", "Serif"], jasur: ["Display", "Slab"],
  zamonaviy: ["Sans", "Display"], milliy: ["Serif", "Display"], nafis: ["Script", "Serif"], energik: ["Display", "Sans"], minimal: ["Sans"],
};
const BODY: Record<string, string[]> = { Serif: ["Sans"], Sans: ["Serif", "Sans"], Display: ["Sans", "Serif"], Script: ["Sans"], Slab: ["Sans"], Monospace: ["Sans"] };

type Fam = { slug: string; category: string; hasCyrillic: boolean; popularity: number; styleCount: number };
let famCache: { at: number; rows: Fam[] } | null = null;
async function families(): Promise<Fam[]> {
  if (famCache && Date.now() - famCache.at < 5 * 60_000) return famCache.rows;
  const rows = await db.family.findMany({ where: PUBLIC_FAMILY, select: { slug: true, category: true, hasCyrillic: true, popularity: true, styleCount: true, hasLatin: true }, orderBy: { popularity: "desc" }, take: 400 });
  famCache = { at: Date.now(), rows: rows.filter((r) => r.hasLatin) };
  return famCache.rows;
}
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A heading and a text font for the mood. `used`: how often each pair was handed out already, so pairs spread out. */
export async function pickFonts(mood: string, seed: string, used: Map<string, number> = new Map()): Promise<{ headingSlug: string; bodySlug: string } | null> {
  const all = await families();
  let heads = all.filter((f) => (HEAD[mood] ?? ["Sans"]).includes(f.category) && f.styleCount >= 2);
  if (!heads.length) heads = all; // a small library: any font beats none
  if (!heads.length) return null;
  let best: { h: Fam; b: Fam; score: number } | null = null;
  // A few seeded candidates, the least used pair wins: deterministic, but the same fonts do not repeat.
  for (let i = 0; i < 12; i++) {
    const h = heads[(hash(`${seed}h${i}`) % Math.min(heads.length, 60))];
    let bodies = all.filter((f) => (BODY[h.category] ?? ["Sans"]).includes(f.category) && f.slug !== h.slug && f.styleCount >= 3 && (!h.hasCyrillic || f.hasCyrillic));
    if (!bodies.length) bodies = all.filter((f) => f.slug !== h.slug);
    if (!bodies.length) continue;
    const b = bodies[hash(`${seed}b${i}`) % Math.min(bodies.length, 25)];
    const score = (used.get(`${h.slug}+${b.slug}`) ?? 0) * 10 + (used.get(h.slug) ?? 0) + i * 0.01 + (h.hasCyrillic ? 0 : 0.5);
    if (!best || score < best.score) best = { h, b, score };
  }
  return best ? { headingSlug: best.h.slug, bodySlug: best.b.slug } : null;
}

/* ---------------- no-AI generator ---------------- */

// A starting hue per kind of business and a character per mood: enough to give sensible, different palettes.
const HUE: Record<string, number> = { kafe: 28, restoran: 12, oziq: 95, it: 220, ilova: 255, bolalar: 45, gozallik: 330, moda: 350, qurilish: 30, talim: 205, tibbiyot: 170, sport: 8, avto: 215, tadbir: 320, sanat: 280, foto: 240, moliya: 200, kochmas: 150, turizm: 190, konsalting: 225 };
const CHAR: Record<string, { s: number; l: number; dark: boolean }> = {
  jiddiy: { s: 0.5, l: 0.28, dark: false }, quvnoq: { s: 0.85, l: 0.5, dark: false }, hashamatli: { s: 0.45, l: 0.3, dark: true }, tinch: { s: 0.3, l: 0.45, dark: false },
  jasur: { s: 0.8, l: 0.42, dark: true }, zamonaviy: { s: 0.65, l: 0.45, dark: false }, milliy: { s: 0.6, l: 0.34, dark: false }, nafis: { s: 0.4, l: 0.6, dark: false },
  energik: { s: 0.95, l: 0.5, dark: false }, minimal: { s: 0.12, l: 0.22, dark: false },
};
const SCHEMES = [150, 180, 30, 210, 120] as const; // accent turns away from the main hue by these degrees

/** Nudge a colour's lightness until it passes `min` contrast against `against` (or give up at the extremes). */
function settle(color: string, against: string, min: number): string {
  const [h, s, l] = toHsl(color);
  const darker = luminance(against) > 0.4;
  for (let i = 0; i < 40; i++) {
    const c = hsl(h, s, Math.max(0.02, Math.min(0.98, l + (darker ? -1 : 1) * i * 0.02)));
    if (contrast(c, against) >= min) return c;
  }
  return darker ? "#0e0e0d" : "#ffffff";
}

/** A palette from a base colour (or the kind of business), a mood and a variant number: always valid, never AI. */
export function ruleKit(industry: string, mood: string, variant = 0, baseHex?: string): Kit {
  const c = CHAR[mood] ?? CHAR.zamonaviy;
  let [bh, bs, bl] = baseHex && isHex(baseHex) ? toHsl(baseHex) : [((HUE[industry] ?? 200) + variant * 37) % 360, c.s, c.l];
  if (baseHex && bs < 0.15) { bh = ((HUE[industry] ?? 200) + variant * 37) % 360; bs = 0.5; } // grey, black, white: give it a hue
  const hue = bh, sat = Math.max(0.1, bs), light = baseHex ? bl : c.l;
  const turn = SCHEMES[variant % SCHEMES.length];
  const bg = c.dark ? hsl(hue, Math.min(0.3, sat * 0.4), 0.1) : hsl(hue, Math.min(0.25, sat * 0.35), mood === "tinch" || mood === "nafis" ? 0.95 : 0.97);
  const dark = luminance(bg) < 0.4;
  let primary = settle(hsl(hue, sat, Math.max(0.3, Math.min(0.62, light))), bg, 3.2);
  let accent = settle(hsl((hue + turn) % 360, Math.max(0.6, Math.min(1, sat + 0.1)), dark ? 0.62 : 0.5), bg, 3);
  const text = settle(hsl(hue, 0.2, dark ? 0.94 : 0.12), bg, 7);
  let soft = hsl(hue, Math.min(0.5, sat * 0.6), dark ? 0.2 : 0.9);
  // Repair what the rules still object to: a few small, targeted nudges (never a random retry).
  for (let i = 0; i < 6; i++) {
    const kit = { bg, text, primary, accent, soft };
    const problem = kitProblems(kit);
    if (!problem) break;
    if (problem.includes("yumshoq")) soft = hsl(hue, Math.min(0.5, sat * 0.6 + 0.05), Math.max(0.03, Math.min(0.97, toHsl(bg)[2] + (dark ? 0.09 : -0.09))));
    else if (problem.includes("urgʻu")) accent = settle(hsl((hue + 180 + i * 20) % 360, 0.75, dark ? 0.64 : 0.46), bg, 3);
    else if (problem.includes("fon va asosiy") || problem.includes("koʻrinmaydi")) primary = settle(hsl(hue, Math.max(0.5, sat), dark ? 0.66 : 0.3), bg, 4.5);
    else if (problem.includes("kontrast")) break;
  }
  return { bg, text, primary, accent, soft };
}

/* ---------------- the library ---------------- */

export type StoredKit = { id: number; industry: string; mood: string; name: string; note: string; kit: Kit; headingSlug: string; bodySlug: string };
const parse = (r: { id: number; industry: string; mood: string; name: string; note: string; colors: string; headingSlug: string; bodySlug: string }): StoredKit | null => {
  try {
    const k = JSON.parse(r.colors) as Kit;
    return ROLES.every((x) => isHex(k[x])) ? { id: r.id, industry: r.industry, mood: r.mood, name: r.name, note: r.note, kit: k, headingSlug: r.headingSlug, bodySlug: r.bodySlug } : null;
  } catch { return null; }
};

export async function kitsFor(industry: string | null, mood: string | null, take = 12, rotate = true): Promise<StoredKit[]> {
  const rows = await db.brandKit.findMany({ where: { ...(industry ? { industry } : {}), ...(mood ? { mood } : {}) }, orderBy: { id: "asc" }, take: 60 });
  const ok = rows.flatMap((r) => { const k = parse(r); return k ? [k] : []; });
  // A rotating start so repeat visitors see other templates first.
  const start = rotate && ok.length ? Math.floor(Date.now() / 3_600_000) % ok.length : 0;
  return [...ok.slice(start), ...ok.slice(0, start)].slice(0, take);
}
export async function kitById(id: number): Promise<StoredKit | null> {
  const r = await db.brandKit.findUnique({ where: { id } });
  return r ? parse(r) : null;
}
export async function libraryCount(): Promise<{ total: number; byIndustry: Map<string, number> }> {
  const g = await db.brandKit.groupBy({ by: ["industry"], _count: { _all: true } });
  return { total: g.reduce((a, r) => a + r._count._all, 0), byIndustry: new Map(g.map((r) => [r.industry, r._count._all])) };
}

/* ---------------- filling the library with Claude ---------------- */

const SYSTEM = `You are a brand designer making ready colour palettes for small businesses in Uzbekistan.
For ONE kind of business you get a list of moods. For EACH mood make ONE palette of five hex colours with roles: bg (page background), text (body text, must read well on bg), primary (brand colour, clearly visible on bg), accent (a second, contrasting highlight), soft (a quiet tint for cards).
Make the palettes truly different from each other: different hue families, different light and dark backgrounds; avoid always using blue and avoid grey-only palettes. Use the local feel where it fits the mood (for example turquoise, ceramic blues, saffron, pomegranate red, cotton white for "milliy"). Give each a short evocative Uzbek name (2 to 3 words, Latin script, oʻ gʻ with U+02BB) and one Uzbek sentence (up to 90 characters) about when it suits.
Answer with JSON only: [{"mood":"…","name":"…","note":"…","bg":"#rrggbb","text":"#rrggbb","primary":"#rrggbb","accent":"#rrggbb","soft":"#rrggbb"}]`;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

export type RawKit = { mood: string; name: string; note: string } & Kit;
export function parseKits(raw: string): RawKit[] {
  const m = /\[[\s\S]*\]/.exec(raw);
  if (!m) return [];
  try {
    return (JSON.parse(m[0]) as Record<string, unknown>[]).flatMap((o) => {
      const k = { bg: String(o.bg ?? "").toLowerCase(), text: String(o.text ?? "").toLowerCase(), primary: String(o.primary ?? "").toLowerCase(), accent: String(o.accent ?? "").toLowerCase(), soft: String(o.soft ?? "").toLowerCase() };
      const mood = clip(o.mood, 20), name = clip(o.name, 40), note = clip(o.note, 110);
      if (!isMood(mood) || name.length < 3 || /<|>|https?:/.test(name + note) || kitProblems(k)) return [];
      return [{ mood, name, note, ...k }];
    });
  } catch { return []; }
}

/** One Claude call: a palette for every mood of the kind of business with the fewest kits. Returns how many were kept. */
export async function fillOnce(): Promise<{ made: number; total: number; detail?: string }> {
  const { total, byIndustry } = await libraryCount();
  const industry = [...INDUSTRIES].sort((a, b) => (byIndustry.get(a[0]) ?? 0) - (byIndustry.get(b[0]) ?? 0))[0][0];
  const existing = (await db.brandKit.findMany({ where: { industry }, select: { colors: true, name: true } })).flatMap((r) => { try { return [{ kit: JSON.parse(r.colors) as Kit, name: r.name }]; } catch { return []; } });
  const round = Math.floor(existing.length / MOODS.length);
  const r = await ai({
    task: "palette", system: SYSTEM, effort: "low", maxTokens: 3500, timeoutMs: 45_000,
    user: JSON.stringify({ industry: industryLabel(industry), round: round + 1, moods: MOODS.map(([k, v]) => ({ mood: k, meaning: v })), already_used_names: existing.map((e) => e.name).slice(-40), note: round ? "Previous rounds exist: choose clearly different hues and styles from the usual ones." : "" }),
  });
  if (!r.ok) return { made: 0, total, detail: r.detail };
  const all = await db.brandKit.findMany({ select: { colors: true, headingSlug: true, bodySlug: true } });
  const known: Kit[] = all.flatMap((x) => { try { return [JSON.parse(x.colors) as Kit]; } catch { return []; } });
  const used = new Map<string, number>();
  for (const x of all) { for (const k of [`${x.headingSlug}+${x.bodySlug}`, x.headingSlug]) used.set(k, (used.get(k) ?? 0) + 1); }
  let made = 0;
  for (const raw of parseKits(r.text)) {
    const kit: Kit = { bg: raw.bg, text: raw.text, primary: raw.primary, accent: raw.accent, soft: raw.soft };
    if (known.some((o) => kitDistance(o, kit) < MIN_KIT_DISTANCE)) continue; // too alike to an existing one
    const f = await pickFonts(raw.mood, `${industry}${raw.mood}${raw.name}`, used);
    if (!f) continue;
    await db.brandKit.create({ data: { industry, mood: raw.mood, name: raw.name, note: raw.note, colors: JSON.stringify(kit), headingSlug: f.headingSlug, bodySlug: f.bodySlug } });
    known.push(kit);
    used.set(`${f.headingSlug}+${f.bodySlug}`, (used.get(`${f.headingSlug}+${f.bodySlug}`) ?? 0) + 1);
    used.set(f.headingSlug, (used.get(f.headingSlug) ?? 0) + 1);
    made++;
  }
  return { made, total: total + made, detail: made ? undefined : "yangi shablon qabul qilinmadi (oʻxshash yoki kontrast past)" };
}

/** What the admin set: filling on or off and how many templates to aim for. */
export type FillState = { on: boolean; target: number };
export async function getFill(): Promise<FillState> {
  try {
    const row = await db.setting.findUnique({ where: { key: "brand-fill" } });
    const v = row ? (JSON.parse(row.value) as Partial<FillState>) : {};
    return { on: typeof v.on === "boolean" ? v.on : true, target: Number.isInteger(v.target) && v.target! >= 20 && v.target! <= 1000 ? v.target! : 500 };
  } catch { return { on: true, target: 500 }; }
}
export const saveFill = (s: FillState) => db.setting.upsert({ where: { key: "brand-fill" }, update: { value: JSON.stringify(s) }, create: { key: "brand-fill", value: JSON.stringify(s) } });

/** Called by the 5-minute cron: one batch per tick until the target is reached. */
export async function runBrandFill(): Promise<{ made: number; reason?: string }> {
  const f = await getFill();
  if (!f.on || process.env.BRAND_FILL === "off") return { made: 0, reason: "off" };
  const { total } = await libraryCount();
  if (total >= f.target) return { made: 0, reason: "done" };
  const r = await fillOnce();
  return { made: r.made, reason: r.detail };
}
