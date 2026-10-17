// Two languages: Uzbek (default, no prefix) and Russian under /ru. The middleware rewrites /ru/... to
// the same pages and tells them the locale in the x-locale request header.
export type Locale = "uz" | "ru";
export const LOCALES: Locale[] = ["uz", "ru"];
export const OG_LOCALE: Record<Locale, string> = { uz: "uz_UZ", ru: "ru_RU" };

const NOT_LOCALISED = /^\/(api|admin|_next|assets|fonts\/ui|uploads)(\/|$)/;
const STATIC_FILE = /^\/[^/?#]+\.(txt|xml|png|svg|ico|webp|jpe?g|woff2?)$/i;

/** The same page in the given language: "/fonts?q=a" → "/ru/fonts?q=a" for Russian. */
export function withLocale(locale: Locale, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const { path } = stripLocale(href);
  if (locale === "uz") return path;
  if (NOT_LOCALISED.test(path) || STATIC_FILE.test(path)) return path;
  if (path === "/") return "/ru";
  if (path.startsWith("/?") || path.startsWith("/#")) return `/ru${path.slice(1)}`;
  return `/ru${path}`;
}

/** "/ru/fonts?x" → { locale: "ru", path: "/fonts?x" }. */
export function stripLocale(href: string): { locale: Locale; path: string } {
  const m = /^\/ru(?=$|[/?#])/.exec(href);
  if (!m) return { locale: "uz", path: href };
  const rest = href.slice(3);
  return { locale: "ru", path: rest.startsWith("/") ? rest : `/${rest}` };
}

/** Russian plural forms: 1 стиль, 2 стиля, 5 стилей. */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
