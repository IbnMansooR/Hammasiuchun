// Which scripts a family really covers, read from the font's own character map.
// Uzbek needs more than "Latin/Cyrillic": oʻ/gʻ use U+02BB, the tutuq belgisi
// U+02BC, and Uzbek Cyrillic adds Ўў Ққ Ғғ Ҳҳ. Computed from the preview cut
// and cached per family, so no DB column/migration is needed.
import * as fontkit from "fontkit";
import { unstable_cache } from "next/cache";
import { readFont, readWebfont } from "./storage";

export type GlyphSupport = {
  uzLatin: boolean;      // ʻ ʼ present
  uzLatinBasic: boolean; // at least ‘ ’ or ' (what most people type)
  cyrillic: boolean;     // full Russian alphabet
  uzCyrillic: boolean;   // Ўў Ққ Ғғ Ҳҳ
};

export type GlyphInfo = { support: GlyphSupport; chars: number[] };

const has = (cps: Set<number>, chars: string) => [...chars].every((c) => cps.has(c.codePointAt(0)!));

export function supportFromCodepoints(cps: Set<number>): GlyphSupport {
  return {
    uzLatin: has(cps, "ʻʼ"),
    uzLatinBasic: has(cps, "’") || has(cps, "'"),
    cyrillic: has(cps, "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя"),
    uzCyrillic: has(cps, "ЎўҚқҒғҲҳ"),
  };
}

// Code points worth showing in the glyph map (printable Latin, Uzbek, Cyrillic,
// common punctuation and symbols) — not every ligature or PUA icon a font ships.
const SHOWN: [number, number][] = [
  [0x21, 0x7e], [0xa1, 0xff], [0x100, 0x17f], [0x2bb, 0x2bc],
  [0x400, 0x45f], [0x490, 0x4b3], [0x2010, 0x2027], [0x2030, 0x203a],
  [0x20ac, 0x20ac], [0x20bd, 0x20bd], [0x2116, 0x2116], [0x2122, 0x2122], [0x2190, 0x2193],
];
const shown = (cp: number) => SHOWN.some(([a, b]) => cp >= a && cp <= b);

async function compute(slug: string, style: string, folder: string, file: string): Promise<GlyphInfo | null> {
  // The cached WOFF2 is small; fall back to the source file on a cache miss.
  const buf = (await readWebfont(slug, style)) ?? (await readFont(folder, file));
  if (!buf) return null;
  try {
    const f = fontkit.create(buf) as fontkit.Font;
    const cps = new Set(f.characterSet);
    return { support: supportFromCodepoints(cps), chars: [...cps].filter(shown).sort((a, b) => a - b).slice(0, 800) };
  } catch {
    return null;
  }
}

export const getGlyphInfo = (slug: string, style: string, folder: string, file: string) =>
  unstable_cache(() => compute(slug, style, folder, file), ["glyph-info-v1", slug, style], {
    revalidate: 60 * 60 * 24 * 7,
  })();

export const getGlyphSupport = async (slug: string, style: string, folder: string, file: string) =>
  (await getGlyphInfo(slug, style, folder, file))?.support ?? null;

export type GlyphGroup = { key: string; label: string; chars: string[] };

/** Split a font's code points into the groups the glyph map shows. */
export function groupGlyphs(chars: number[]): GlyphGroup[] {
  const set = new Set(chars);
  const take = (cps: number[]) => cps.filter((c) => set.has(c)).map((c) => String.fromCodePoint(c));
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const isLetter = (c: number) => /\p{L}/u.test(String.fromCodePoint(c));
  const uz = [0x2bb, 0x2bc, 0x40e, 0x45e, 0x49a, 0x49b, 0x492, 0x493, 0x4b2, 0x4b3];
  const cyr = [0x401, ...range(0x410, 0x44f), 0x451];
  const groups: GlyphGroup[] = [
    { key: "latin", label: "Lotin alifbosi", chars: take([...range(0x41, 0x5a), ...range(0x61, 0x7a)]) },
    { key: "uz", label: "Oʻzbekcha belgilar", chars: take(uz) },
    { key: "cyr", label: "Kirill alifbosi", chars: take(cyr) },
    { key: "num", label: "Raqamlar", chars: take(range(0x30, 0x39)) },
    { key: "ext", label: "Lotin — qoʻshimcha harflar", chars: take([...range(0xc0, 0xff), ...range(0x100, 0x17f)].filter(isLetter)) },
    {
      key: "punct", label: "Tinish belgilari va simvollar",
      chars: take([...range(0x21, 0x2f), ...range(0x3a, 0x40), ...range(0x5b, 0x60), ...range(0x7b, 0x7e), ...range(0xa1, 0xbf), 0xd7, 0xf7,
        ...range(0x2010, 0x2027), ...range(0x2030, 0x203a), 0x20ac, 0x20bd, 0x2116, 0x2122, ...range(0x2190, 0x2193)]),
    },
  ];
  return groups.filter((g) => g.chars.length > 0);
}
