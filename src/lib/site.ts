/** Canonical public origin (no trailing slash). Falls back to the live domain —
 * feekr.uz is a different product, so it must never be the default here. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://feekrfont.uz").replace(/\/$/, "");
