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
          <p>Litsenziya, to&apos;lov yoki shriftlar bo&apos;yicha savollar uchun biz bilan bog&apos;laning:</p>
          <ul>
            <li>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
            <li>Telegram: <a href={contactTelegram} target="_blank" rel="noreferrer noopener">{tgHandle}</a></li>
          </ul>
          <h3>Ko&apos;p beriladigan savollar</h3>
          <p><strong>Demo shriftlar bepulmi?</strong> Ha, demo oilalarning Regular (va mavjud bo&apos;lsa Kursiv) varianti bepul yuklab olinadi.</p>
          <p><strong>Litsenziyani qanday olaman?</strong> Shrift sahifasidagi &quot;Savatga qo&apos;shish&quot; (yoki pullik shriftlar uchun &quot;Sotib olish&quot;) tugmasi orqali. To&apos;lov tizimi tez orada ulanadi.</p>
        </div>
      </div>
    </div>
  );
}
