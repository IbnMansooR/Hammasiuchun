"use client";
import { useEffect, useRef } from "react";
import { useLocale } from "@/i18n/client";

/** Telegram's official Login Widget. The script is added from here (not the HTML) so it
 * inherits the page's CSP trust ('strict-dynamic'); its iframe is allowed by frame-src. */
export default function TelegramLogin({ bot }: { bot: string }) {
  const box = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.setAttribute("data-telegram-login", bot);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "21");
    s.setAttribute("data-userpic", "false");
    s.setAttribute("data-auth-url", locale === "ru" ? "/api/auth/telegram?lang=ru" : "/api/auth/telegram");
    if (locale === "ru") s.setAttribute("data-lang", "ru");
    s.setAttribute("data-request-access", "write"); // lets the bot send the copies of site messages the person turns on
    el.appendChild(s);
    return () => { el.textContent = ""; };
  }, [bot, locale]);
  return <div ref={box} className="tg-login" role="group" aria-label={locale === "ru" ? "Продолжить через Telegram" : "Telegram orqali davom etish"} />;
}
