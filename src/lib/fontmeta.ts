import * as fontkit from "fontkit";

const WEIGHT_TOKENS: [string, number][] = [
  ["extrablack", 950], ["ultrablack", 950],
  ["extrabold", 800], ["ultrabold", 800],
  ["extralight", 200], ["ultralight", 200],
  ["semibold", 600], ["demibold", 600], ["semilight", 350],
  ["hairline", 100], ["thin", 100], ["light", 300], ["medium", 500],
  ["black", 900], ["heavy", 900], ["bold", 700],
  ["book", 400], ["regular", 400], ["normal", 400], ["roman", 400], ["plain", 400],
];
const WEIGHT_NAME: Record<number, string> = {
  100: "Thin", 200: "ExtraLight", 300: "Light", 350: "SemiLight", 400: "Regular",
  500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black", 950: "ExtraBlack",
};
const ITALIC = ["italic", "oblique", "kursiv"];

// Cyrillic → Latin so Uzbek/Russian-named families get meaningful slugs
// instead of all collapsing to the "font" fallback.
const CYR_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "i", ь: "",
  э: "e", ю: "yu", я: "ya", ғ: "g", қ: "q", ҳ: "h", ў: "o",
};

function translit(name: string): string {
  return (name || "").replace(/[Ѐ-ӿ]/g, (ch) => {
    const lower = ch.toLowerCase();
    const mapped = CYR_MAP[lower];
    if (mapped === undefined) return ch;
    return ch === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
  });
}

/** Short deterministic hash used to disambiguate otherwise-empty/colliding slugs. */
export function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}

export function slugify(name: string): string {
  const base = translit(name || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  // Fall back to a stable per-name hash instead of the shared constant "font".
  return base || (name ? `font-${shortHash(name)}` : "font");
}

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function safeFolder(name: string): string {
  let n = (name || "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    // Strip trailing/leading dots and spaces AFTER slicing (Windows rejects them).
    .replace(/^[.\s]+|[.\s]+$/g, "");
  if (!n || /^\.+$/.test(n)) return "Unnamed";
  if (RESERVED.test(n)) n = `${n}-font`;
  return n;
}
export function styleSlug(weight: number, italic: boolean): string {
  const base = WEIGHT_NAME[weight] ?? "Regular";
  if (base === "Regular" && italic) return "Italic";
  return base + (italic ? "Italic" : "");
}

function deriveStyle(subfamily: string, weightClass: number | undefined, italicAngle: number | undefined) {
  const low = (subfamily || "").toLowerCase();
  const italic = ITALIC.some((t) => low.includes(t)) || (!!italicAngle && Math.abs(italicAngle) > 1);
  let weight: number | undefined;
  for (const [tok, w] of WEIGHT_TOKENS) if (low.includes(tok)) { weight = w; break; }
  if (weight === undefined) {
    weight = weightClass && weightClass >= 100 && weightClass <= 1000
      ? Math.max(100, Math.min(900, Math.round(weightClass / 100) * 100)) : 400;
  }
  return { weight, italic };
}

export type ParsedFont = {
  family: string; subfamily: string; weight: number; italic: boolean;
  styleSlug: string; glyphs: number; hasLatin: boolean;
  copyright: string | null; designer: string | null; manufacturer: string | null;
  license: string | null; licenseClass: string; version: string | null;
};

function classifyLicense(cpy: string | null): string {
  const b = (cpy || "").toLowerCase();
  if (b.includes("open font license") || b.includes("ofl")) return "OFL";
  if (b.includes("apache")) return "Apache";
  if (b.includes("public domain")) return "Public Domain";
  if (b.includes("freeware")) return "Freeware";
  if (b.includes("bitstream")) return "Bitstream";
  if (b.includes("adobe")) return "Adobe";
  if (b.includes("all rights reserved")) return "All Rights Reserved";
  return "Unknown";
}

export function parseFontBuffer(buf: Buffer): ParsedFont {
  let font = fontkit.create(buf) as any;
  if (font && font.fonts && Array.isArray(font.fonts)) font = font.fonts[0];
  const family = (font.familyName || "Unnamed").trim();
  const subfamily = (font.subfamilyName || "Regular").trim();
  const weightClass = font["OS/2"]?.usWeightClass;
  const { weight, italic } = deriveStyle(subfamily, weightClass, font.italicAngle);
  let hasLatin = false;
  try { hasLatin = [65, 97, 82].every((c) => font.hasGlyphForCodePoint(c)); } catch {}
  const copyright = font.copyright?.trim?.() || null;
  return {
    family, subfamily, weight, italic, styleSlug: styleSlug(weight, italic),
    glyphs: font.numGlyphs || 0, hasLatin,
    copyright,
    designer: font.designer?.trim?.() || null,
    manufacturer: font.manufacturer?.trim?.() || null,
    license: null,
    licenseClass: classifyLicense(copyright),
    version: font.version?.trim?.() || null,
  };
}
