import { headers } from "next/headers";
import { withLocale, type Locale } from "./config";
import { DICTS } from "./dict";

export async function getLocale(): Promise<Locale> {
  return (await headers()).get("x-locale") === "ru" ? "ru" : "uz";
}

export async function getT() {
  return DICTS[await getLocale()];
}

/** A site path in the current request's language (for redirect()). */
export async function lhref(path: string): Promise<string> {
  return withLocale(await getLocale(), path);
}

/** canonical + hreflang for a page that exists in both languages. */
export async function alternates(path: string) {
  const locale = await getLocale();
  return {
    canonical: withLocale(locale, path),
    languages: { uz: path, ru: withLocale("ru", path), "x-default": path },
  };
}
