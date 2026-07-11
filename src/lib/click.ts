// Click Merchant Shop API — checkout redirect + Prepare/Complete webhook helpers.
// Protocol reference: docs.click.uz + Click's official click-integration-php SDK.
// Amounts are whole so'm (not tiyin).
import crypto from "node:crypto";

export const clickEnabled = !!(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY);

export function clickCheckoutUrl(orderId: number, amountSom: number, returnUrl: string): string {
  const params = new URLSearchParams({
    service_id: process.env.CLICK_SERVICE_ID!,
    merchant_id: process.env.CLICK_MERCHANT_ID!,
    amount: String(amountSom),
    transaction_param: String(orderId),
    return_url: returnUrl,
  });
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

export const ClickError = {
  OK: 0,
  SIGN_FAILED: -1,
  WRONG_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  BAD_REQUEST: -8,
  TRANSACTION_CANCELLED: -9,
} as const;

/** sign_string = md5(click_trans_id + service_id + secret_key + merchant_trans_id + [merchant_prepare_id] + amount + action + sign_time) */
export function checkClickSign(fields: {
  click_trans_id: string; service_id: string; merchant_trans_id: string;
  merchant_prepare_id?: string; amount: string; action: string; sign_time: string; sign_string: string;
}): boolean {
  const secret = process.env.CLICK_SECRET_KEY!;
  const middle = fields.action === "1" ? (fields.merchant_prepare_id ?? "") : "";
  const raw = `${fields.click_trans_id}${fields.service_id}${secret}${fields.merchant_trans_id}${middle}${fields.amount}${fields.action}${fields.sign_time}`;
  const expected = crypto.createHash("md5").update(raw).digest("hex");
  return expected === fields.sign_string;
}
