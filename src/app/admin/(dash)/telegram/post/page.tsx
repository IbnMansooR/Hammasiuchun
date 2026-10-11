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
import { posterQuoteOptions } from "@/lib/fontPoster";
import { isQuoteId } from "@/lib/quotes";

export const metadata = { title: "Admin — Kanalga yuborish" };
export const maxDuration = 60; // a font goes out as an album of rendered posters

const ERR: Record<string, string> = {
  empty: "Matn boʻsh boʻlmasin.",
  long: `Matn ${CAPTION_MAX} belgidan oshmasin (Telegram cheklovi).`,
  nochannel: "Avval kanalni ulang.",
  notadmin: "Bot kanalda admin emas yoki post yozish huquqi yoʻq.",
  send: "Telegram postni qabul qilmadi. Birozdan keyin qayta urinib koʻring.",
  unsure: "Telegram vaqtida javob bermadi: post kanalga chiqqan boʻlishi mumkin. Qayta yuborishdan oldin kanalni tekshiring.",
  gone: "Bu shrift yoki ish saytda koʻrinmaydi, shuning uchun yuborib boʻlmaydi.",
};

export default async function TelegramPost({ searchParams }: { searchParams: Promise<{ font?: string; work?: string; digest?: string; q?: string; ok?: string; error?: string }> }) {
  const { font, work, digest, q, ok, error } = await searchParams;
  const draft = digest
    ? await digestDraft()
    : font ? await fontDraft(font, q && isQuoteId(q) ? q : null) : work && /^\d{1,9}$/.test(work) ? await workDraft(Number(work)) : null;
  if (!draft) notFound();
  const [{ channel }, history] = await Promise.all([
    getTgState(),
    db.tgPost.findMany({ where: { kind: draft.kind, ref: draft.ref }, orderBy: { postedAt: "desc" }, take: 5 }),
  ]);
  const ready = botEnabled() && !!channel;
  const options = draft.kind === "font" && draft.quote ? await posterQuoteOptions(draft.ref) : [];
  const optionLabel = (o: (typeof options)[number]) => {
    const t = o.text.replace(/\n/g, " ");
    return `${t.length > 80 ? `${t.slice(0, 78)}…` : t}${o.author ? ` — ${o.author}` : ""}`;
  };

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
          {draft.album && draft.album.length >= 2 ? (
            <div className="adm-tg-album" aria-label="Postdagi rasmlar (albom)">
              {draft.album.map((u, i) => <img key={u} src={u.replace(/^https?:\/\/[^/]+/, "")} alt={`${i + 1}-rasm`} loading="lazy" />)}
            </div>
          ) : draft.image ? <img src={draft.image} alt="Postdagi rasm" /> : <div className="adm-blank">Rasm yoʻq: post faqat matn boʻladi.</div>}
          {options.length > 1 && (
            <form method="get" className="adm-tg-quote">
              <input type="hidden" name="font" value={draft.ref} />
              <label htmlFor="tg-quote">Birinchi rasmdagi iqtibos</label>
              <div className="adm-tg-form">
                <select id="tg-quote" name="q" className="sel" defaultValue={draft.quote ?? undefined}>
                  {[true, false].map((suits) => {
                    const group = options.filter((o) => o.suits === suits);
                    return group.length > 0 && (
                      <optgroup key={String(suits)} label={suits ? "Shriftga mos" : "Boshqa mavzular"}>
                        {group.map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
                <button type="submit" className="btn btn-sm">Almashtirish</button>
              </div>
            </form>
          )}
          <div className="adm-tg-buttons" aria-label={draft.album && draft.album.length >= 2 ? "Matn tagidagi havolalar" : "Post tugmalari"}>
            {draft.keyboard.flat().map((b) => <span key={b.text} className="chip">{b.text}</span>)}
          </div>
        </div>
        <form action={postToChannelAction} className="adm-card adm-pad">
          <input type="hidden" name="kind" value={draft.kind} />
          <input type="hidden" name="ref" value={draft.ref} />
          {draft.quote && <input type="hidden" name="q" value={draft.quote} />}
          <div className="field">
            <label htmlFor="tg-caption">Post matni</label>
            <textarea id="tg-caption" name="caption" rows={12} maxLength={CAPTION_MAX} defaultValue={draft.caption} required />
            <span className="adm-meta">
              Birinchi qator qalin boʻladi. {draft.album && draft.album.length >= 2 ? "Albomga tugma qoʻyib boʻlmaydi: saytga havola matn oxiriga qoʻshiladi." : "Tugma postning tagida turadi."}
            </span>
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
