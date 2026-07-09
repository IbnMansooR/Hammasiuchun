import { getSiteSettings } from "@/lib/settings";
import { saveSettingsAction } from "../../actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — Sozlamalar" };

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
