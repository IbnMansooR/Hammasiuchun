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

const has = (cps: Set<number>, chars: string) => [...chars].every((c) => cps.has(c.codePointAt(0)!));

export function supportFromCodepoints(cps: Set<number>): GlyphSupport {
  return {
    uzLatin: has(cps, "ʻʼ"),
    uzLatinBasic: has(cps, "’") || has(cps, "'"),
    cyrillic: has(cps, "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя"),
    uzCyrillic: has(cps, "ЎўҚқҒғҲҳ"),
  };
}

async function compute(slug: string, style: string, folder: string, file: string): Promise<GlyphSupport | null> {
  // The cached WOFF2 is small; fall back to the source file on a cache miss.
  const buf = (await readWebfont(slug, style)) ?? (await readFont(folder, file));
  if (!buf) return null;
  try {
    const f = fontkit.create(buf) as fontkit.Font;
    return supportFromCodepoints(new Set(f.characterSet));
  } catch {
    return null;
  }
}

export const getGlyphSupport = (slug: string, style: string, folder: string, file: string) =>
  unstable_cache(() => compute(slug, style, folder, file), ["glyph-support", slug, style], {
    revalidate: 60 * 60 * 24 * 7,
  })();
