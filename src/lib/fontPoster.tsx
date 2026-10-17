// Specimen posters for the Telegram channel, like type foundries post: a quote set in the font, a
// cover, the character set, text in sizes and the styles. 1080×1350 (4:5, what Telegram shows
// largest in a feed), rendered on request by /api/tg-image/poster and sent as one album.
import { ImageResponse } from "next/og";
import { db } from "./db";
import { CATEGORY_LABEL } from "./fonts";
import { PUBLIC_FAMILY } from "./license";
import { ogFonts } from "./og";
import { readFont } from "./storage";
import { SITE_URL } from "./site";
import { familySample, staticFont } from "./fontSamples";
import { fitQuote, isQuoteId, pickQuote, quotesFor, type Mood, type PickedQuote } from "./quotes";
import { getTgState } from "./tgState";
import { MARK, WORD } from "@/components/Logo";

export const POSTER = { width: 1080, height: 1350 };
const MAX_BYTES = 6_000_000;

type Palette = { bg: string; fg: string; muted: string; accent: string; line: string };
const PALETTES: Palette[] = [
  { bg: "#ffffff", fg: "#0e0e0d", muted: "#6b6a65", accent: "#0b7a55", line: "#e7e6e2" }, // paper
  { bg: "#0d0d0c", fg: "#f4f3ee", muted: "#9d9b94", accent: "#3ecf9e", line: "#2a2a27" }, // ink
  { bg: "#0b7a55", fg: "#ffffff", muted: "#bfe6d6", accent: "#ffffff", line: "#2f9472" }, // brand green
  { bg: "#f3efe6", fg: "#1b1a17", muted: "#77736a", accent: "#0b7a55", line: "#e2dccd" }, // cream
];

/** Same colours for every picture of a family, different from family to family. */
export function paletteFor(slug: string): Palette {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export const POSTER_KINDS = ["iqtibos", "muqova", "harflar", "matn", "uslublar"] as const;
export type PosterKind = (typeof POSTER_KINDS)[number];

/** The album, in order: the quote leads (it's what makes people stop scrolling). */
export const posterKinds = (styleCount: number, withQuote: boolean): PosterKind[] =>
  POSTER_KINDS.filter((k) => (k === "iqtibos" ? withQuote : k === "uslublar" ? styleCount >= 3 : true));

/** v (the family's last update) busts Telegram's and the CDN's caches when the font changes;
 * q is the quote, the same on every picture so each one can number itself "n / total". */
export const posterUrl = (slug: string, kind: PosterKind, v: number, q: string | null) =>
  `${SITE_URL}/api/tg-image/poster/${encodeURIComponent(slug)}/${kind}?v=${v}${q ? `&q=${q}` : ""}`;

type Drawn = { sample: { chars: string }; category: string; cyrillicOnly: boolean };
const hasIn = (chars: string) => (c: string) => chars.includes(c);

/** The quote a family's album leads with (the admin's choice when given and drawable). */
async function quoteFor(slug: string, d: Drawn, want?: string | null): Promise<PickedQuote | null> {
  const { quotes } = await getTgState();
  return pickQuote(quotes, slug, d.category, hasIn(d.sample.chars), d.cyrillicOnly, want);
}

/** The album for a family, or null when the renderer can't draw it (the single card is used then). */
export async function posterAlbum(slug: string, want?: string | null): Promise<{ urls: string[]; quote: string | null } | null> {
  const sample = await familySample(slug);
  if (!sample) return null;
  const f = await db.family.findFirst({
    where: { ...PUBLIC_FAMILY, slug },
    select: { styleCount: true, updatedAt: true, category: true, hasLatin: true, hasCyrillic: true },
  });
  if (!f) return null;
  const quote = await quoteFor(slug, { sample, category: f.category, cyrillicOnly: !f.hasLatin && f.hasCyrillic }, want);
  const v = Math.floor(f.updatedAt.getTime() / 1000);
  return { urls: posterKinds(f.styleCount, !!quote).map((k) => posterUrl(slug, k, v, quote?.id ?? null)), quote: quote?.id ?? null };
}

/** Quotes the admin can choose from for a family's first poster (the ones that suit it first). */
export async function posterQuoteOptions(slug: string): Promise<{ id: string; text: string; author: string | null; mood: Mood; suits: boolean }[]> {
  const sample = await familySample(slug);
  if (!sample) return [];
  const f = await db.family.findFirst({ where: { ...PUBLIC_FAMILY, slug }, select: { category: true, hasLatin: true, hasCyrillic: true } });
  if (!f) return [];
  const { quotes } = await getTgState();
  return quotesFor(quotes, f.category, hasIn(sample.chars), !f.hasLatin && f.hasCyrillic)
    .map(({ q, suits }) => ({ id: q.id, text: q.text, author: q.author, mood: q.mood, suits }));
}

/* ---------------- fitting a text ---------------- */

type Measure = (s: string, size: number) => number;

/** Words in lines no wider than `width`; a dash stays with the word before it. */
function wrap(paras: string[], size: number, width: number, measure: Measure): string[] | null {
  const out: string[] = [];
  for (const p of paras) {
    const words: string[] = [];
    for (const w of p.split(" ").filter(Boolean)) {
      if (/^[—–-]$/.test(w) && words.length) words[words.length - 1] += ` ${w}`;
      else words.push(w);
    }
    let line = "";
    for (const w of words) {
      if (measure(w, size) > width) return null;
      const next = line ? `${line} ${w}` : w;
      if (line && measure(next, size) > width) {
        out.push(line);
        line = w;
      } else line = next;
    }
    if (line) out.push(line);
  }
  return out;
}

/** Narrowest measure that keeps a paragraph on the same number of lines (like `text-wrap: balance`). */
function balance(para: string, size: number, width: number, measure: Measure): string[] {
  const lines = wrap([para], size, width, measure) ?? [para];
  let best = lines;
  for (let w = width - 8; w >= width * 0.4; w -= 8) {
    const l = wrap([para], size, w, measure);
    if (!l || l.length !== lines.length) break;
    best = l;
  }
  return best;
}

/** Size and lines for a text in a box. Bigger is better, but not at the price of a stub line in
 * the middle ("O‘z uyim — / o‘lan / to‘shagim."): each layout is scored by its size times how even
 * its lines are (a paragraph's last line may be short). */
export function fitText(text: string, measure: Measure, box: { width: number; height: number; max: number; min: number; lh: number }) {
  const paras = text.split("\n");
  let best: { size: number; lines: string[]; score: number } | null = null;
  for (let size = box.max; size >= box.min; size -= 2) {
    const greedy = wrap(paras, size, box.width, measure);
    if (!greedy || greedy.length * size * box.lh > box.height) continue;
    const parts = paras.map((p) => balance(p, size, box.width, measure));
    const widths = parts.flatMap((l) => l.map((x) => measure(x, size)));
    const inner = parts.flatMap((l) => l.slice(0, -1).map((x) => measure(x, size)));
    const even = inner.length ? Math.min(...inner) / Math.max(...widths) : 1;
    const score = size * Math.sqrt(even);
    if (!best || score > best.score) best = { size, lines: parts.flat(), score };
  }
  return best ?? { size: box.min, lines: wrap(paras, box.min, box.width, measure) ?? paras };
}

/** Line height from the ink of this very text (tallest letter to deepest descender), so tall
 * script faces don't collide and fonts with roomy metrics (Thai, say) don't drift apart. */
function lineHeight(data: Buffer, text: string, min: number, max: number): number {
  const f = staticFont(data);
  if (!f) return min;
  try {
    let top = 0;
    let bottom = 0;
    for (const g of f.layout(text.replace(/\s+/g, "")).glyphs) {
      top = Math.max(top, g.bbox.maxY);
      bottom = Math.min(bottom, g.bbox.minY);
    }
    const h = (top - bottom) / f.unitsPerEm + 0.05;
    return Number.isFinite(h) ? Math.min(max, Math.max(min, h)) : min;
  } catch {
    return min;
  }
}

function measurer(data: Buffer): Measure {
  const font = staticFont(data);
  const cache = new Map<string, number>();
  return (s, size) => {
    let units = cache.get(s);
    if (units === undefined) {
      try {
        units = font ? font.layout(s).advanceWidth / font.unitsPerEm : s.length * 0.6;
      } catch {
        units = s.length * 0.6;
      }
      cache.set(s, units);
    }
    return units * size;
  };
}

/* ---------------- texts ---------------- */

const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOW = "abcdefghijklmnopqrstuvwxyz";
const CYR_UP = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЪЬЭЮЯ";
const CYR_LOW = "абвгдеёжзийклмнопрстуфхцчшъьэюя";

function texts(has: (c: string) => boolean, cyrillicOnly: boolean) {
  const a = has("ʻ") ? "ʻ" : "‘";
  const dash = has("—") ? "—" : "-";
  if (cyrillicOnly) {
    return {
      headline: `Ўзбекистон ${dash} ғоялар, қуёш ва шрифтлар юрти`,
      body: `Яхши шрифт ўзини кўрсатмайди ${dash} у матнни ўқишни енгиллаштиради. Ҳарфлар орасидаги масофа, сўзлар ритми ва сатрлар оралиғи биргаликда саҳифага овоз беради.`,
      short: "Шрифт — бренд овози",
    };
  }
  return {
    headline: `O${a}zbekiston ${dash} g${a}oyalar, quyosh va shriftlar yurti`,
    body: `Yaxshi shrift o${a}zini ko${a}rsatmaydi ${dash} u matnni o${a}qishni yengillashtiradi. Harflar orasidagi masofa, so${a}zlar ritmi va satrlar oralig${a}i birgalikda sahifaga ovoz beradi.`,
    short: `Shrift ${dash} brendning ovozi`,
  };
}

/** Name size that fits ~920 px: wide names get smaller. */
const nameSize = (name: string, max: number) => Math.max(64, Math.min(max, Math.floor(1700 / Math.max(4, name.length))));

/* ---------------- the frame ---------------- */

function Frame({ p, n, total, children }: { p: Palette; n: number; total: number; children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: p.bg, color: p.fg, padding: "64px 72px 56px", fontFamily: "Feekr Sans" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <svg width="186" height="48" viewBox="0 0 3877 1001">
          <path fill={p.bg === "#0b7a55" ? "#ffffff" : "#009A76"} fillRule="evenodd" d={MARK} />
          <path fill={p.fg} fillRule="evenodd" d={WORD} />
        </svg>
        <div style={{ display: "flex", padding: "8px 20px", border: `2px solid ${p.fg}`, borderRadius: 999, fontSize: 22, fontWeight: 600, letterSpacing: 2 }}>
          BEPUL SHRIFT
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", minHeight: 0 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${p.line}`, paddingTop: 24, fontSize: 24, color: p.muted }}>
        <span style={{ fontWeight: 600, color: p.fg }}>feekrfont.uz</span>
        <span>{`${n} / ${total}`}</span>
      </div>
    </div>
  );
}

const Label = ({ p, children }: { p: Palette; children: string }) => (
  <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 2, color: p.muted, marginBottom: 10 }}>{children.toUpperCase()}</div>
);

/* ---------------- rendering ---------------- */

type Cut = { style: string; weight: number; italic: boolean; file: string; ext: string; size: number; subfamily: string | null };

export async function renderPoster(slug: string, kind: PosterKind, q: string | null): Promise<ArrayBuffer | null> {
  const sample = await familySample(slug);
  if (!sample) return null;
  const fam = await db.family.findFirst({
    where: { ...PUBLIC_FAMILY, slug },
    select: { name: true, category: true, styleCount: true, hasLatin: true, hasCyrillic: true, designer: true, folder: true,
      styles: { select: { style: true, weight: true, italic: true, file: true, ext: true, size: true, subfamily: true }, orderBy: [{ italic: "asc" }, { weight: "asc" }] } },
  });
  if (!fam) return null;
  const has = (c: string) => sample.chars.includes(c);
  const cyrillicOnly = !fam.hasLatin && fam.hasCyrillic;
  const quote = q && isQuoteId(q) ? fitQuote((await getTgState()).quotes, q, has, cyrillicOnly) : null;
  const kinds = posterKinds(fam.styleCount, !!quote);
  if (!kinds.includes(kind)) return null;
  const n = kinds.indexOf(kind) + 1;

  const [base, main] = await Promise.all([ogFonts(), readFont(sample.folder, sample.file)]);
  if (!main) return null;
  const p = paletteFor(slug);
  const measure = measurer(main);
  const t = texts(has, cyrillicOnly);
  const S = "Specimen, Feekr Sans";
  const total = kinds.length;
  const only = (s: string) => [...s].filter((c) => c === " " || c === "\n" || has(c)).join("");
  const fonts = [...base, { name: "Specimen", data: main, weight: 400 as const, style: "normal" as const }];
  const meta = [
    CATEGORY_LABEL[fam.category] ?? fam.category,
    `${fam.styleCount} uslub`,
    [fam.hasLatin && "Lotin", fam.hasCyrillic && "Kirill"].filter(Boolean).join(" + "),
  ].filter(Boolean).join("  ·  ");

  let body: React.ReactNode;
  let extraFonts: { name: string; data: Buffer; weight: 400; style: "normal" }[] = [];

  if (kind === "iqtibos" && quote) {
    // The quote as large as it fits, lines balanced; the font's own quotation mark when it has one.
    const lh = lineHeight(main, quote.lines, 1.08, 1.5);
    const fit = fitText(quote.lines, measure, { width: 900, height: 720, max: 150, min: 40, lh });
    const mark = has("“") ? "“" : has("«") ? "«" : null;
    const dash = !quote.cyrillic || has("—") ? "—" : "–";
    const nameInFont = [...fam.name].every((c) => c === " " || has(c));
    body = (
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", height: 120, overflow: "hidden", fontFamily: mark ? S : "Feekr Display", fontSize: 220, lineHeight: 1, color: p.accent }}>
            {mark ?? "“"}
          </div>
          {fit.lines.map((l, i) => (
            <div key={i} style={{ display: "flex", fontFamily: S, fontSize: fit.size, lineHeight: lh, whiteSpace: "pre" }}>{l}</div>
          ))}
          {quote.author && (
            <div style={{ display: "flex", fontFamily: quote.cyrillic ? S : "Feekr Sans", fontSize: 30, color: p.muted, marginTop: 40 }}>
              {`${dash} ${quote.author}`}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 28 }}>
          <span style={{ fontSize: 24, color: p.muted }}>Shrift:</span>
          <span style={{ fontFamily: nameInFont ? S : "Feekr Sans", fontSize: 48, lineHeight: 1.1 }}>{fam.name}</span>
        </div>
      </div>
    );
  } else if (kind === "muqova") {
    const aa = cyrillicOnly ? only("Аа") : only("Aa");
    body = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {aa.length === 2 && <div style={{ display: "flex", fontFamily: S, fontSize: 400, lineHeight: 1, color: p.accent, marginBottom: 24 }}>{aa}</div>}
        <div style={{ display: "flex", fontFamily: S, fontSize: nameSize(fam.name, 150), lineHeight: 1.05 }}>{fam.name}</div>
        <div style={{ display: "flex", fontSize: 30, color: p.muted, marginTop: 28 }}>{meta}</div>
        {fam.designer && <div style={{ display: "flex", fontSize: 26, color: p.muted, marginTop: 10 }}>{`Dizayner: ${fam.designer.slice(0, 60)}`}</div>}
      </div>
    );
  } else if (kind === "harflar") {
    const lat = !cyrillicOnly;
    const cyr = fam.hasCyrillic && has("Ж");
    const big = lat && cyr ? 66 : 84;
    // oʻ gʻ with whichever sign the font has; without any, just the digraphs.
    const a = ["ʻ", "‘", "'"].find(has);
    const uzLat = only([a ? `O${a} o${a} G${a} g${a}` : "", "Sh sh Ch ch", has("ʼ") ? "ʼ" : ""].filter(Boolean).join(" ")).trim();
    const uzCyr = only("Ў ў Қ қ Ғ ғ Ҳ ҳ").trim();
    const figures = only("0123456789 !?&@%").trim();
    // Wide faces shrink to the page width instead of running off it.
    const row = (s: string, size: number) => {
      const w = measure(s, size) + 2 * s.length;
      const px = w > 936 ? Math.floor((size * 936) / w) : size;
      return <div style={{ display: "flex", fontFamily: S, fontSize: px, lineHeight: 1.15, letterSpacing: 2 }}>{s}</div>;
    };
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {lat && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Label p={p}>Lotin</Label>
            {row(only(UP.slice(0, 13)), big)}
            {row(only(UP.slice(13)), big)}
            {row(only(LOW.slice(0, 13)), big)}
            {row(only(LOW.slice(13)), big)}
          </div>
        )}
        {((lat && uzLat) || (cyr && uzCyr)) && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Label p={p}>Oʻzbekcha</Label>
            {lat && uzLat && row(uzLat, big * 0.8)}
            {cyr && uzCyr && row(uzCyr, big * 0.8)}
          </div>
        )}
        {cyr && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Label p={p}>Kirill</Label>
            {row(only(CYR_UP.slice(0, 16)), big * 0.85)}
            {row(only(CYR_UP.slice(16)), big * 0.85)}
          </div>
        )}
        {figures && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Label p={p}>Raqamlar</Label>
            {row(figures, big * 0.8)}
          </div>
        )}
      </div>
    );
  } else if (kind === "matn") {
    body = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Label p={p}>Sarlavha</Label>
        <div style={{ display: "flex", fontFamily: S, fontSize: 92, lineHeight: 1.08, marginBottom: 44 }}>{t.headline}</div>
        <Label p={p}>Matn</Label>
        <div style={{ display: "flex", fontFamily: S, fontSize: 34, lineHeight: 1.5, color: p.fg }}>{t.body}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 40, borderTop: `2px solid ${p.line}`, paddingTop: 28 }}>
          {[56, 36, 24].map((px) => (
            <div key={px} style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
              <span style={{ fontSize: 20, color: p.muted, width: 60 }}>{`${px}px`}</span>
              <span style={{ fontFamily: S, fontSize: px, lineHeight: 1.2 }}>{t.short}</span>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    // Each style in its own cut (static TTF/OTF only; up to 8, every weight once per slant).
    const seen = new Set<string>();
    const cuts = (fam.styles as Cut[]).filter((c) => c.ext !== "woff2" && c.size <= MAX_BYTES).filter((c) => {
      const k = `${c.weight}-${c.italic}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 8);
    const loaded: { cut: Cut; data: Buffer }[] = [];
    for (const c of cuts) {
      const d = c.file === sample.file ? main : await readFont(fam.folder, c.file).catch(() => null);
      if (d && staticFont(d)) loaded.push({ cut: c, data: d });
    }
    extraFonts = loaded.map((l, i) => ({ name: `Cut${i}`, data: l.data, weight: 400 as const, style: "normal" as const }));
    const line = cyrillicOnly ? t.short : fam.name;
    const size = loaded.length > 6 ? 58 : loaded.length > 4 ? 68 : 80;
    body = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Label p={p}>{`${fam.styleCount} uslub`}</Label>
        {loaded.map((l, i) => (
          <div key={l.cut.style} style={{ display: "flex", flexDirection: "column", borderTop: i ? `2px solid ${p.line}` : "none", paddingTop: i ? 14 : 0, marginBottom: 14 }}>
            <span style={{ fontSize: 22, color: p.muted }}>{`${l.cut.subfamily || l.cut.style} · ${l.cut.weight}`}</span>
            <span style={{ fontFamily: `Cut${i}, Feekr Sans`, fontSize: size, lineHeight: 1.12 }}>{line}</span>
          </div>
        ))}
      </div>
    );
  }

  const render = (withExtra: boolean, content: React.ReactNode) =>
    new ImageResponse(<Frame p={p} n={n} total={total}>{content}</Frame>, {
      ...POSTER,
      fonts: withExtra ? [...fonts, ...extraFonts] : fonts,
    }).arrayBuffer();

  try {
    return await render(true, body);
  } catch {
    if (kind !== "uslublar") return null;
    // A cut the renderer can't read: list the styles in the main cut instead.
    try {
      return await render(false, (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Label p={p}>{`${fam.styleCount} uslub`}</Label>
          {(fam.styles as Cut[]).slice(0, 10).map((c) => (
            <div key={c.style} style={{ display: "flex", fontFamily: S, fontSize: 52, lineHeight: 1.3 }}>{c.subfamily || c.style}</div>
          ))}
        </div>
      ));
    } catch {
      return null;
    }
  }
}
