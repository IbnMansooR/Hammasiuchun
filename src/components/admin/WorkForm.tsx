import Link from "next/link";
import type { Work } from "@prisma/client";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { saveWorkAction } from "@/app/admin/workActions";
import { splitLines, splitTags } from "@/lib/works";
import SubmitButton from "@/components/SubmitButton";
import GalleryInput from "./GalleryInput";
import SlugPicker from "./SlugPicker";

export default async function WorkForm({ work }: { work?: Work }) {
  const w = work;
  const fonts = await db.family.findMany({ where: PUBLIC_FAMILY, select: { slug: true, name: true }, orderBy: { name: "asc" } });

  return (
    <form action={saveWorkAction} className="work-form">
      {w && <input type="hidden" name="id" value={w.id} />}

      <div className="work-form-main">
        <section className="adm-card adm-pad">
          {w?.kind === "member" ? (
            <p className="adm-notice adm-notice-warn" role="note">
              <b>Aʼzo ishi.</b> Foydalanuvchi #{w.submittedById ?? "?"} yuborgan. Chop etish belgisini qoʻysangiz, u tasdiqlanadi va unga xabar boradi.
              <input type="hidden" name="kind" value="member" />
            </p>
          ) : (
          <fieldset className="adm-kind">
            <legend className="adm-legend">Ish turi</legend>
            <label className="adm-kind-opt">
              <input type="radio" name="kind" value="own" defaultChecked={(w?.kind ?? "own") === "own"} />
              <span><b>Mening ishim</b><small>Oʻzingiz yaratgan dizayn</small></span>
            </label>
            <label className="adm-kind-opt">
              <input type="radio" name="kind" value="partner" defaultChecked={w?.kind === "partner"} />
              <span><b>Hamkor ishi</b><small>Boshqa dizaynerni reklama qilish — saytda “Hamkor” deb belgilanadi</small></span>
            </label>
          </fieldset>
          )}

          <div className="field">
            <label htmlFor="w-title">Nomi</label>
            <input id="w-title" type="text" name="title" defaultValue={w?.title ?? ""} required maxLength={200} placeholder="masalan: “Samarqand non” brendingi" />
          </div>
          <div className="field">
            <label htmlFor="w-summary">Qisqa tavsif</label>
            <input id="w-summary" type="text" name="summary" defaultValue={w?.summary ?? ""} maxLength={300} placeholder="Bir jumlada: nima va kim uchun" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="w-author">Muallif / studiya</label>
              <input id="w-author" type="text" name="authorName" defaultValue={w?.authorName ?? ""} maxLength={120} placeholder="Hamkor ishi uchun majburiy" />
            </div>
            <div className="field">
              <label htmlFor="w-url">Muallif portfoliosi</label>
              <input id="w-url" type="text" name="authorUrl" defaultValue={w?.authorUrl ?? ""} placeholder="behance.net/… yoki instagram.com/…" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="w-client">Mijoz</label>
              <input id="w-client" type="text" name="client" defaultValue={w?.client ?? ""} maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="w-year">Yil</label>
              <input id="w-year" type="number" name="year" defaultValue={w?.year ?? new Date().getFullYear()} min={1900} max={2100} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="w-body">Loyiha haqida (Markdown: ## sarlavha, **qalin**, - roʻyxat, [havola](https://…))</label>
            <textarea id="w-body" name="body" rows={10} defaultValue={w?.body ?? ""} className="mono" />
          </div>
        </section>

        <section className="adm-card adm-pad">
          <h2 className="adm-h2">Rasmlar</h2>
          <GalleryInput cover={w?.coverImage ?? null} images={w ? splitLines(w.images) : []} />
        </section>
      </div>

      <div className="work-form-side">
        <section className="adm-card adm-pad">
          <h2 className="adm-h2">Chop etish</h2>
          <label className="check"><input type="checkbox" name="isPublished" defaultChecked={w?.isPublished ?? false} /> Saytda koʻrsatish</label>
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" name="isFeatured" defaultChecked={w?.isFeatured ?? false} /> Tanlangan (birinchi, katta)</label>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="w-sort">Tartib (kichik — oldinroq)</label>
            <input id="w-sort" type="number" name="sortOrder" defaultValue={w?.sortOrder ?? 0} />
          </div>
          <div className="field">
            <label htmlFor="w-slug">URL manzil</label>
            <input id="w-slug" type="text" name="slug" defaultValue={w?.slug ?? ""} placeholder="avtomatik" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <SubmitButton className="btn btn-accent btn-sm">Saqlash</SubmitButton>
            <Link href="/admin/works" className="btn btn-sm">Bekor qilish</Link>
          </div>
        </section>
        <section className="adm-card adm-pad">
          <h2 className="adm-h2">Ishlatilgan shriftlar</h2>
          <p className="adm-text muted">Ish shrift sahifasida “Amalda” boʻlimida ham chiqadi.</p>
          <SlugPicker name="fonts" initial={w ? splitTags(w.fonts) : []} options={fonts} />
        </section>
        <section className="adm-card adm-pad">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="w-tags">Teglar (vergul bilan)</label>
            <input id="w-tags" type="text" name="tags" defaultValue={w?.tags ?? ""} placeholder="brending, logotip, qadoq" />
          </div>
        </section>
      </div>
    </form>
  );
}
