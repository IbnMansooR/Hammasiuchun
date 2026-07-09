import { db } from "@/lib/db";
import { fmtBytes } from "@/lib/format";
import { uploadMediaAction, deleteMediaAction } from "../../actions";
import CopyButton from "@/components/CopyButton";
import ConfirmButton from "@/components/ConfirmButton";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — Rasmlar" };

const UPLOAD_ERRORS: Record<string, string> = {
  type: "Faqat rasm fayllari (JPG, PNG, GIF, WEBP, AVIF) qabul qilinadi.",
  size: "Rasm hajmi juda katta (maksimum 10 MB).",
  content: "Fayl mazmuni kengaytmasiga mos kelmadi (haqiqiy rasm emas).",
};

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const items = await db.media.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <h1>Rasmlar</h1>
      {error && (
        <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 18, maxWidth: 640 }}>
          {UPLOAD_ERRORS[error] ?? "Yuklashda xatolik yuz berdi."}
        </div>
      )}
      <form action={uploadMediaAction}
        style={{ border: "1px dashed var(--line)", borderRadius: 14, padding: 22, marginBottom: 26, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" name="files" multiple accept="image/jpeg,image/png,image/gif,image/webp,image/avif" required />
        <SubmitButton className="btn btn-accent btn-sm" pendingLabel="Yuklanmoqda…">Yuklash</SubmitButton>
        <span className="muted" style={{ fontSize: 13 }}>Bir nechta rasm tanlash mumkin. Maqolalarda URL sifatida ishlating.</span>
      </form>

      {items.length === 0 ? (
        <p className="muted">Hali rasm yuklanmagan.</p>
      ) : (
        <div className="media-grid">
          {items.map((m) => (
            <div className="media-item" key={m.id}>
              <img src={m.url} alt={m.alt ?? ""} />
              <div className="mrow">
                <span className="muted">{fmtBytes(m.size)}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <CopyButton text={m.url} />
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmButton
                      className="chip"
                      style={{ fontSize: 11, padding: "3px 8px", color: "#b91c1c" }}
                      ariaLabel="Rasmni oʻchirish"
                      message="Rasm oʻchirilsinmi? Unga bogʻlangan maqolalarda rasm koʻrinmay qoladi."
                    >
                      ✕
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
