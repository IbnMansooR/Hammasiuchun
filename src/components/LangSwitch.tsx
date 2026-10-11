"use client";
// Link to the same page in the other language. A plain <a> (full load): both languages share one
// layout, so a client-side switch would keep the old header and footer text.
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { stripLocale, withLocale, type Locale } from "@/i18n/config";

const LABEL: Record<Locale, { short: string; long: string; hint: string }> = {
  uz: { short: "UZ", long: "Oʻzbekcha", hint: "Saytning oʻzbekcha versiyasi" },
  ru: { short: "RU", long: "Русский", hint: "Русская версия сайта" },
};

export default function LangSwitch({ variant = "short", className }: { variant?: "short" | "long"; className?: string }) {
  const locale = useLocale();
  const other: Locale = locale === "uz" ? "ru" : "uz";
  const { path } = stripLocale(usePathname() ?? "/");
  const href = withLocale(other, path);
  const l = LABEL[other];
  return (
    <a
      href={href}
      hrefLang={other}
      lang={other}
      className={className}
      aria-label={variant === "short" ? l.hint : undefined}
      onClick={(e) => {
        // Keep filters and the search query (?cat=…) when switching.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        window.location.assign(href + window.location.search + window.location.hash);
      }}
    >
      {variant === "short" ? l.short : l.long}
    </a>
  );
}
