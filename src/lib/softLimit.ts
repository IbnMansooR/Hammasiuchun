// A cheap brake for the heavy public endpoints (ZIP downloads, font conversion, pictures).
// Counted per server instance in memory: it will not stop a determined, distributed attack
// (that is the platform firewall's job), but one script hammering a URL gets 429s quickly.
const hits = new Map<string, { n: number; t: number }>();

export function clientIpFrom(h: Headers): string {
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** True when this request goes over `max` per `windowMs` for this bucket and client. */
export function overLimit(bucket: string, h: Headers, max: number, windowMs: number): boolean {
  const key = `${bucket}:${clientIpFrom(h)}`;
  const now = Date.now();
  const r = hits.get(key);
  if (!r || now - r.t > windowMs) {
    if (hits.size > 20_000) hits.clear();
    hits.set(key, { n: 1, t: now });
    return false;
  }
  return ++r.n > max;
}

export const tooManyRequests = (retryAfterS: number) =>
  new Response("Juda koʻp soʻrov. Birozdan soʻng qayta urinib koʻring.", {
    status: 429,
    headers: { "Retry-After": String(retryAfterS), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
