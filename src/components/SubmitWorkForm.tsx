"use client";
import { useRef, useState, useTransition } from "react";
import { submitWorkAction } from "@/app/(site)/dizaynerlar/actions";
import GalleryInput from "@/components/admin/GalleryInput";
import SlugPicker from "@/components/admin/SlugPicker";

const ERRORS: Record<string, string> = {
  title: "Ish nomi kamida 3 ta belgidan iborat boʻlsin.",
  author: "Muallif yoki studiya nomini yozing.",
  link: "Portfolio havolasi notoʻgʻri. Masalan: behance.net/ismingiz",
  images: "Kamida bitta rasm yuklang (koʻpi bilan 8 ta).",
  pending: "Sizda koʻrib chiqilayotgan 5 ta ish bor. Ular hal boʻlgach, yangisini yuborishingiz mumkin.",
  limit: "Bugun juda koʻp ish yuborildi. Ertaga qayta urinib koʻring.",
};

/** The member's submission form. It sends through the server action by hand, so a problem
 * (a missing author, a bad link…) never clears what was typed or uploaded. */
export default function SubmitWorkForm({ userName, fonts }: { userName: string; fonts: { slug: string; name: string }[] }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const alertRef = useRef<HTMLDivElement>(null);

  return (
    <form
      className="submit-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError("");
        start(async () => {
          const res = await submitWorkAction(fd); // success redirects to the thanks page
          if (res?.error) {
            setError(res.error);
            requestAnimationFrame(() => { alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); alertRef.current?.focus(); });
          }
        });
      }}
    >
      {error && (
        <div className="alert alert-error" role="alert" tabIndex={-1} ref={alertRef}>
          {ERRORS[error] ?? "Xatolik yuz berdi. Qayta urinib koʻring."}
        </div>
      )}
      <div className="field">
        <label htmlFor="s-title">Ish nomi</label>
        <input id="s-title" type="text" name="title" required minLength={3} maxLength={120} placeholder="masalan: “Samarqand non” brendingi" />
      </div>
      <div className="field">
        <label htmlFor="s-summary">Qisqa tavsif</label>
        <input id="s-summary" type="text" name="summary" maxLength={300} placeholder="Bir jumlada: nima va kim uchun" />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="s-author">Muallif yoki studiya</label>
          <input id="s-author" type="text" name="authorName" required maxLength={120} defaultValue={userName} />
        </div>
        <div className="field">
          <label htmlFor="s-url">Portfolio havolasi (ixtiyoriy)</label>
          <input id="s-url" type="text" name="authorUrl" placeholder="behance.net/ismingiz" />
        </div>
      </div>
      <div className="field">
        <span className="label-like">Rasmlar (birinchisi muqova boʻladi)</span>
        <GalleryInput cover={null} images={[]} endpoint="/api/me/upload" max={8} allowUrl={false} pickCover={false} />
      </div>
      <div className="field">
        <span className="label-like">Ishlatilgan shriftlar (ixtiyoriy)</span>
        <SlugPicker name="fonts" initial={[]} options={fonts} />
      </div>
      <div className="field">
        <label htmlFor="s-body">Loyiha haqida (ixtiyoriy)</label>
        <textarea id="s-body" name="body" rows={6} maxLength={1500} placeholder="Vazifa nima edi, qanday yechim topdingiz?" />
      </div>
      <p className="muted" style={{ fontSize: 13, maxWidth: "62ch" }}>
        Yuborish bilan siz ish sizniki ekaniga yoki uni koʻrsatishga ruxsatingiz borligiga rozilik berasiz. Ish tekshiruvdan oʻtmaguncha saytda koʻrinmaydi.
      </p>
      <button className="btn btn-primary btn-lg" disabled={pending} aria-busy={pending}>
        {pending ? "Yuborilmoqda…" : "Koʻrib chiqishga yuborish"}
      </button>
    </form>
  );
}
