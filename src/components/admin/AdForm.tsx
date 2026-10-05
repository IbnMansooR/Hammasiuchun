import Link from "next/link";
import type { Ad } from "@prisma/client";
import { saveAdAction } from "@/app/admin/adActions";
import { PLACEMENTS } from "@/lib/ads";
import SubmitButton from "@/components/SubmitButton";
import GalleryInput from "./GalleryInput";

/** A date typed and shown in Tashkent time (UTC+5), for <input type="datetime-local">. */
const toLocal = (d: Date | null) => (d ? new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 16) : "");

export default function AdForm({ ad }: { ad?: Ad }) {
  return (
    <form action={saveAdAction} className="adm-ad-form">
      {ad && <input type="hidden" name="id" value={ad.id} />}
      <section className="adm-card adm-pad">
        <div className="field">
          <label htmlFor="a-title">Nomi (ichki; rasmning matn tavsifi ham shu)</label>
          <input id="a-title" type="text" name="title" defaultValue={ad?.title ?? ""} required maxLength={120} placeholder="masalan: Dilnoza Studio — yangi kolleksiya" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="a-adv">Reklama beruvchi</label>
            <input id="a-adv" type="text" name="advertiser" defaultValue={ad?.advertiser ?? ""} maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="a-place">Qayerda</label>
            <select id="a-place" name="placement" defaultValue={ad?.placement ?? "home"}>
              {PLACEMENTS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="a-href">Havola (bosilganda ochiladi, faqat https)</label>
          <input id="a-href" type="text" name="href" defaultValue={ad?.href ?? ""} required placeholder="https://…" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="a-start">Boshlanishi (Toshkent vaqti, ixtiyoriy)</label>
            <input id="a-start" type="datetime-local" name="startsAt" defaultValue={toLocal(ad?.startsAt ?? null)} />
          </div>
          <div className="field">
            <label htmlFor="a-end">Tugashi (ixtiyoriy)</label>
            <input id="a-end" type="datetime-local" name="endsAt" defaultValue={toLocal(ad?.endsAt ?? null)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="a-sort">Tartib (kichik, oldinroq; teng boʻlsa navbatma-navbat)</label>
            <input id="a-sort" type="number" name="sortOrder" defaultValue={ad?.sortOrder ?? 0} />
          </div>
          <label className="check" style={{ alignSelf: "end", marginBottom: 22 }}>
            <input type="checkbox" name="isActive" defaultChecked={ad?.isActive ?? true} /> Faol (saytda koʻrsatiladi)
          </label>
        </div>
      </section>

      <section className="adm-card adm-pad">
        <h2 className="adm-h2">Banner rasmi</h2>
        <p className="adm-text muted">Tavsiya: 1200 × 300 px (4:1). Matn va muhim qismlarni markazga qoʻying: telefonda chetlari kesilishi mumkin.</p>
        <GalleryInput cover={ad?.image ?? null} images={ad ? [ad.image] : []} max={1} pickCover={false} allowUrl={false} />
      </section>

      <div style={{ display: "flex", gap: 8 }}>
        <SubmitButton className="btn btn-accent">Saqlash</SubmitButton>
        <Link href="/admin/ads" className="btn">Bekor qilish</Link>
      </div>
    </form>
  );
}
