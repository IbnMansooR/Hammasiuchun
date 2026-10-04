import { db } from "@/lib/db";
import { checkClickSign, ClickError } from "@/lib/click";
import { getSiteSettings, centsToTiyin } from "@/lib/settings";
import { grantOrderPurchases } from "@/lib/purchases";

export const runtime = "nodejs";

function reply(fields: Record<string, string | number>) {
  // Click accepts either content type; JSON is simplest to construct correctly.
  return Response.json(fields);
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return reply({ error: ClickError.BAD_REQUEST, error_note: "Bad request" });

  const f = {
    click_trans_id: String(form.get("click_trans_id") ?? ""),
    service_id: String(form.get("service_id") ?? ""),
    merchant_trans_id: String(form.get("merchant_trans_id") ?? ""),
    merchant_prepare_id: form.get("merchant_prepare_id") ? String(form.get("merchant_prepare_id")) : undefined,
    amount: String(form.get("amount") ?? ""),
    action: String(form.get("action") ?? ""),
    sign_time: String(form.get("sign_time") ?? ""),
    sign_string: String(form.get("sign_string") ?? ""),
  };

  const base = {
    click_trans_id: f.click_trans_id,
    merchant_trans_id: f.merchant_trans_id,
    merchant_prepare_id: f.merchant_prepare_id ?? "",
    merchant_confirm_id: f.merchant_prepare_id ?? "",
  };

  if (!checkClickSign(f)) return reply({ ...base, error: ClickError.SIGN_FAILED, error_note: "Sign check failed" });

  const orderId = Number(f.merchant_trans_id);
  if (!Number.isInteger(orderId)) return reply({ ...base, error: ClickError.USER_NOT_FOUND, error_note: "Order not found" });
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return reply({ ...base, error: ClickError.USER_NOT_FOUND, error_note: "Order not found" });

  const { usdToUzsRate } = await getSiteSettings();
  const expectedSom = Math.round(centsToTiyin(order.totalCents, usdToUzsRate) / 100);
  if (expectedSom !== Math.round(Number(f.amount))) {
    return reply({ ...base, error: ClickError.WRONG_AMOUNT, error_note: "Incorrect amount" });
  }

  if (f.action === "0") {
    // Prepare — reserve a transaction, but don't grant anything yet.
    const existing = await db.clickTransaction.findUnique({ where: { id: f.click_trans_id } });
    if (existing?.status === "cancelled") return reply({ ...base, error: ClickError.TRANSACTION_CANCELLED, error_note: "Transaction cancelled" });

    const prepareId = existing?.preparedId ?? Math.floor(Date.now() / 1000);
    if (!existing) {
      await db.clickTransaction.create({
        data: { id: f.click_trans_id, orderId, amount: Math.round(Number(f.amount)), preparedId: prepareId, status: "prepared" },
      });
    }
    return reply({ ...base, merchant_prepare_id: prepareId, merchant_confirm_id: prepareId, error: ClickError.OK, error_note: "Success" });
  }

  if (f.action === "1") {
    // Complete — the buyer actually paid. Confirm and grant ownership.
    const tx = await db.clickTransaction.findUnique({ where: { id: f.click_trans_id } });
    if (!tx) return reply({ ...base, error: ClickError.TRANSACTION_NOT_FOUND, error_note: "Transaction not found" });
    if (tx.status === "cancelled") return reply({ ...base, error: ClickError.TRANSACTION_CANCELLED, error_note: "Transaction cancelled" });
    if (tx.status === "confirmed") {
      return reply({ ...base, merchant_confirm_id: tx.preparedId ?? "", error: ClickError.ALREADY_PAID, error_note: "Already confirmed" });
    }
    // Click reports a failed/aborted payment by sending Complete with error < 0
    // (e.g. -5017 insufficient funds). That must cancel, never grant ownership.
    if (Number(form.get("error") ?? 0) < 0) {
      await db.clickTransaction.update({ where: { id: f.click_trans_id }, data: { status: "cancelled" } });
      return reply({ ...base, merchant_confirm_id: tx.preparedId ?? "", error: ClickError.TRANSACTION_CANCELLED, error_note: "Transaction cancelled" });
    }

    await db.clickTransaction.update({ where: { id: f.click_trans_id }, data: { status: "confirmed" } });
    await grantOrderPurchases(orderId, "click");
    return reply({ ...base, merchant_confirm_id: tx.preparedId ?? "", error: ClickError.OK, error_note: "Success" });
  }

  return reply({ ...base, error: ClickError.ACTION_NOT_FOUND, error_note: "Action not found" });
}
