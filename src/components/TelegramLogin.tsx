"use client";
import { useEffect, useRef } from "react";

/** Telegram's official Login Widget. The script is added from here (not the HTML) so it
 * inherits the page's CSP trust ('strict-dynamic'); its iframe is allowed by frame-src. */
export default function TelegramLogin({ bot }: { bot: string }) {
  const box = useRef<HTMLDivElement>(null);
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
    s.setAttribute("data-auth-url", "/api/auth/telegram");
    el.appendChild(s);
    return () => { el.textContent = ""; };
  }, [bot]);
  return <div ref={box} className="tg-login" role="group" aria-label="Telegram orqali davom etish" />;
}
