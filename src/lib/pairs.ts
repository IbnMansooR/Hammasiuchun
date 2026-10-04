import { db } from "./db";
import { PUBLIC_FAMILY } from "./license";
import { CATEGORY_LABEL } from "./fonts";

export type PairSide = { slug: string; name: string; style: string; weight: number; italic: boolean };
export type Pairing = {
  id: string;
  label: string;
  heading: PairSide;
  body: PairSide;
  sampleHeading: string;
  sampleBody: string;
};

type Cut = { style: string; weight: number; italic: boolean };
type Fam = { slug: string; name: string; category: string; styles: Cut[] };

// Small example texts (heading + body), like fontshare pairs cards.
const SAMPLES: { h: string; b: string }[] = [
  { h: "Dizayn — bu ovoz", b: "Har bir harf brendingizning shaxsiyatini gapiradi. Toʻgʻri tanlangan juftlik kuchli va yodda qoladigan taassurot qoldiradi." },
  { h: "Typography Matters", b: "A great pairing balances contrast and harmony — a bold display voice for headlines with a calm, readable companion for text." },
  { h: "Sarlavha va matn", b: "Sarlavha uchun xarakterli shrift, matn uchun oʻqilishi oson shrift. Ana shu muvozanat sahifani jonlantiradi." },
  { h: "Bold meets calm", b: "Pair a confident heading with a quiet body so the eye is guided naturally, without ever feeling overwhelmed." },
  { h: "Brend uchun juftlik", b: "Ushbu kombinatsiya logotip, sarlavhalar va uzun matnlar uchun bir xilda mos keladi — universal va zamonaviy." },
  { h: "The Art of Type", b: "When two typefaces work together they complete one another — contrast in weight, harmony in rhythm and proportion." },
  { h: "Soʻz va shakl", b: "Yaxshi tipografika mazmunni kuchaytiradi. Juftlikni tanlashda kontrast va uygʻunlikni yodda tuting." },
  { h: "Clarity & Character", b: "Choose one font for personality and another for legibility. Together they make content feel intentional and clear." },
];

// (headingCategory, bodyCategory) recipes — a distinctive heading + a readable body.
const RECIPES: [string, string][] = [
  ["Serif", "Sans"],
  ["Sans", "Serif"],
  ["Display", "Sans"],
  ["Display", "Serif"],
  ["Slab", "Sans"],
  ["Sans", "Sans"],
  ["Script", "Sans"],
  ["Serif", "Serif"],
  ["Monospace", "Sans"],
  ["Display", "Sans"],
  ["Serif", "Sans"],
  ["Sans", "Display"],
];

const upright = (cuts: Cut[]) => cuts.filter((c) => !c.italic);

/** A bold, characterful cut for headings. */
function headingCut(f: Fam): Cut | null {
  const up = upright(f.styles);
  const pool = up.length ? up : f.styles;
  if (!pool.length) return null;
  const heavy = pool.filter((c) => c.weight >= 600).sort((a, b) => b.weight - a.weight)[0];
  return heavy ?? pool.slice().sort((a, b) => b.weight - a.weight)[0];
}

/** A readable ~Regular cut for body text. */
function bodyCut(f: Fam): Cut | null {
  const up = upright(f.styles);
  const pool = up.length ? up : f.styles;
  if (!pool.length) return null;
  return pool.slice().sort((a, b) => Math.abs(a.weight - 400) - Math.abs(b.weight - 400))[0];
}

export async function getPairings(): Promise<Pairing[]> {
  let pool: Fam[] = [];
  try {
    pool = await db.family.findMany({
      where: { ...PUBLIC_FAMILY, hasLatin: true, styleCount: { gte: 2 } },
      select: { slug: true, name: true, category: true, styles: { select: { style: true, weight: true, italic: true } } },
      orderBy: [{ popularity: "desc" }, { name: "asc" }],
      take: 500,
    });
  } catch {
    return [];
  }

  const byCat: Record<string, Fam[]> = {};
  for (const f of pool) (byCat[f.category] ??= []).push(f);

  const ptr: Record<string, number> = {};
  const used = new Set<string>();
  const nextFrom = (cat: string): Fam | null => {
    const list = byCat[cat] || [];
    let i = ptr[cat] ?? 0;
    while (i < list.length) {
      const f = list[i];
      i++;
      if (f && !used.has(f.slug)) { ptr[cat] = i; used.add(f.slug); return f; }
    }
    ptr[cat] = i;
    return null;
  };

  const pairings: Pairing[] = [];
  RECIPES.forEach(([hCat, bCat], i) => {
    const hf = nextFrom(hCat);
    const bf = nextFrom(bCat);
    if (!hf || !bf) return;
    const h = headingCut(hf);
    const b = bodyCut(bf);
    if (!h || !b) return;
    const s = SAMPLES[i % SAMPLES.length];
    pairings.push({
      id: `${hf.slug}__${bf.slug}`,
      label: `${CATEGORY_LABEL[hCat] ?? hCat} + ${CATEGORY_LABEL[bCat] ?? bCat}`,
      heading: { slug: hf.slug, name: hf.name, style: h.style, weight: h.weight, italic: h.italic },
      body: { slug: bf.slug, name: bf.name, style: b.style, weight: b.weight, italic: b.italic },
      sampleHeading: s.h,
      sampleBody: s.b,
    });
  });
  return pairings;
}
