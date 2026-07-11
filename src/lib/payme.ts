// Payme (Paycom) Merchant API — checkout redirect + JSON-RPC webhook helpers.
// Protocol reference: developer.help.paycom.uz. Amounts are always tiyin (1 so'm = 100 tiyin).
export const paymeEnabled = !!(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY);
const CHECKOUT_HOST = process.env.PAYME_TEST === "1" ? "checkout.test.paycom.uz" : "checkout.paycom.uz";

/** Hosted checkout redirect URL. amountTiyin must be an integer. */
export function paymeCheckoutUrl(orderId: number, amountTiyin: number): string {
  const params = [
    `m=${process.env.PAYME_MERCHANT_ID}`,
    `ac.order_id=${orderId}`,
    `a=${amountTiyin}`,
  ].join(";");
  const encoded = Buffer.from(params, "utf8").toString("base64");
  return `https://${CHECKOUT_HOST}/${encoded}`;
}

// JSON-RPC error codes per Payme's Merchant API spec.
export const PaymeError = {
  INVALID_AMOUNT: -31001,
  ACCOUNT_NOT_FOUND: -31050,
  TRANSACTION_NOT_FOUND: -31003,
  UNABLE_TO_PERFORM: -31008,
  UNABLE_TO_CANCEL: -31007,
  INVALID_AUTH: -32504,
  PARSE_ERROR: -32700,
  METHOD_NOT_FOUND: -32601,
} as const;

export function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message: { ru: message, uz: message, en: message } } };
}

export function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

/** Validate the Basic Auth header Payme sends on every webhook call. */
export function checkPaymeAuth(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const [login, key] = decoded.split(":");
    const expectedKey = process.env.PAYME_TEST === "1" ? process.env.PAYME_TEST_KEY : process.env.PAYME_KEY;
    return login === process.env.PAYME_MERCHANT_ID && key === expectedKey;
  } catch {
    return false;
  }
}
