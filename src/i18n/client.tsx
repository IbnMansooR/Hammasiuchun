"use client";
import { createContext, useContext } from "react";
import { withLocale, type Locale } from "./config";
import { DICTS } from "./dict";

const LocaleCtx = createContext<Locale>("uz");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>;
}

export const useLocale = () => useContext(LocaleCtx);
export const useT = () => DICTS[useContext(LocaleCtx)];
/** Prefix a site path for the current language. */
export function useLhref() {
  const locale = useContext(LocaleCtx);
  return (href: string) => withLocale(locale, href);
}
