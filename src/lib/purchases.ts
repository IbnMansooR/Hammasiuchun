import { db } from "./db";

/** Turn a successful payment into permanent, re-downloadable ownership.
 * Called from both the Payme (PerformTransaction) and Click (Complete)
 * webhooks, and from the admin's manual "mark order done" action — all three
 * converge here so ownership means the same thing regardless of how the sale
 * happened. */
export async function grantOrderPurchases(orderId: number, provider: "payme" | "click" | "manual"): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || !order.userId) return; // guest checkout has no account to attach ownership to

  let items: { slug: string; name: string; priceCents: number }[] = [];
  try { items = JSON.parse(order.itemsJson); } catch { return; }

  for (const it of items) {
    await db.purchase.upsert({
      where: { userId_familySlug: { userId: order.userId, familySlug: it.slug } },
      update: {},
      create: { userId: order.userId, familySlug: it.slug, familyName: it.name, priceCents: it.priceCents, provider, orderId },
    });
  }
  if (order.status !== "done") {
    await db.order.update({ where: { id: orderId }, data: { status: "done" } });
  }
}
