export function formatPrice(cents: number, isFree: boolean): string {
  if (isFree || !Number.isFinite(cents) || cents <= 0) return "Bepul";
  // Render exact values: whole dollars without decimals, otherwise 2 places.
  const dollars = cents / 100;
  return cents % 100 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** Space-grouped number for the Uzbek UI. Hand-rolled (not toLocaleString)
 * because "uz-UZ" ICU data differs between Node and the browser, which was
 * causing a hydration mismatch when this ran in a client component. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const neg = n < 0;
  const s = Math.trunc(Math.abs(n)).toString();
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return neg ? `-${grouped}` : grouped;
}

const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

export function formatDate(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  // Use UTC getters so a date-only string ("2026-07-06", parsed as UTC midnight)
  // does not shift by a day depending on the server's timezone.
  return `${date.getUTCDate()}-${MONTHS[date.getUTCMonth()]}, ${date.getUTCFullYear()}`;
}

/** Date + time in Tashkent (fixed UTC+5, no DST), e.g. "4-oktabr, 2026, 18:30". */
export function formatDateTime(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const t = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(t)}, ${hh}:${mm}`;
}

export function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}
