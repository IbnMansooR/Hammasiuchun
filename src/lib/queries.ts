import { db } from "./db";
import type { Prisma } from "@prisma/client";
import { cardInclude, toCard, type CardFont } from "./cards";

export { toCard, cardsFaceCSS, cardFontStyle, type CardFont } from "./cards";

const MAX_CARDS = 60; // hard safety cap when a caller omits `take`

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
