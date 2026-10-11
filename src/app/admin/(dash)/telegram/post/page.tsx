import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { botEnabled } from "@/lib/telegram";
import { getTgState } from "@/lib/tgState";
import { CAPTION_MAX, digestDraft, fontDraft, workDraft } from "@/lib/tgPosts";
import Notice from "@/components/admin/Notice";
import SubmitButton from "@/components/SubmitButton";
import { postToChannelAction } from "@/app/admin/telegramActions";

export const metadata = { title: "Admin — Kanalga yuborish" };

const ERR: Record<string, string> = {
  empty: "Matn boʻsh boʻlmasin.",
  long: `Matn ${CAPTION_MAX} belgidan oshmasin (Telegram cheklovi).`,
  nochannel: "Avval kanalni ulang.",
  notadmin: "Bot kanalda admin emas yoki post yozish huquqi yoʻq.",
  send: "Telegram postni qabul qilmadi. Birozdan keyin qayta urinib koʻring.",
  gone: "Bu shrift yoki ish saytda koʻrinmaydi, shuning uchun yuborib boʻlmaydi.",
};

export default async function TelegramPost({ searchParams }: { searchParams: Promise<{ font?: string; work?: string; digest?: string; ok?: string; error?: string }> }) {
  const { font, work, digest, ok, error } = await searchParams;
  const draft = digest
    ? await digestDraft()
    : font ? await fontDraft(font) : work && /^\d{1,9}$/.test(work) ? await workDraft(Number(work)) : null;
  if (!draft) notFound();
  const [{ channel }, history] = await Promise.all([
    getTgState(),
    db.tgPost.findMany({ where: { kind: draft.kind, ref: draft.ref }, orderBy: { postedAt: "desc" }, take: 5 }),
  ]);
  const ready = botEnabled() && !!channel;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Kanalga yuborish</h1>
          <p className="adm-sub">{draft.kind === "digest" ? "Haftalik dayjest (oxirgi 7 kun)" : `${draft.kind === "font" ? "Shrift" : "Ish"}: ${draft.title}`}</p>
        </div>
        <Link href={draft.backHref} className="btn btn-sm">Orqaga</Link>
      </div>

      {ok === "posted" && <Notice>Kanalga yuborildi ✓</Notice>}
      {error && <Notice tone="error">{ERR[error] ?? "Xatolik yuz berdi."}</Notice>}
      {!ready && (
        <Notice tone="warn">
          Kanal ulanmagan. <Link href="/admin/telegram#channel" className="link">Telegram sozlamalari →</Link>
        </Notice>
      )}
      {history.length > 0 && (
        <Notice tone="warn">Bu {draft.kind === "font" ? "shrift" : draft.kind === "digest" ? "bugungi dayjest" : "ish"} avval yuborilgan: {history.map((h) => formatDateTime(h.postedAt)).join(", ")}.</Notice>
      )}

      <div className="adm-tg-compose">
        <div className="adm-tg-preview">
          {draft.image ? <img src={draft.image} alt="Postdagi rasm" /> : <div className="adm-blank">Rasm yoʻq: post faqat matn boʻladi.</div>}
          <div className="adm-tg-buttons" aria-label="Post tugmalari">
            {draft.keyboard.flat().map((b) => <span key={b.text} className="chip">{b.text}</span>)}
          </div>
        </div>
        <form action={postToChannelAction} className="adm-card adm-pad">
          <input type="hidden" name="kind" value={draft.kind} />
          <input type="hidden" name="ref" value={draft.ref} />
          <div className="field">
            <label htmlFor="tg-caption">Post matni</label>
            <textarea id="tg-caption" name="caption" rows={12} maxLength={CAPTION_MAX} defaultValue={draft.caption} required />
            <span className="adm-meta">Birinchi qator qalin boʻladi. Tugma postning tagida turadi.</span>
          </div>
          <label className="check" style={{ margin: "4px 0 18px" }}>
            <input type="checkbox" name="silent" /> Ovozsiz yuborish (obunachilarga signal bermaydi)
          </label>
          <SubmitButton className="btn btn-accent" pendingLabel="Yuborilmoqda…" disabled={!ready}>
            {channel ? `“${channel.title || channel.username || "Kanal"}” kanaliga yuborish` : "Kanalga yuborish"}
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
