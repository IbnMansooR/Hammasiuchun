import Link from "@/components/LLink";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { alternates, getLocale } from "@/i18n/server";

const META = {
  uz: { title: "Yordam", description: "Feekr bilan bogʻlanish va koʻp beriladigan savollar." },
  ru: { title: "Помощь", description: "Как связаться с Feekr и ответы на частые вопросы." },
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...META[await getLocale()], alternates: await alternates("/support") };
}

export default async function SupportPage() {
  const [{ contactEmail, contactTelegram }, locale] = await Promise.all([getSiteSettings(), getLocale()]);
  const ru = locale === "ru";
  const tgHandle = contactTelegram.replace(/^https?:\/\/t\.me\//, "@").replace(/\/$/, "");
  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">{ru ? "Помощь" : "Yordam"}</div>
        <h1>{ru ? "Есть вопрос?" : "Savolingiz bormi?"}</h1>
        <p className="lead">
          {ru
            ? "Пишите о лицензиях, шрифтах или о сайте — обычно отвечаем в течение дня."
            : "Litsenziya, shriftlar yoki sayt boʻyicha yozing — odatda bir kun ichida javob beramiz."}
        </p>
      </header>

      <div className="contact-grid">
        <a className="contact-card" href={`mailto:${contactEmail}`}>
          <span className="label">Email</span>
          <b>{contactEmail}</b>
        </a>
        <a className="contact-card" href={contactTelegram} target="_blank" rel="noreferrer noopener">
          <span className="label">Telegram</span>
          <b>{tgHandle}</b>
        </a>
      </div>

      <section aria-labelledby="faq-h">
        <div className="section-head"><h2 id="faq-h">{ru ? "Частые вопросы" : "Koʻp beriladigan savollar"}</h2></div>
        {ru ? <FaqRu /> : <FaqUz />}
      </section>
    </div>
  );
}

function FaqUz() {
  return (
    <div className="faq">
      <details open>
        <summary>Shriftlar haqiqatan bepulmi?</summary>
        <div className="ans">Ha. Har bir oilani shrift sahifasidan bitta ZIP qilib yuklab olasiz — roʻyxatdan oʻtish shart emas.</div>
      </details>
      <details>
        <summary>Tijoriy loyihada ishlatsam boʻladimi?</summary>
        <div className="ans">
          OFL, Apache va Public Domain shriftlari — ha. Freeware shriftlarda muallif shartlarini tekshiring: ular koʻpincha
          faqat shaxsiy foydalanish uchun bepul. Shartlar shrift sahifasida va ZIP ichidagi LITSENZIYA.txt faylida. <Link href="/license">Batafsil</Link>.
        </div>
      </details>
      <details>
        <summary>Shrift oʻzbekcha harflarni qoʻllab-quvvatlashini qanday bilaman?</summary>
        <div className="ans">Har bir shrift sahifasida “Oʻzbek lotin” va “Oʻzbek kirill” belgilari bor: yashil — toʻliq, sariq — qisman. “Belgilar” boʻlimida shriftdagi barcha harflarni koʻrasiz.</div>
      </details>
      <details>
        <summary>Mening shriftim ruxsatsiz joylangan.</summary>
        <div className="ans">Yuqoridagi manzillarga yozing — tekshirib, darhol olib tashlaymiz.</div>
      </details>
    </div>
  );
}

function FaqRu() {
  return (
    <div className="faq">
      <details open>
        <summary>Шрифты действительно бесплатные?</summary>
        <div className="ans">Да. Любое семейство скачивается со страницы шрифта одним ZIP-архивом — регистрироваться не нужно.</div>
      </details>
      <details>
        <summary>Можно ли использовать их в коммерческом проекте?</summary>
        <div className="ans">
          Шрифты под OFL, Apache и Public Domain — да. У freeware-шрифтов проверьте условия автора: часто они бесплатны
          только для личного использования. Условия — на странице шрифта и в файле LITSENZIYA.txt внутри ZIP. <Link href="/license">Подробнее</Link>.
        </div>
      </details>
      <details>
        <summary>Как узнать, поддерживает ли шрифт узбекские буквы?</summary>
        <div className="ans">На странице каждого шрифта есть отметки «Узбекская латиница» и «Узбекская кириллица»: зелёная — полная поддержка, жёлтая — частичная. В разделе «Знаки» видны все буквы шрифта.</div>
      </details>
      <details>
        <summary>Мой шрифт размещён без разрешения.</summary>
        <div className="ans">Напишите на адреса выше — проверим и сразу уберём.</div>
      </details>
    </div>
  );
}
