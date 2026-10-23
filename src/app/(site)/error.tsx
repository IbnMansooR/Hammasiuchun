"use client";
import Link from "@/components/LLink";
import { useEffect } from "react";
import { useLocale } from "@/i18n/client";

const T = {
  uz: { title: "Nimadir notoʻgʻri ketdi", text: "Sahifani yuklashda kutilmagan xatolik yuz berdi. Qaytadan urinib koʻring.", retry: "Qaytadan urinish", home: "Bosh sahifa" },
  ru: { title: "Что-то пошло не так", text: "При загрузке страницы произошла непредвиденная ошибка. Попробуйте ещё раз.", retry: "Попробовать снова", home: "На главную" },
};

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = T[useLocale()];
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container">
      <div className="empty" style={{ paddingBlock: "96px 40px" }}>
        <h1 className="display" style={{ fontSize: "clamp(40px, 6vw, 80px)", marginBottom: 16 }}>{t.title}</h1>
        <p>{t.text}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-accent btn-lg" onClick={() => reset()}>{t.retry}</button>
          <Link href="/" className="btn btn-lg">{t.home}</Link>
        </div>
      </div>
    </div>
  );
}
