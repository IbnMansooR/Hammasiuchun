import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { readDraft } from "@/lib/aiFonts";
import { acceptDraftAction, draftFontsAction, pairFontsAction, rejectDraftAction } from "@/app/admin/fontAiActions";
import Notice from "@/components/admin/Notice";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — AI matnlar" };
export const maxDuration = 120;

export default async function AiTexts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; detail?: string; n?: string }> }) {
  const { ok, error, detail, n } = await searchParams;
  const [pending, noRu, noPairs] = await Promise.all([
    db.family.findMany({ where: { aiDraft: { not: null }, NOT: { aiDraft: "-" } }, select: { slug: true, name: true, tagline: true, description: true, aiDraft: true }, take: 20 }),
    db.family.count({ where: { ...PUBLIC_FAMILY, descriptionRu: null } }),
    db.family.count({ where: { ...PUBLIC_FAMILY, pairs: null } }),
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
