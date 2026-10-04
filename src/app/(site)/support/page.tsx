import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";

export const metadata = { title: "Yordam", description: "Feekr bilan bogʻlanish va koʻp beriladigan savollar.", alternates: { canonical: "/support" } };

export default async function SupportPage() {
  const { contactEmail, contactTelegram } = await getSiteSettings();
  const tgHandle = contactTelegram.replace(/^https?:\/\/t\.me\//, "@").replace(/\/$/, "");
  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">Yordam</div>
        <h1>Savolingiz bormi?</h1>
        <p className="lead">Litsenziya, shriftlar yoki sayt boʻyicha yozing — odatda bir kun ichida javob beramiz.</p>
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
        <div className="section-head"><h2 id="faq-h">Koʻp beriladigan savollar</h2></div>
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
      </section>
    </div>
  );
}
