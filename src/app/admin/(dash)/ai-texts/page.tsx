import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { readDraft } from "@/lib/aiFonts";
import { getArticleAuto, readQuoteDrafts } from "@/lib/aiIdeas";
import { INDUSTRIES, getFill, libraryCount } from "@/lib/brandKit";
import { MOOD_LABEL } from "@/lib/quotes";
import { acceptDraftAction, acceptQuoteAction, draftArticleNowAction, draftFontsAction, draftQuotesAction, pairFontsAction, rejectDraftAction, rejectQuoteAction, saveArticleAutoAction, saveBrandFillAction, fillBrandNowAction, translateArticlesAction } from "@/app/admin/fontAiActions";
import Notice from "@/components/admin/Notice";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — AI matnlar" };
export const maxDuration = 120;

export default async function AiTexts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; detail?: string; n?: string }> }) {
  const { ok, error, detail, n } = await searchParams;
  const [quotes, auto, fill, lib] = await Promise.all([readQuoteDrafts(), getArticleAuto(), getFill(), libraryCount()]);
  const [pending, noRu, noPairs, artNoRu] = await Promise.all([
    db.family.findMany({ where: { aiDraft: { not: null }, NOT: { aiDraft: "-" } }, select: { slug: true, name: true, tagline: true, description: true, aiDraft: true }, take: 20 }),
    db.family.count({ where: { ...PUBLIC_FAMILY, descriptionRu: null } }),
    db.family.count({ where: { ...PUBLIC_FAMILY, pairs: null } }),
    db.article.count({ where: { isPublished: true, bodyRu: null } }),
  ]);
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>AI matnlar</h1>
          <p className="adm-sub">Shriftlar uchun oʻzbekcha va ruscha tavsif qoralamalari hamda mos juftliklar. Qoralama faqat bazadagi faktlardan tuziladi va siz tasdiqlamaguncha saytga chiqmaydi.</p>
        </div>
      </div>
      {ok === "drafted" && <Notice>{`${n} ta qoralama tayyor, pastda koʻring.`}</Notice>}
      {ok === "paired" && <Notice>{`${n} ta shrift uchun juftlik topildi, shrift sahifalarida koʻrinadi.`}</Notice>}
      {ok === "accepted" && <Notice>Tasdiqlandi.</Notice>}
      {ok === "rejected" && <Notice>Rad etildi.</Notice>}
      {ok === "translated" && <Notice>{`${n} ta maqola ruschaga tarjima qilindi: /ru/blog da koʻrinadi.`}</Notice>}
      {error === "translate" && <Notice tone="error">{`Bajarilmadi: ${(detail ?? "").slice(0, 200)}`}</Notice>}
      {ok === "brandfill" && <Notice>{`${n} ta yangi palitra qoʻshildi.`}</Notice>}
      {error === "brandfill" && <Notice tone="error">{`Bajarilmadi: ${(detail ?? "").slice(0, 200)}`}</Notice>}
      {ok === "quotes" && <Notice>{`${n} ta ibora tayyor, pastda koʻring.`}</Notice>}
      {ok === "quoteadded" && <Notice>Ibora qoʻshildi: postlarda ishlatiladi.</Notice>}
      {ok === "saved" && <Notice>Saqlandi.</Notice>}
      {ok === "article" && <Notice>Maqola qoralamasi tayyor: Telegramda va “Maqolalar” boʻlimida.</Notice>}
      {(error === "quotes" || error === "article" || error === "sched") && <Notice tone="error">{`Bajarilmadi: ${(detail ?? "").slice(0, 200)}`}</Notice>}
      {(error === "draft" || error === "pair") && <Notice tone="error">{`Bajarilmadi: ${(detail ?? "").slice(0, 200)}`}</Notice>}
      {error === "gone" && <Notice tone="error">Qoralama topilmadi.</Notice>}

      <section className="adm-card adm-pad" aria-labelledby="h-run">
        <h2 className="adm-h2" id="h-run">Yangi qoralamalar</h2>
        <p className="adm-text">Ruscha matni yoʻq shriftlar: <strong>{noRu}</strong>. Juftligi yoʻq shriftlar: <strong>{noPairs}</strong>. Har bosishda 4 ta tavsif yoki 6 ta juftlik tayyorlanadi (taxminan $0.02).</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <form action={draftFontsAction}><SubmitButton className="btn btn-sm" pendingLabel="…">4 ta tavsif qoralamasi</SubmitButton></form>
          <form action={pairFontsAction}><SubmitButton className="btn btn-sm" pendingLabel="…">6 ta shrift uchun juftlik</SubmitButton></form>
        </div>
      </section>

      <section className="adm-card adm-pad" aria-labelledby="h-quotes">
        <h2 className="adm-h2" id="h-quotes">Iqtibos gʻoyalari</h2>
        <p className="adm-text">Poster uchun yangi oʻzbekcha iboralar (muallifsiz, toʻqima). Qoʻshsangiz, Telegram postlarida ishlatiladi. Bosish: 8 ta ibora, taxminan $0.01.</p>
        <form action={draftQuotesAction}><SubmitButton className="btn btn-sm" pendingLabel="…">8 ta ibora yozish</SubmitButton></form>
        {quotes.map((q) => (
          <div key={q.id} style={{ marginTop: 14 }}>
            <p className="adm-text">«{q.text}» <span className="adm-meta">{MOOD_LABEL[q.mood]}</span></p>
            <div style={{ display: "flex", gap: 10 }}>
              <form action={acceptQuoteAction}><input type="hidden" name="id" value={q.id} /><SubmitButton className="btn btn-sm" pendingLabel="…">Qoʻshish</SubmitButton></form>
              <form action={rejectQuoteAction}><input type="hidden" name="id" value={q.id} /><SubmitButton className="btn btn-sm" pendingLabel="…">Rad etish</SubmitButton></form>
            </div>
          </div>
        ))}
      </section>

      <section className="adm-card adm-pad" aria-labelledby="h-brand">
        <h2 className="adm-h2" id="h-brand">Brend palitralari kutubxonasi</h2>
        <p className="adm-text">Saytdagi <a className="link" href="/brend">/brend</a> sahifasi uchun tayyor shablonlar: soha va kayfiyat boʻyicha 5 rangli palitra va 2 shrift. AI ularni bir marta yozadi, kod esa kontrast va oʻxshashlikni tekshiradi. Keyin hammasi bazadan beriladi, API kerak emas. Hozir: <strong>{lib.total}</strong> ta, maqsad: <strong>{fill.target}</strong>. Har 5 daqiqada bitta soha uchun 10 tagacha qoʻshiladi (1 chaqiruv, taxminan $0.01).</p>
        <form action={saveBrandFillAction} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label><input type="checkbox" name="on" defaultChecked={fill.on} /> Avtomatik toʻldirish yoqilgan</label>
          <label>Maqsad <input type="number" name="target" min={20} max={1000} defaultValue={fill.target} style={{ width: 90 }} /></label>
          <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
        </form>
        <form action={fillBrandNowAction} style={{ marginTop: 10 }}><SubmitButton className="btn btn-sm" pendingLabel="Yozilmoqda…">Hozir 10 ta qoʻshish</SubmitButton></form>
        <p className="adm-meta" style={{ marginTop: 10 }}>{INDUSTRIES.map(([k, v]) => `${v}: ${lib.byIndustry.get(k) ?? 0}`).join(" · ")}</p>
      </section>

      <section className="adm-card adm-pad" aria-labelledby="h-ru">
        <h2 className="adm-h2" id="h-ru">Maqolalarning ruscha nusxasi</h2>
        <p className="adm-text">Yangi maqola va yangilik chop etilganda ruscha tarjimasi oʻzi tayyorlanadi (Sonnet bilan, taxminan $0.02 dan $0.05 gacha). Tarjimasi yoʻq maqolalar: <strong>{artNoRu}</strong>. Oʻzbekcha matni tahrirlansa, tarjima qayta qilinadi.</p>
        <form action={translateArticlesAction}><SubmitButton className="btn btn-sm" pendingLabel="Tarjima qilinmoqda…">3 ta maqolani tarjima qilish</SubmitButton></form>
      </section>

      <section className="adm-card adm-pad" aria-labelledby="h-art">
        <h2 className="adm-h2" id="h-art">Haftalik maqola qoralamasi</h2>
        <p className="adm-text">Haftada bir marta AI saytdagi haqiqiy shriftlar haqida maqola yozadi. U <strong>chop etilmaydi</strong>: sizga Telegramda keladi, ✅ bossangiz saytga chiqadi. Har biri taxminan $0.03.</p>
        <form action={saveArticleAutoAction} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label><input type="checkbox" name="on" defaultChecked={auto.on} /> Yoqilgan</label>
          <label>Kun <select name="day" defaultValue={auto.day}>{["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></label>
          <label>Vaqt <input type="time" name="time" defaultValue={auto.time} required /></label>
          <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
        </form>
        <form action={draftArticleNowAction} style={{ marginTop: 10 }}><SubmitButton className="btn btn-sm" pendingLabel="Yozilmoqda…">Hozir qoralama yozish</SubmitButton></form>
      </section>

      {pending.map((f) => {
        const d = readDraft(f.aiDraft);
        if (!d) return null;
        return (
          <section key={f.slug} className="adm-card adm-pad" aria-label={f.name}>
            <h2 className="adm-h2">{f.name}</h2>
            <p className="adm-text"><strong>Oʻzbekcha:</strong> {d.tagline}<br />{d.description}</p>
            <p className="adm-text"><strong>Ruscha:</strong> {d.taglineRu}<br />{d.descriptionRu}</p>
            {(f.tagline || f.description) && <p className="adm-meta">Oʻzbekcha matn allaqachon yozilgan: tasdiqlasangiz faqat ruscha qoʻshiladi.</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <form action={acceptDraftAction}><input type="hidden" name="slug" value={f.slug} /><SubmitButton className="btn btn-sm" pendingLabel="…">Tasdiqlash</SubmitButton></form>
              <form action={rejectDraftAction}><input type="hidden" name="slug" value={f.slug} /><SubmitButton className="btn btn-sm" pendingLabel="…">Rad etish</SubmitButton></form>
            </div>
          </section>
        );
      })}
    </>
  );
}
