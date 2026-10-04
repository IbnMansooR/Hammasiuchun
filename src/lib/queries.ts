import { db } from "./db";
import { previewStyle, fontFaceCSS } from "./fonts";
import type { Prisma } from "@prisma/client";

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

const cardInclude = {
  styles: { select: { style: true, weight: true, italic: true } },
} satisfies Prisma.FamilyInclude;

type FamilyWithStyles = Prisma.FamilyGetPayload<{ include: typeof cardInclude }>;

const MAX_CARDS = 60; // hard safety cap when a caller omits `take`

export function toCard(f: FamilyWithStyles): CardFont {
  const styles = f.styles.map((s) => ({ style: s.style, weight: s.weight, italic: s.italic }));
  const pv = previewStyle(styles);
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
  return cards
    .filter((c) => c.previewStyleName)
    .map((c) => fontFaceCSS(c.slug, [{ style: c.previewStyleName, weight: c.previewWeight, italic: c.previewItalic }]))
    .join("");
}

export async function fetchCards(args: {
  where?: Prisma.FamilyWhereInput;
  orderBy?: Prisma.FamilyOrderByWithRelationInput | Prisma.FamilyOrderByWithRelationInput[];
  take?: number;
  skip?: number;
}): Promise<CardFont[]> {
  const rows = await db.family.findMany({
    ...args,
    take: args.take ?? MAX_CARDS,
    include: cardInclude,
  });
  return rows.map(toCard);
}
