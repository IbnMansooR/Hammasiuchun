// Thin wrapper around the Eskiz.uz SMS API (notify.eskiz.uz) — no official
// Node SDK exists, so this talks to the REST endpoints directly.
export const smsEnabled = !!(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);

const BASE = "https://notify.eskiz.uz/api";

let cachedToken: string | null = null;

async function login(): Promise<string | null> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ESKIZ_EMAIL, password: process.env.ESKIZ_PASSWORD }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: { token?: string } };
  return body.data?.token ?? null;
}

/** Uzbek mobile number normalized to Eskiz's expected "998XXXXXXXXX" (no +, no spaces). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 12 && digits.startsWith("998")) return digits;
  if (digits.length === 9) return `998${digits}`;
  return null;
}

export async function sendSms(phone: string, message: string): Promise<boolean> {
  if (!smsEnabled) return false;
  const token = cachedToken ?? (await login());
  if (!token) return false;
  cachedToken = token;

  const attempt = async (tok: string) =>
    fetch(`${BASE}/message/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ mobile_phone: phone, message, from: process.env.ESKIZ_FROM || "4546" }),
    });

  let res = await attempt(token);
  if (res.status === 401) {
    // Cached token expired — log in fresh once and retry.
    const fresh = await login();
    if (!fresh) return false;
    cachedToken = fresh;
    res = await attempt(fresh);
  }
  return res.ok;
}
