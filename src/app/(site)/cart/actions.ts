"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/userAuth";
import { getSiteSettings, centsToTiyin } from "@/lib/settings";
import { paymeEnabled, paymeCheckoutUrl } from "@/lib/payme";
import { clickEnabled, clickCheckoutUrl } from "@/lib/click";

export type CartLine = { slug: string; name: string; priceCents: number; isFree: boolean; tier: string };

// Never trust client-sent price/tier for an order — re-verify every line
// against the current catalog so a tampered cart can't fabricate a cheaper
// price or slip a "paid" (not yet purchasable) font through.
async function verifyLines(items: CartLine[]) {
  const slugs = [...new Set(items.map((i) => i.slug))];
  const rows = await db.family.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, priceCents: true, isFree: true, tier: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((r): r is NonNullable<typeof r> => !!r && !r.isFree && r.tier !== "paid");
}

export async function placeOrderAction(
  items: CartLine[],
  contact: string,
): Promise<{ ok: true } | { ok: false; error: "contact" | "empty" }> {
  const trimmedContact = contact.trim().slice(0, 200);
  if (!trimmedContact) return { ok: false, error: "contact" };
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "empty" };

  const verified = await verifyLines(items);
  if (!verified.length) return { ok: false, error: "empty" };

  const totalCents = verified.reduce((s, r) => s + r.priceCents, 0);
  const user = await getCurrentUser();
  await db.order.create({
    data: {
      itemsJson: JSON.stringify(verified.map((r) => ({ slug: r.slug, name: r.name, priceCents: r.priceCents }))),
      totalCents,
      contact: trimmedContact,
      userId: user?.id,
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

export type PaymentProvider = "payme" | "click";

/** Creates the Order, then returns the hosted checkout URL to redirect to.
 * Requires an account — ownership (re-download-forever) is granted to a
 * user, so guest checkout only makes sense for the manual "leave contact"
 * flow above, not for a real payment. */
export async function initiatePaymentAction(
  items: CartLine[],
  provider: PaymentProvider,
): Promise<{ ok: true; url: string } | { ok: false; error: "login" | "empty" | "unavailable" }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "login" };
  if ((provider === "payme" && !paymeEnabled) || (provider === "click" && !clickEnabled)) {
    return { ok: false, error: "unavailable" };
  }

  const verified = await verifyLines(items);
  if (!verified.length) return { ok: false, error: "empty" };

  const totalCents = verified.reduce((s, r) => s + r.priceCents, 0);
  const order = await db.order.create({
    data: {
      itemsJson: JSON.stringify(verified.map((r) => ({ slug: r.slug, name: r.name, priceCents: r.priceCents }))),
      totalCents,
      contact: user.email ?? user.phone ?? "",
      userId: user.id,
    },
  });

  const { usdToUzsRate } = await getSiteSettings();
  const tiyin = centsToTiyin(totalCents, usdToUzsRate);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  const url = provider === "payme"
    ? paymeCheckoutUrl(order.id, tiyin)
    : clickCheckoutUrl(order.id, Math.round(tiyin / 100), `${site}/account`);

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, url };
}
