import { getSiteSettings } from "@/lib/settings";
import Link from "next/link";
import { changeAdminPasswordAction, saveSearchVerificationAction, saveSettingsAction } from "../../actions";
import { MIN_ADMIN_PASSWORD, adminChats } from "@/lib/adminSecurity";
import { SITE_URL } from "@/lib/site";
import { googleEnabled } from "@/lib/googleAuth";
import { smsEnabled } from "@/lib/eskiz";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — Sozlamalar" };

function StatusBadge({ label, on }: { label: string; on: boolean }) {
  return (
    <span className={`badge${on ? " badge-free" : ""}`} style={{ marginRight: 8 }}>
      {on ? "✓" : "—"} {label}
    </span>
  );
}

const PW_ERRORS: Record<string, string> = {
  current: "Hozirgi parol notoʻgʻri.",
  locked: "Juda koʻp notoʻgʻri urinish. 15 daqiqadan soʻng qayta urining.",
  repeat: "Yangi parol va takrori bir xil emas.",
  same: "Yangi parol eskisidan farq qilishi kerak.",
  short: `Yangi parol kamida ${MIN_ADMIN_PASSWORD} ta belgidan iborat boʻlsin.`,
  long: "Parol juda uzun.",
  username: "Parol ichida login boʻlmasin.",
  common: "Bu parolni topish oson. Boshqasini tanlang.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; pw?: string }> }) {
  const { saved, error, pw } = await searchParams;
  const [s, chats] = await Promise.all([getSiteSettings(), adminChats()]);
  const twoFactorOff = process.env.ADMIN_2FA === "off";

  return (
    <>
      <h1>Sozlamalar</h1>
      <p className="muted" style={{ maxWidth: 640, marginTop: -12, marginBottom: 22 }}>
        Footer ijtimoiy havolalari va aloqa maʼlumotlari. Belgini olib tashlasangiz — havola saytda koʻrinmaydi.
      </p>
      {saved && saved !== "search" && (
        <div className="adm-notice adm-notice-ok" role="status" style={{ maxWidth: 640 }}>
          Sozlamalar saqlandi.
        </div>
      )}

      <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginBottom: 22, maxWidth: 640 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Kirish usullari holati</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <StatusBadge label="Google login" on={googleEnabled} />
          <StatusBadge label="SMS (Eskiz)" on={smsEnabled} />
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>
          Bular Vercel loyihasidagi Environment Variables orqali yoqiladi (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET,
          ESKIZ_EMAIL/ESKIZ_PASSWORD).
        </p>
      </div>

      <form action={saveSettingsAction} style={{ maxWidth: 640 }}>
        <h2 style={{ fontSize: 20, margin: "6px 0 14px" }}>Ijtimoiy tarmoqlar</h2>
        {s.socials.map((soc) => (
          <div key={soc.key} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <label className="check" style={{ marginBottom: 10, fontWeight: 600 }}>
              <input type="checkbox" name={`${soc.key}_on`} defaultChecked={soc.enabled} /> {soc.label} — saytda koʻrsatish
            </label>
            <input
              type="text"
              name={`${soc.key}_url`}
              defaultValue={soc.url}
              placeholder={`${soc.label} havolasi (masalan https://…)`}
            />
          </div>
        ))}

        <h2 style={{ fontSize: 20, margin: "20px 0 14px" }}>Aloqa (Yordam sahifasi)</h2>
        <div className="field">
          <label>Email</label>
          <input type="text" name="contactEmail" defaultValue={s.contactEmail} placeholder="info@feekr.uz" />
        </div>
        <div className="field">
          <label>Telegram havolasi</label>
          <input type="text" name="contactTelegram" defaultValue={s.contactTelegram} placeholder="https://t.me/…" />
        </div>

        <div style={{ marginTop: 16 }}>
          <SubmitButton>Saqlash</SubmitButton>
        </div>
      </form>

      <section id="search" className="adm-card adm-pad adm-search-verify" aria-labelledby="h-search">
        <h2 id="h-search" style={{ fontSize: 20, margin: "0 0 8px" }}>Qidiruv tizimlari</h2>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 0 }}>
          Google va Yandex sayt sizniki ekanini tekshiradi. Ular bergan tasdiqlash kodini shu yerga qoʻying: kod saytning har bir sahifasiga
          <code> &lt;meta&gt;</code> teg boʻlib qoʻshiladi. Butun tegni ham qoʻyishingiz mumkin, kodni oʻzim ajratib olaman.
        </p>
        {saved === "search" && <div className="adm-notice adm-notice-ok" role="status">Saqlandi. Endi Google / Yandex sahifasida “Tasdiqlash” tugmasini bosing.</div>}
        {error === "verification" && <div className="adm-notice adm-notice-error" role="alert">Kod notoʻgʻri koʻrinadi. Google yoki Yandex bergan <code>content="…"</code> ichidagi qiymatni qoʻying.</div>}
        {error === "dns" && (
          <div className="adm-notice adm-notice-error" role="alert">
            Bu DNS (TXT yozuvi) uchun kod: u Search Console’da “Domain” turi tanlanganda beriladi va saytga emas, domen DNS sozlamalariga qoʻshiladi.
            Bu yerda ishlatish uchun Search Console’da <b>“URL prefix”</b> turini tanlang va <b>“HTML tag”</b> usulidagi <code>&lt;meta …&gt;</code> tegini oling.
          </div>
        )}
        {error === "sitemap" && (
          <div className="adm-notice adm-notice-error" role="alert">
            Bu maydonlarga sitemap emas, Google va Yandex bergan <b>tasdiqlash kodi</b> qoʻyiladi. Sitemap Google Search Console va Yandex Webmaster ichida qoʻshiladi (pastda yozilgan).
          </div>
        )}
        <ol className="muted" style={{ fontSize: 13.5, paddingLeft: 20, margin: "0 0 14px" }}>
          <li><b>Google:</b> search.google.com/search-console → “URL prefix” → <code>{SITE_URL}</code> → “HTML tag” usulini tanlang va <code>&lt;meta name="google-site-verification" …&gt;</code> tegini nusxalang.</li>
          <li><b>Yandex:</b> webmaster.yandex.ru → saytni qoʻshing → “Meta-тег” usulini tanlang va <code>&lt;meta name="yandex-verification" …&gt;</code> tegini nusxalang.</li>
          <li>Tegni pastdagi maydonga qoʻyib saqlang, soʻng Google / Yandex sahifasida “Tasdiqlash” tugmasini bosing.</li>
        </ol>
        <form action={saveSearchVerificationAction}>
          <div className="field">
            <label htmlFor="gsv">Google Search Console kodi {s.googleVerification && <span className="badge badge-free">✓ qoʻyilgan</span>}</label>
            <input id="gsv" type="text" name="googleVerification" defaultValue={s.googleVerification} placeholder='masalan: <meta name="google-site-verification" content="…" />' />
          </div>
          <div className="field">
            <label htmlFor="ysv">Yandex Webmaster kodi {s.yandexVerification && <span className="badge badge-free">✓ qoʻyilgan</span>}</label>
            <input id="ysv" type="text" name="yandexVerification" defaultValue={s.yandexVerification} placeholder='masalan: <meta name="yandex-verification" content="…" />' />
          </div>
          <SubmitButton>Kodlarni saqlash</SubmitButton>
        </form>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Sitemap bu yerga yozilmaydi. Sayt tasdiqlangach, uni Google Search Console (“Sitemaps” boʻlimi) va Yandex Webmaster
          (“Индексирование → Файлы Sitemap”) ichida qoʻshing: <code>{SITE_URL}/sitemap.xml</code>
        </p>
      </section>

      <section id="security" className="adm-card adm-pad" aria-labelledby="h-security" style={{ maxWidth: 640, marginTop: 22 }}>
        <h2 id="h-security" style={{ fontSize: 20, margin: "0 0 8px" }}>Xavfsizlik</h2>
        {chats.length > 0 && !twoFactorOff ? (
          <p className="adm-notice adm-notice-ok" role="status" style={{ marginTop: 0 }}>
            ✓ Ikki bosqichli kirish yoqilgan: parol toʻgʻri boʻlsa ham, kirish uchun admin Telegramiga kelgan kod kerak ({chats.length} ta Telegram).
            Har bir kirish va shubhali urinish haqida Telegramga xabar keladi.
          </p>
        ) : (
          <p className="adm-notice adm-notice-error" role="alert" style={{ marginTop: 0 }}>
            {twoFactorOff
              ? "Ikki bosqichli kirish Vercel’da ADMIN_2FA=off bilan oʻchirilgan. Hozir panelga faqat parol bilan kiriladi."
              : <>Ikki bosqichli kirish yoqilmagan: panelga faqat parol bilan kiriladi. <Link href="/admin/telegram#admins" className="link">Telegramingizni ulang</Link>, shunda har kirishda Telegramga kod keladi.</>}
          </p>
        )}
        <h3 style={{ fontSize: 16, margin: "18px 0 8px" }}>Parolni almashtirish</h3>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 0 }}>
          Kamida {MIN_ADMIN_PASSWORD} ta belgi. Almashtirgach, boshqa barcha qurilmalardagi kirishlar bekor boʻladi.
        </p>
        {pw === "ok" && <div className="adm-notice adm-notice-ok" role="status">Parol almashtirildi. Boshqa qurilmalardan chiqildi.</div>}
        {pw && pw !== "ok" && <div className="adm-notice adm-notice-error" role="alert">{PW_ERRORS[pw] ?? "Xatolik yuz berdi."}</div>}
        <form action={changeAdminPasswordAction}>
          <div className="field">
            <label htmlFor="pw-current">Hozirgi parol</label>
            <input id="pw-current" type="password" name="current" autoComplete="current-password" required />
          </div>
          <div className="field">
            <label htmlFor="pw-next">Yangi parol</label>
            <input id="pw-next" type="password" name="next" autoComplete="new-password" minLength={MIN_ADMIN_PASSWORD} required />
          </div>
          <div className="field">
            <label htmlFor="pw-repeat">Yangi parol (takror)</label>
            <input id="pw-repeat" type="password" name="repeat" autoComplete="new-password" minLength={MIN_ADMIN_PASSWORD} required />
          </div>
          <SubmitButton pendingLabel="Saqlanmoqda…">Parolni almashtirish</SubmitButton>
        </form>
      </section>
    </>
  );
}
