// Shareable pictures for the bot's playful features, drawn from the site's own fonts:
//  - test:  "Qaysi shrift sensan?" result, a 9:16 story card with the person's name in their font
//  - wall:  a phone wallpaper with any short text
//  - brand: a wordmark card for a brand name
// URLs are signed (like the text samples), so only the bot can make the server draw something.
import crypto from "node:crypto";
import { ImageResponse } from "next/og";
import { ogFonts } from "./og";
import { readFont } from "./storage";
import { SITE_URL } from "./site";
import { botUsername } from "./telegram";
import { sampleFonts, type SampleFont } from "./fontSamples";
import { MARK, WORD } from "@/components/Logo";

export type CardKind = "test" | "wall" | "brand";
export const CARD_TEXT_MAX = 48;

type Palette = { bg: string; fg: string; muted: string; accent: string; chip: string };
export const PALETTES: Palette[] = [
  { bg: "#ffffff", fg: "#0e0e0d", muted: "#6b6a65", accent: "#0b7a55", chip: "#e5f3ec" }, // paper
  { bg: "#0d0d0c", fg: "#f4f3ee", muted: "#9d9b94", accent: "#3ecf9e", chip: "#1f2a25" }, // ink
  { bg: "#0b7a55", fg: "#ffffff", muted: "#bfe6d6", accent: "#ffe27a", chip: "#13926a" }, // brand green
  { bg: "#f3efe6", fg: "#1b1a17", muted: "#77736a", accent: "#c4452d", chip: "#e8e1d0" }, // cream
  { bg: "#e9defa", fg: "#2b1b4d", muted: "#6d5a99", accent: "#7b3fe4", chip: "#d9c9f5" }, // lilac
  { bg: "#ff6b4a", fg: "#fff3ee", muted: "#ffd6c9", accent: "#1a0f0b", chip: "#ff8466" }, // coral
  { bg: "#0f1b3d", fg: "#dfe8ff", muted: "#93a6d6", accent: "#6aa6ff", chip: "#1b2c5c" }, // midnight
  { bg: "#ffe27a", fg: "#1a1500", muted: "#6b5d12", accent: "#1a1500", chip: "#ffd84a" }, // butter
];
export const PALETTE_COUNT = PALETTES.length;

/** The four kinds of person the test finds, and the look of the font that fits each. */
export const TYPES = {
  K: { label: "KLASSIK", line: "Sokin, nozik va ishonchli. Gapni oz, lekin aniq aytasan.", chips: ["Nafis", "Ishonchli", "Zamonaviy emas, abadiy"], categories: ["Serif"] },
  Z: { label: "ZAMONAVIY", line: "Toza, tez va oʻylangan. Hammasi joyida bo‘lishini yoqtirasan.", chips: ["Aniq", "Tez", "Minimal"], categories: ["Sans", "Monospace"] },
  J: { label: "JASUR", line: "Baland ovozda, ranglarda va oldinda. Seni sezmaslik mumkin emas.", chips: ["Kuchli", "Yorqin", "Eslab qolinadi"], categories: ["Display", "Slab"] },
  R: { label: "ROMANTIK", line: "Qoʻl yozuvidek iliq, erkin va oʻziga xos. Hamma narsada his bor.", chips: ["Iliq", "Erkin", "Oʻziga xos"], categories: ["Script"] },
} as const;
export type TypeCode = keyof typeof TYPES;
export const isType = (c: string): c is TypeCode => c in TYPES;

const sign = (k: string, t: string, f: string, v: string) =>
  crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "feekr").update(`card\n${k}\n${t}\n${f}\n${v}`).digest("base64url").slice(0, 22);

export function cardUrl(kind: CardKind, text: string, slug: string, variant: string): string {
  const q = new URLSearchParams({ k: kind, t: text, f: slug, v: variant, s: sign(kind, text, slug, variant) });
  return `${SITE_URL}/api/tg-image/card?${q}`;
}

export function verifyCard(k: string, t: string, f: string, v: string, s: string): boolean {
  const want = Buffer.from(sign(k, t, f, v));
  const got = Buffer.from(s);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/** Size that keeps a short text on a few lines of a `width` px box. */
const fit = (len: number, max: number, min: number, width: number) => Math.max(min, Math.min(max, Math.floor((width * 1.7) / Math.max(3, len))));

const SIZES: Record<CardKind, [number, number]> = { test: [1080, 1920], wall: [1080, 2340], brand: [1080, 1080] };

function Logo({ p, w = 200 }: { p: Palette; w?: number }) {
  return (
    <svg width={w} height={Math.round((w * 1001) / 3877)} viewBox="0 0 3877 1001">
      <path fill={p.bg === "#0b7a55" ? "#ffffff" : "#009A76"} fillRule="evenodd" d={MARK} />
      <path fill={p.fg} fillRule="evenodd" d={WORD} />
    </svg>
  );
}

/** The picture, or null when the font can't draw it. `variant` is the type code (test) or palette number. */
export async function renderCard(kind: CardKind, text: string, slug: string, variant: string): Promise<Response | null> {
  const font: SampleFont | undefined = (await sampleFonts()).find((f) => f.slug === slug);
  if (!font) return null;
  const draws = (s: string) => [...s].every((c) => /\s/.test(c) || font.chars.includes(c));
  if (!draws(text)) return null;
  const [base, data] = await Promise.all([ogFonts(), readFont(font.folder, font.file)]);
  if (!data) return null;
  const [w, h] = SIZES[kind];
  const S = "Specimen, Feekr Sans";
  const nameInFont = draws(font.name);
  let tree: React.ReactNode;

  if (kind === "test") {
    const t = TYPES[(isType(variant) ? variant : "Z") as TypeCode];
    const p = PALETTES[[...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE_COUNT];
    tree = (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: p.bg, color: p.fg, padding: "110px 90px 100px", fontFamily: "Feekr Sans" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo p={p} />
          <span style={{ display: "flex", fontSize: 28, fontWeight: 600, letterSpacing: 3, padding: "10px 26px", border: `3px solid ${p.fg}`, borderRadius: 999 }}>QAYSI SHRIFT SEN?</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          <span style={{ display: "flex", fontSize: 44, color: p.muted }}>Sen shunday shriftsan:</span>
          <span style={{ display: "flex", fontFamily: S, fontSize: fit(text.length, 300, 120, 900), lineHeight: 1.02, wordBreak: "break-word", color: p.fg }}>{text}</span>
          <span style={{ display: "flex", alignSelf: "flex-start", fontSize: 34, fontWeight: 600, letterSpacing: 4, padding: "12px 28px", background: p.accent, color: p.bg === "#ffe27a" || p.bg === "#ff6b4a" ? p.bg : p.bg, borderRadius: 999 }}>{t.label}</span>
          <span style={{ display: "flex", fontFamily: "Feekr Display", fontSize: 64, lineHeight: 1.12, maxWidth: 900 }}>{t.line}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {t.chips.map((c) => <span key={c} style={{ display: "flex", fontSize: 36, padding: "10px 26px", borderRadius: 999, background: p.chip }}>{c}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, borderTop: `3px solid ${p.fg}`, paddingTop: 34 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={{ display: "flex", fontSize: 32, color: p.muted }}>Shrifting:</span>
            <span style={{ display: "flex", fontFamily: nameInFont ? S : "Feekr Display", fontSize: 64 }}>{font.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, color: p.muted }}>
            <span style={{ fontWeight: 600, color: p.fg }}>{`@${botUsername()}`}</span>
            <span>feekrfont.uz</span>
          </div>
        </div>
      </div>
    );
  } else if (kind === "wall") {
    const p = PALETTES[(Number(variant) || 0) % PALETTE_COUNT];
    tree = (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", background: p.bg, color: p.fg, padding: "300px 80px 170px", fontFamily: "Feekr Sans" }}>
        <span style={{ display: "flex", height: 6, width: 120, background: p.accent, borderRadius: 3 }} />
        <span style={{ display: "flex", textAlign: "center", justifyContent: "center", fontFamily: S, fontSize: fit(text.length, 250, 84, 880), lineHeight: 1.08, wordBreak: "break-word", maxWidth: 920 }}>{text}</span>
        <span style={{ display: "flex", fontSize: 28, letterSpacing: 2, color: p.muted }}>feekrfont.uz</span>
      </div>
    );
  } else {
    const p = PALETTES[(Number(variant) || 0) % PALETTE_COUNT];
    tree = (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: p.bg, color: p.fg, padding: "84px 84px 76px", fontFamily: "Feekr Sans" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 3, color: p.muted }}>BREND NOMI</span>
          <span style={{ display: "flex", width: 22, height: 22, borderRadius: 11, background: p.accent }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <span style={{ display: "flex", fontFamily: S, fontSize: fit(text.length, 300, 90, 900), lineHeight: 1.02, wordBreak: "break-word" }}>{text}</span>
          <span style={{ display: "flex", height: 8, width: 200, background: p.accent, borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `3px solid ${p.fg}`, paddingTop: 28, fontSize: 30 }}>
          <span style={{ display: "flex", fontFamily: nameInFont ? S : "Feekr Display", fontSize: 40 }}>{font.name}</span>
          <span style={{ display: "flex", color: p.muted }}>feekrfont.uz</span>
        </div>
      </div>
    );
  }
  const img = new ImageResponse(tree, { width: w, height: h, fonts: [...base, { name: "Specimen", data, weight: 400 as const, style: "normal" as const }] });
  try {
    const png = await img.arrayBuffer();
    return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
  } catch {
    return null;
  }
}
