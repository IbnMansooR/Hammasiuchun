import Link from "@/components/LLink";
import { IconArrow } from "@/components/Icons";
import { getLocale } from "@/i18n/server";

export const metadata = { title: "Sahifa topilmadi", robots: { index: false } };

const T = {
  uz: {
    title: "Sahifa topilmadi",
    text: "Bunday sahifa mavjud emas yoki koʻchirilgan. Balki qidirayotgan shriftingiz katalogda bordir.",
    fonts: "Shriftlarni koʻrish",
    home: "Bosh sahifa",
  },
  ru: {
    title: "Страница не найдена",
    text: "Такой страницы нет или она переехала. Возможно, нужный шрифт найдётся в каталоге.",
    fonts: "Смотреть шрифты",
    home: "На главную",
  },
};

export default async function NotFound() {
  const t = T[await getLocale()];
  return (
    <div className="container">
      <div className="empty" style={{ paddingBlock: "96px 40px" }}>
        <div className="display" style={{ fontSize: "clamp(120px, 22vw, 280px)", lineHeight: .85, color: "var(--accent)" }} aria-hidden="true">404</div>
        <h1 className="display" style={{ fontSize: "clamp(36px, 5vw, 64px)", margin: "8px 0 16px" }}>{t.title}</h1>
        <p>{t.text}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <Link href="/fonts" className="btn btn-accent btn-lg">{t.fonts} <IconArrow className="ico" /></Link>
          <Link href="/" className="btn btn-lg">{t.home}</Link>
        </div>
      </div>
    </div>
  );
}
