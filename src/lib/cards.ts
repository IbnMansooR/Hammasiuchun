// Card data + the @font-face CSS cards need. Pure (no DB import) so client
// components (wishlist, search) can use it too.
import type { CSSProperties } from "react";
import type { Prisma } from "@prisma/client";
import { previewStyle, fontFaceCSS, cssFamily } from "./fonts";

export type CardFont = {
  slug: string;
  name: string;
  category: string;
  styleCount: number;
  hasItalic: boolean;
  hasLatin: boolean;
  hasCyrillic: boolean;
  isNew: boolean;
  tagline: string | null;
  /** Empty string when the family has no styles (no @font-face is emitted). */
  previewStyleName: string;
  previewWeight: number;
  previewItalic: boolean;
};

export const cardInclude = {
  styles: { select: { style: true, weight: true, italic: true } },
} satisfies Prisma.FamilyInclude;

export type FamilyWithStyles = Prisma.FamilyGetPayload<{ include: typeof cardInclude }>;

export function toCard(f: FamilyWithStyles): CardFont {
  const pv = previewStyle(f.styles.map((s) => ({ style: s.style, weight: s.weight, italic: s.italic })));
  return {
    slug: f.slug,
    name: f.name,
    category: f.category,
    styleCount: f.styleCount,
    hasItalic: f.hasItalic,
    hasLatin: f.hasLatin,
    hasCyrillic: f.hasCyrillic,
    isNew: f.isNew,
    tagline: f.tagline,
    previewStyleName: pv?.style ?? "",
    previewWeight: pv?.weight ?? 400,
    previewItalic: pv?.italic ?? false,
  };
}

/** @font-face block covering each card's single preview cut. Families with no
 * resolvable preview style are skipped so we never emit a 404-ing @font-face. */
export function cardsFaceCSS(cards: CardFont[]): string {
  const seen = new Set<string>();
  return cards
    .filter((c) => c.previewStyleName && !seen.has(c.slug) && seen.add(c.slug))
    .map((c) => fontFaceCSS(c.slug, [{ style: c.previewStyleName, weight: c.previewWeight, italic: c.previewItalic }]))
    .join("");
}

/** Inline style that renders text in a card's preview cut. */
export function cardFontStyle(c: Pick<CardFont, "slug" | "previewWeight" | "previewItalic">): CSSProperties {
  return {
    fontFamily: `"${cssFamily(c.slug)}", var(--font)`,
    fontWeight: c.previewWeight,
    fontStyle: c.previewItalic ? "italic" : "normal",
  };
}
