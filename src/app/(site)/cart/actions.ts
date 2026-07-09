"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type CartLine = { slug: string; name: string; priceCents: number; isFree: boolean; tier: string };

export async function placeOrderAction(
  items: CartLine[],
  contact: string,
): Promise<{ ok: true } | { ok: false; error: "contact" | "empty" }> {
  const trimmedContact = contact.trim().slice(0, 200);
  if (!trimmedContact) return { ok: false, error: "contact" };
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "empty" };

  // Never trust client-sent price/tier for the order — re-verify every line
  // against the current catalog so a tampered cart can't fabricate a cheaper
  // price or slip a "paid" (not yet purchasable) font through.
  const slugs = [...new Set(items.map((i) => i.slug))];
  const rows = await db.family.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, priceCents: true, isFree: true, tier: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const verified = slugs
    .map((s) => bySlug.get(s))
    .filter((r): r is NonNullable<typeof r> => !!r && !r.isFree && r.tier !== "paid");
  if (!verified.length) return { ok: false, error: "empty" };

  const totalCents = verified.reduce((s, r) => s + r.priceCents, 0);
  await db.order.create({
    data: {
      itemsJson: JSON.stringify(verified.map((r) => ({ slug: r.slug, name: r.name, priceCents: r.priceCents }))),
      totalCents,
      contact: trimmedContact,
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}
