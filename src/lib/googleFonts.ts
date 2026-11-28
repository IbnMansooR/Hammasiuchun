// Google Fonts as a source of new families: every family there is OFL or Apache, so it may be
// given away. The catalogue's metadata (cached), the static TTF of each style (the CSS API serves
// an old browser full TTFs, every subset included), and checks for the Uzbek letters and licence.
// The URLs can be pointed at a stand-in for tests (GF_META_URL, GF_CSS_URL).
import * as fontkit from "fontkit";
import { unstable_cache } from "next/cache";

const META_URL = process.env.GF_META_URL || "https://fonts.google.com/metadata/fonts";
const CSS_URL = process.env.GF_CSS_URL || "https://fonts.googleapis.com/css";
const MAX_FILE = 6_000_000;

export type GfFamily = {
  family: string;
  category: string; // the site's: Sans, Serif, Slab, Display, Script, Monospace
  subsets: string[];
  variants: string[]; // "400", "700i", …
  designers: string[];
  popularity: number; // 1 = most used
  dateAdded: string;
};

/** Google's categories → the site's. */
function siteCategory(category: string, stroke: string | null): string {
  if (category === "Handwriting") return "Script";
  if (category === "Monospace") return "Monospace";
  if (category === "Display") return "Display";
  if (category === "Serif") return stroke === "Slab Serif" ? "Slab" : "Serif";
  return "Sans";
}

type RawFamily = {
  family: string; category: string; stroke?: string | null; subsets?: string[]; fonts?: Record<string, unknown>;
  designers?: string[]; popularity?: number; dateAdded?: string; isNoto?: boolean; isOpenSource?: boolean; colorCapabilities?: unknown[];
};

/** Open-source, non-Noto, non-colour families that write Latin. Kept small for the cache (≈400 KB). */
export const gfCatalog = unstable_cache(
  async (): Promise<GfFamily[]> => {
    const res = await fetch(META_URL, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!res.ok) throw new Error(`Google Fonts metadata: HTTP ${res.status}`);
    const text = await res.text();
    const data = JSON.parse(text.replace(/^\)\]\}'\s*/, "")) as { familyMetadataList?: RawFamily[] };
    return (data.familyMetadataList ?? [])
      .filter((f) => f.isOpenSource !== false && !f.isNoto && !(f.colorCapabilities ?? []).length && (f.subsets ?? []).includes("latin"))
      .map((f) => ({
        family: f.family,
        category: siteCategory(f.category, f.stroke ?? null),
        subsets: (f.subsets ?? []).filter((s) => s !== "menu"),
        variants: Object.keys(f.fonts ?? {}).filter((v) => /^\d00i?$/.test(v)),
        designers: (f.designers ?? []).slice(0, 6),
        popularity: f.popularity ?? 9999,
        dateAdded: f.dateAdded ?? "",
      }))
      .filter((f) => f.variants.length > 0);
  },
  ["gf-catalog-v1"],
  { revalidate: 60 * 60 * 24 * 7 },
);

export async function gfFamily(name: string): Promise<GfFamily | null> {
  return (await gfCatalog()).find((f) => f.family === name) ?? null;
}

export type GfFile = { weight: number; italic: boolean; url: string };

/** The static TTF of each style (at most `limit`), regular first. */
export async function gfFiles(f: GfFamily, limit = 18): Promise<GfFile[]> {
  const variants = [...f.variants].sort((a, b) => Number(a.endsWith("i")) - Number(b.endsWith("i")) || parseInt(a) - parseInt(b));
  const wanted = variants.includes("400") ? ["400", ...variants.filter((v) => v !== "400")] : variants;
  const url = `${CSS_URL}?family=${encodeURIComponent(f.family).replace(/%20/g, "+")}:${wanted.slice(0, limit).join(",")}&subset=${encodeURIComponent(f.subsets.join(","))}`;
  // No browser user agent: Google then answers with whole TTF files, not WOFF2 slices.
  const res = await fetch(url, { headers: { "user-agent": "Wget/1.21" }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!res.ok) return [];
  const css = await res.text();
  const out: GfFile[] = [];
  for (const block of css.split("@font-face").slice(1)) {
    const style = /font-style:\s*(\w+)/.exec(block)?.[1];
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
    const src = /url\((https?:\/\/[^)]+\.ttf)\)/.exec(block)?.[1];
    if (src && weight) out.push({ weight, italic: style === "italic", url: src });
  }
  const regular = out.findIndex((x) => x.weight === 400 && !x.italic);
  if (regular > 0) out.unshift(...out.splice(regular, 1));
  return out;
}

export async function gfDownload(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length <= MAX_FILE ? buf : null;
  } catch {
    return null;
  }
}

export type Coverage = { latin: boolean; uzLatin: boolean; cyrillic: boolean; uzCyrillic: boolean };

/** Which writing systems a font draws: Uzbek Latin needs ʻ (U+02BB), Uzbek Cyrillic needs ў қ ғ ҳ. */
export function coverage(buf: Buffer): Coverage | null {
  try {
    const f = fontkit.create(buf) as fontkit.Font;
    const has = (s: string) => [...s].every((c) => f.hasGlyphForCodePoint(c.codePointAt(0)!));
    return {
      latin: has("AaRz"),
      uzLatin: has("ʻ"),
      cyrillic: has("ЖжЯя"),
      uzCyrillic: has("ЎўҚқҒғҲҳ"),
    };
  } catch {
    return null;
  }
}

/** The licence written in the font itself (name table); only these two may be given away. */
export function licenceOf(buf: Buffer): "OFL" | "Apache" | null {
  try {
    const f = fontkit.create(buf) as unknown as { name?: { records?: Record<string, Record<string, string> | undefined> } };
    const r = f.name?.records ?? {};
    const text = [r.license, r.licenseURL, r.copyright].flatMap((x) => (x ? Object.values(x) : [])).join(" ");
    if (/openfontlicense|scripts\.sil\.org\/OFL|Open Font License/i.test(text)) return "OFL";
    if (/apache\.org\/licenses|Apache License/i.test(text)) return "Apache";
    return null;
  } catch {
    return null;
  }
}

export const gfPage = (family: string) => `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, "+")}`;
