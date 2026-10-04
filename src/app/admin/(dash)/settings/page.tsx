import { getSiteSettings } from "@/lib/settings";
import { saveSettingsAction } from "../../actions";
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

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const s = await getSiteSettings();

  return (
    <>
      <h1>Sozlamalar</h1>
      <p className="muted" style={{ maxWidth: 640, marginTop: -12, marginBottom: 22 }}>
        Footer ijtimoiy havolalari va aloqa maʼlumotlari. Belgini olib tashlasangiz — havola saytda koʻrinmaydi.
      </p>
      {saved && (
        <div style={{ background: "#e7f8f0", color: "#065f46", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 18, maxWidth: 640 }}>
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
    </>
  );
}
