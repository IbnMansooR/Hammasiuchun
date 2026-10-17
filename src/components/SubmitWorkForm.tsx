"use client";
import { useRef, useState, useTransition } from "react";
import { submitWorkAction } from "@/app/(site)/dizaynerlar/actions";
import GalleryInput from "@/components/admin/GalleryInput";
import SlugPicker from "@/components/admin/SlugPicker";
import { useLocale, useT } from "@/i18n/client";

/** The member's submission form. It sends through the server action by hand, so a problem
 * (a missing author, a bad link…) never clears what was typed or uploaded. */
export default function SubmitWorkForm({ userName, fonts }: { userName: string; fonts: { slug: string; name: string }[] }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const alertRef = useRef<HTMLDivElement>(null);
  const t = useT().works;
  const locale = useLocale();

  return (
    <form
      className="submit-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("locale", locale);
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
          {t.errors[error] ?? t.errorOther}
        </div>
      )}
      <div className="field">
        <label htmlFor="s-title">{t.fTitle}</label>
        <input id="s-title" type="text" name="title" required minLength={3} maxLength={120} placeholder={t.fTitlePh} />
      </div>
      <div className="field">
        <label htmlFor="s-summary">{t.fSummary}</label>
        <input id="s-summary" type="text" name="summary" maxLength={300} placeholder={t.fSummaryPh} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="s-author">{t.fAuthor}</label>
          <input id="s-author" type="text" name="authorName" required maxLength={120} defaultValue={userName} />
        </div>
        <div className="field">
          <label htmlFor="s-url">{t.fUrl}</label>
          <input id="s-url" type="text" name="authorUrl" placeholder={t.fUrlPh} />
        </div>
      </div>
      <div className="field">
        <span className="label-like">{t.fImages}</span>
        <GalleryInput cover={null} images={[]} endpoint="/api/me/upload" max={8} allowUrl={false} pickCover={false} />
      </div>
      <div className="field">
        <span className="label-like">{t.fFonts}</span>
        <SlugPicker name="fonts" initial={[]} options={fonts} />
      </div>
      <div className="field">
        <label htmlFor="s-body">{t.fBody}</label>
        <textarea id="s-body" name="body" rows={6} maxLength={1500} placeholder={t.fBodyPh} />
      </div>
      <p className="muted" style={{ fontSize: 13, maxWidth: "62ch" }}>
        {t.consent}
      </p>
      <button className="btn btn-primary btn-lg" disabled={pending} aria-busy={pending}>
        {pending ? t.sending : t.send}
      </button>
    </form>
  );
}
