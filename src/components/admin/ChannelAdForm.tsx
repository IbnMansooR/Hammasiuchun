import Link from "next/link";
import GalleryInput from "./GalleryInput";
import SubmitButton from "@/components/SubmitButton";
import { saveChannelAdAction } from "@/app/admin/adActions";
import { DELETE_AFTER, TEXT_MAX, TEXT_MAX_PHOTO } from "@/lib/channelAds";

/** A date typed and shown in Tashkent time (UTC+5), for <input type="datetime-local">. */
const toLocal = (d: Date) => new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 16);

type Ad = { id: number; advertiser: string | null; text: string; image: string | null; buttonText: string | null; href: string | null; postAt: Date; deleteAfterH: number | null; requestId: number | null };

export default function ChannelAdForm({ ad, preset }: { ad?: Ad; preset?: { advertiser: string; text: string; href: string | null; requestId: number } }) {
  // A new post defaults to the next full hour.
  const next = new Date(Math.ceil((Date.now() + 30 * 60_000) / 3600_000) * 3600_000);
  return (
    <form action={saveChannelAdAction} className="adm-ad-form">
      {ad && <input type="hidden" name="id" value={ad.id} />}
      <input type="hidden" name="requestId" value={ad?.requestId ?? preset?.requestId ?? ""} />
      <section className="adm-card adm-pad">
        <div className="field">
          <label htmlFor="ca-adv">Reklama beruvchi (faqat sizga va hisobotda)</label>
          <input id="ca-adv" name="advertiser" maxLength={120} defaultValue={ad?.advertiser ?? preset?.advertiser ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="ca-text">Post matni</label>
          <textarea id="ca-text" name="text" rows={8} required maxLength={TEXT_MAX} defaultValue={ad?.text ?? preset?.text ?? ""} aria-describedby="ca-text-hint" />
          <span id="ca-text-hint" className="adm-meta">Oddiy matn. Oxiriga avtomatik “#reklama” qoʻshiladi. Rasm bilan {TEXT_MAX_PHOTO} belgigacha, rasmsiz {TEXT_MAX} gacha.</span>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="ca-btn">Tugma matni</label>
            <input id="ca-btn" name="buttonText" maxLength={40} placeholder="Batafsil" defaultValue={ad?.buttonText ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="ca-href">Tugma havolasi (https)</label>
            <input id="ca-href" name="href" maxLength={500} placeholder="https://…" defaultValue={ad?.href ?? preset?.href ?? ""} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="ca-at">Chiqish vaqti (Toshkent)</label>
            <input id="ca-at" type="datetime-local" name="postAt" required defaultValue={toLocal(ad?.postAt ?? next)} />
          </div>
          <div className="field">
            <label htmlFor="ca-del">Kanaldan oʻchirish</label>
            <select id="ca-del" name="deleteAfterH" className="sel" defaultValue={String(ad?.deleteAfterH ?? 0)}>
              {DELETE_AFTER.map((h) => <option key={h} value={h}>{h ? `${h} soatdan keyin` : "Oʻchirmaslik"}</option>)}
            </select>
          </div>
        </div>
        <p className="adm-meta">Telegram botga postni faqat 48 soat ichida oʻchirishga ruxsat beradi, shuning uchun eng uzoq muddat 47 soat.</p>
      </section>
      <section className="adm-card adm-pad">
        <h2 className="adm-h2">Rasm (ixtiyoriy)</h2>
        <GalleryInput cover={ad?.image ?? null} images={ad?.image ? [ad.image] : []} max={1} pickCover={false} allowUrl={false} />
      </section>
      <div style={{ display: "flex", gap: 8 }}>
        <SubmitButton className="btn btn-accent" pendingLabel="Saqlanmoqda…">{ad ? "Saqlash" : "Rejalashtirish"}</SubmitButton>
        <Link href="/admin/ads/channel" className="btn">Bekor qilish</Link>
      </div>
    </form>
  );
}
