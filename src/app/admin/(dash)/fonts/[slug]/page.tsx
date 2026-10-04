import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cssFamily, fontFaceCSS, previewStyle, CATEGORIES, CATEGORY_LABEL } from "@/lib/fonts";
import { saveFamilyAction } from "../../../actions";
import { LICENSE_CLASSES, LICENSE_LABEL, isPublicFamily, isRedistributable } from "@/lib/license";

export const metadata = { title: "Admin — Shriftni tahrirlash" };

export default async function EditFont({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string; uploaded?: string; error?: string }> }) {
  const { slug } = await params;
  const { saved, uploaded, error } = await searchParams;
  const f = await db.family.findUnique({ where: { slug }, include: { styles: { orderBy: [{ italic: "asc" }, { weight: "asc" }] } } });
  if (!f) notFound();

  const styles = f.styles.map((s) => ({ style: s.style, weight: s.weight, italic: s.italic }));
  const faceCSS = fontFaceCSS(slug, styles);
  const pv = previewStyle(styles);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />
      <div className="adm-head">
        <h1 style={{ margin: 0 }}>{f.name}</h1>
        <a href={`/fonts/${slug}`} target="_blank" className="btn btn-sm">↗ Saytda ko&apos;rish</a>
      </div>

      {(saved || uploaded) && (
        <div style={{ background: "#e7f8f0", color: "#065f46", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 18 }}>
          {uploaded ? "Shrift muvaffaqiyatli yuklandi." : "O'zgarishlar saqlandi."}
        </div>
      )}

      {error === "license" && (
        <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 18 }}>
          Litsenziya turini roʻyxatdan tanlang.
        </div>
      )}

      <div style={{ padding: "12px 14px", borderRadius: 10, fontSize: 14, marginBottom: 18, background: isPublicFamily(f) ? "#e7f8f0" : "#fff7e6", color: isPublicFamily(f) ? "#065f46" : "#7a4b00" }}>
        {isPublicFamily(f)
          ? "Saytda koʻrinadi va bepul yuklab olinadi."
          : !isRedistributable(f.licenseClass)
            ? `Saytda koʻrinmaydi: "${f.licenseClass}" litsenziyasi bepul tarqatishga ruxsat bermaydi. Agar bu sizning shriftingiz boʻlsa yoki muallifdan yozma ruxsat olgan boʻlsangiz, litsenziyani "Oʻz shriftimiz" yoki "Tarqatish huquqi tasdiqlangan" qilib saqlang.`
            : "Saytda koʻrinmaydi: \"Chop etilgan\" belgisi oʻchirilgan."}
        {f.copyright && <div style={{ fontSize: 12.5, marginTop: 6, opacity: 0.85 }}>Fayldagi yozuv: {f.copyright}</div>}
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "24px 20px", marginBottom: 24, overflow: "hidden" }}>
        <div style={{ fontFamily: `"${cssFamily(slug)}", var(--font)`, fontWeight: pv?.weight ?? 400, fontSize: 54, lineHeight: 1.1, whiteSpace: "nowrap" }}>
          AaBbCcDdEe 0123
        </div>
        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {f.styleCount} uslub · {f.licenseClass} · {f.glyphs}+ belgi
        </div>
      </div>

      <form action={saveFamilyAction}>
        <input type="hidden" name="slug" value={slug} />
        <div className="field-row">
          <div className="field">
            <label>Toifa</label>
            <select name="category" defaultValue={f.category}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="licenseClass">Litsenziya</label>
            <select id="licenseClass" name="licenseClass" defaultValue={f.licenseClass}>
              {LICENSE_CLASSES.map((c) => <option key={c} value={c}>{LICENSE_LABEL[c] ?? c}</option>)}
            </select>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: -6, marginBottom: 16 }}>
          Barcha shriftlar bepul. Faqat ochiq litsenziyali, freeware yoki tarqatish huquqi tasdiqlangan oilalar saytda koʻrinadi.
          Huquqni tasdiqlash — sizning masʼuliyatingiz.
        </p>
        <div className="field">
          <label>Dizayner</label>
          <input type="text" name="designer" defaultValue={f.designer ?? ""} />
        </div>
        <div className="field">
          <label>Slogan (tagline)</label>
          <input type="text" name="tagline" defaultValue={f.tagline ?? ""} placeholder="Qisqa ta'rif" />
        </div>
        <div className="field">
          <label>Tavsif (asosiy matn / CTA)</label>
          <textarea name="description" rows={4} defaultValue={f.description ?? ""} placeholder="Bo'sh qoldirsangiz metadata asosida avtomatik matn ko'rsatiladi." />
        </div>
        <div className="field">
          <label>Tarixi</label>
          <textarea name="history" rows={3} defaultValue={f.history ?? ""} />
        </div>
        <div className="field">
          <label>Qo&apos;llanilishi</label>
          <textarea name="usage" rows={3} defaultValue={f.usage ?? ""} />
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", margin: "8px 0 22px" }}>
          <label className="check"><input type="checkbox" name="isPublished" defaultChecked={f.isPublished} /> Chop etilgan</label>
          <label className="check"><input type="checkbox" name="isFeatured" defaultChecked={f.isFeatured} /> Tavsiya (bosh sahifa)</label>
          <label className="check"><input type="checkbox" name="isNew" defaultChecked={f.isNew} /> Yangi</label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-accent">Saqlash</button>
          <Link href="/admin/fonts" className="btn">Orqaga</Link>
        </div>
      </form>
    </>
  );
}
