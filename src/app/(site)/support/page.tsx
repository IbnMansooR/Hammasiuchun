import { getSiteSettings } from "@/lib/settings";

export const metadata = { title: "Yordam" };

export default async function SupportPage() {
  const { contactEmail, contactTelegram } = await getSiteSettings();
  const tgHandle = contactTelegram.replace(/^https?:\/\/t\.me\//, "@").replace(/\/$/, "");
  return (
    <div className="container section" style={{ paddingTop: 40 }}>
      <div style={{ maxWidth: 720 }}>
        <div className="eyebrow">Yordam</div>
        <h1 style={{ fontSize: "clamp(32px,5vw,60px)" }}>Savolingiz bormi?</h1>
        <div className="prose" style={{ marginTop: 20 }}>
          <p>Litsenziya yoki shriftlar boʻyicha savollar uchun biz bilan bogʻlaning:</p>
          <ul>
            <li>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
            <li>Telegram: <a href={contactTelegram} target="_blank" rel="noreferrer noopener">{tgHandle}</a></li>
          </ul>
          <h2>Koʻp beriladigan savollar</h2>
          <p><strong>Shriftlar haqiqatan bepulmi?</strong> Ha. Har bir oilani shrift sahifasidan bitta ZIP qilib yuklab olasiz.</p>
          <p><strong>Tijoriy loyihada ishlatsam boʻladimi?</strong> OFL, Apache va Public Domain shriftlari — ha. Freeware shriftlarda muallif shartlarini tekshiring: ular koʻpincha faqat shaxsiy foydalanish uchun bepul. Shartlar shrift sahifasida va ZIP ichidagi LITSENZIYA.txt faylida.</p>
          <p><strong>Mening shriftim ruxsatsiz joylangan.</strong> Yuqoridagi manzillarga yozing — darhol olib tashlaymiz.</p>
        </div>
      </div>
    </div>
  );
}
