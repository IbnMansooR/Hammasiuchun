import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getTgState } from "@/lib/tgState";
import { searchPeople } from "@/lib/wikidata";
import { DESIGNER_EVERY, NEWS_PER_DAY, getContent } from "@/lib/contentScout";
import {
  addDesignerAction, addFeedAction, decideContentAction, decideNewsAction, deleteDesignerAction, removeFeedAction, runContentNowAction,
  saveContentSettingsAction, saveDesignerAction, searchDesignerAction, toggleDesignerAction, toggleFeedAction,
} from "@/app/admin/contentActions";
import Notice from "@/components/admin/Notice";
import SubmitButton from "@/components/SubmitButton";
import { translationOn } from "@/lib/translate";
import ConfirmButton from "@/components/ConfirmButton";

export const metadata = { title: "Admin — Yangilik va dizayner profillari" };
export const maxDuration = 60; // approving saves a picture and may post to the channel

const OK: Record<string, string> = {
  saved: "Saqlandi.",
  feed: "Lenta qoʻshildi.",
  feedremoved: "Lenta oʻchirildi.",
  rejected: "Taklif rad etildi: u boshqa taklif qilinmaydi.",
  deleted: "Profil oʻchirildi: u boshqa taklif qilinmaydi.",
  added: "Saytga qoʻshildi ✓",
  addedposted: "Saytga qoʻshildi va kanalga chiqdi ✓",
};
const ERR: Record<string, string> = {
  time: "Vaqtni SS:DD koʻrinishida kiriting (masalan 12:00).",
  count: "Sonni roʻyxatdan tanlang.",
  full: "Koʻrib chiqilmagan takliflar koʻp (20 ta). Avval ularni qoʻshing yoki rad eting.",
  none: "Hozir yangi taklif topilmadi: lentalar yangi narsa bermadi yoki barcha dizaynerlar koʻrib chiqilgan.",
  feedname: "Lenta nomini yozing.",
  feedurl: "Lenta manzili https:// bilan boshlanishi kerak.",
  feedread: "Bu manzildan yangiliklar oʻqilmadi. RSS yoki Atom lenta manzilini tekshiring.",
  feedmany: "Lentalar 12 tadan oshmasin.",
  gone: "Bu taklif allaqachon koʻrib chiqilgan.",
  title: "Sarlavha juda qisqa.",
  exists: "Bu allaqachon saytda bor.",
  failed: "Saqlab boʻlmadi. Birozdan keyin qayta urinib koʻring.",
  notdesigner: "Wikidata javob bermadi yoki bu odam dizayner sifatida topilmadi.",
  q: "Ismni yozing (kamida 2 harf).",
  summary: "Matn boʻsh boʻlmasin.",
};

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; n?: string; d?: string; q?: string; to?: string }> }) {
  const { ok, error, n, d, q, to } = await searchParams;
  const [st, tg, designers, results] = await Promise.all([
    getContent(),
    getTgState(),
    db.designer.findMany({ orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take: 100 }),
    q ? searchPeople(q).catch(() => null) : Promise.resolve(undefined),
  ]);
  const have = new Set(designers.map((x) => x.wikidataId));
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Yangilik va dizayner profillari</h1>
          <p className="adm-sub">Bot har kuni sizga dizayn yangiliklari va mashhur dizaynerlar profilini taklif qiladi; ✅ bosilsa, saytga (va xohlasangiz kanalga) chiqadi.</p>
        </div>
        <Link href="/dizaynerlar/profil" className="btn btn-sm">Profillar sahifasi ↗</Link>
      </div>
      {ok === "offered" && <Notice>{`${n ?? 0} ta yangilik va ${d ?? 0} ta dizayner taklif qilindi: pastdagi roʻyxatda va Telegramingizda.`}</Notice>}
      {ok && OK[ok] && <Notice>{OK[ok]}{to && /^\/[A-Za-z0-9/_-]+$/.test(to) && <> <Link href={to} className="link">Koʻrish ↗</Link></>}</Notice>}
      {error && <Notice tone="error">{ERR[error] ?? "Xatolik yuz berdi."}</Notice>}

      <section className="adm-card adm-pad" id="settings" aria-labelledby="h-set">
        <h2 className="adm-h2" id="h-set">1. Sozlama</h2>
        <p className="adm-text">
          Yangiliklar uchun faqat nashriyotning oʻz qisqa mazmuni va asl maqolaga havola olinadi, rasmlar va toʻliq matn koʻchirilmaydi.
          Dizayner profillari Wikidata (CC0) faktlaridan va Wikimedia Commons’dagi erkin litsenziyali rasmlardan tuziladi, muallifi koʻrsatiladi.
        </p>
        <form action={saveContentSettingsAction} className="adm-tg-auto-form">
          <label className="check"><input type="checkbox" name="on" defaultChecked={st.on} /> Yoqilgan</label>
          <label className="adm-tg-scout-field"><span>Vaqti (Toshkent)</span><input type="time" name="time" defaultValue={st.time} required /></label>
          <label className="adm-tg-scout-field">
            <span>Yangilik, kuniga</span>
            <select name="news" className="sel" defaultValue={String(st.news)}>
              {NEWS_PER_DAY.map((k) => <option key={k} value={k}>{k ? `${k} ta` : "Kerak emas"}</option>)}
            </select>
          </label>
          <label className="adm-tg-scout-field">
            <span>Dizayner profili</span>
            <select name="designerDays" className="sel" defaultValue={String(st.designerDays)}>
              {DESIGNER_EVERY.map((k) => <option key={k} value={k}>{k === 0 ? "Kerak emas" : k === 1 ? "Har kuni" : k === 7 ? "Haftada bir" : `${k} kunda bir`}</option>)}
            </select>
          </label>
          <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
        </form>
        <p className="adm-meta">{translationOn() ? "Yangiliklar avtomatik oʻzbekchaga tarjima qilinadi; ✅ dan oldin matnni tahrirlash mumkin." : "Avtomatik tarjima oʻchiq (ANTHROPIC_API_KEY qoʻyilmagan): yangilik matnini oʻzingiz oʻzbekchaga yozasiz."}</p>
        <p className="adm-meta">{tg.admins.length === 0 ? "Telegramingiz ulanmagan: takliflar faqat shu yerda chiqadi." : st.on ? `Takliflar har kuni ${st.time} da Telegramingizga keladi.` : "Oʻchirilgan: takliflar faqat “Hozir taklif olish” bilan."}</p>
      </section>

      <section className="adm-card adm-pad" id="offers" aria-labelledby="h-off">
        <h2 className="adm-h2" id="h-off">2. Kutayotgan takliflar</h2>
        {st.pending.length === 0 ? (
          <p className="adm-text">Koʻrib chiqilmagan taklif yoʻq.</p>
        ) : (
          <ul className="adm-req-list">
            {st.pending.map((o) => (
              <li key={o.id} className="adm-req">
                <div className="adm-req-head">
                  <strong>{o.news ? (o.news.uz ?? o.news).title : o.designer!.facts.name}</strong>
                  <span className="adm-meta">{o.news ? `Yangilik · ${o.news.source}` : "Dizayner profili"} · {formatDateTime(o.at)}</span>
                </div>
                {o.news ? (
                  <>
                    <p className="adm-meta">{o.news.uz ? `Oʻzbekchaga tarjima qilingan. Asl sarlavha: ${o.news.title}` : "Tarjima yoʻq: inglizcha matnni oʻzbekchaga oʻzingiz yozing."}</p>
                    <form action={decideContentAction} className="adm-tg-auto-form">
                      <input type="hidden" name="id" value={o.id} />
                      <label className="adm-tg-scout-field"><span>Sarlavha</span><input name="title" defaultValue={(o.news.uz ?? o.news).title} maxLength={200} required /></label>
                      <label className="adm-tg-scout-field"><span>Qisqa matn</span><textarea name="excerpt" rows={3} maxLength={400} defaultValue={(o.news.uz ?? o.news).excerpt} /></label>
                      <p className="adm-meta"><a className="link" href={o.news.link} target="_blank" rel="noopener nofollow">Asl maqola ↗</a></p>
                      <div className="adm-tg-link">
                        <button className="btn btn-accent btn-sm" formAction={decideNewsAction.bind(null, "both")}>✅ Sayt + kanal</button>
                        <button className="btn btn-sm" formAction={decideNewsAction.bind(null, "site")}>🌐 Faqat sayt</button>
                        <button className="btn btn-sm" formAction={decideNewsAction.bind(null, "reject")} formNoValidate>❌ Kerak emas</button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <p className="adm-ad-text">
                      {[o.designer!.facts.born ? `${o.designer!.facts.born}${o.designer!.facts.died ? `–${o.designer!.facts.died}` : ""}` : null, o.designer!.facts.roles.join(", "), o.designer!.facts.country].filter(Boolean).join(" · ")}
                      {o.designer!.portrait ? ` · rasm: ${o.designer!.portrait.credit}` : " · rasm topilmadi"}
                    </p>
                    <div className="adm-tg-link">
                      {([["both", "✅ Sayt + kanal", "btn btn-accent btn-sm"], ["site", "🌐 Faqat sayt", "btn btn-sm"], ["reject", "❌ Kerak emas", "btn btn-sm"]] as const).map(([how, label, cls]) => (
                        <form key={how} action={decideContentAction}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="how" value={how} />
                          <SubmitButton className={cls} pendingLabel="…">{label}</SubmitButton>
                        </form>
                      ))}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <form action={runContentNowAction}>
          <SubmitButton className="btn btn-sm" pendingLabel="Qidirilmoqda…">Hozir taklif olish</SubmitButton>
        </form>
      </section>

      <section className="adm-card adm-pad" id="feeds" aria-labelledby="h-feeds">
        <h2 className="adm-h2" id="h-feeds">3. Yangilik lentalari</h2>
        <ul className="adm-tg-list">
          {st.feeds.map((f) => (
            <li key={f.url}>
              <span><strong>{f.name}</strong> <span className="adm-meta">{f.url}</span>{!f.on && <span className="tag tag-off" style={{ marginLeft: 8 }}>Oʻchiq</span>}</span>
              <span className="adm-tg-link">
                <form action={toggleFeedAction}><input type="hidden" name="url" value={f.url} /><SubmitButton className="chip" pendingLabel="…">{f.on ? "Oʻchirib qoʻyish" : "Yoqish"}</SubmitButton></form>
                <form action={removeFeedAction}><input type="hidden" name="url" value={f.url} /><ConfirmButton className="chip chip-danger" message={`“${f.name}” lentasi olib tashlansinmi?`}>Olib tashlash</ConfirmButton></form>
              </span>
            </li>
          ))}
        </ul>
        <form action={addFeedAction} className="adm-tg-form">
          <label className="sr-only" htmlFor="feed-name">Lenta nomi</label>
          <input id="feed-name" name="name" placeholder="Nomi (masalan Eye on Design)" maxLength={60} required />
          <label className="sr-only" htmlFor="feed-url">Lenta manzili</label>
          <input id="feed-url" name="url" type="url" placeholder="https://…/feed/" maxLength={300} required />
          <SubmitButton className="btn btn-sm" pendingLabel="Tekshirilmoqda…">Lenta qoʻshish</SubmitButton>
        </form>
        <p className="adm-meta">Manzil RSS yoki Atom lenta boʻlsin. Qoʻshishdan oldin u oʻqilishi tekshiriladi.</p>
      </section>

      <section className="adm-card adm-pad" id="add" aria-labelledby="h-add">
        <h2 className="adm-h2" id="h-add">4. Dizayner qoʻshish (ism boʻyicha)</h2>
        <form action={searchDesignerAction} className="adm-tg-form">
          <label className="sr-only" htmlFor="dz-q">Dizayner ismi</label>
          <input id="dz-q" name="q" placeholder="Masalan: Paula Scher" maxLength={80} required defaultValue={q ?? ""} />
          <SubmitButton className="btn btn-sm" pendingLabel="Qidirilmoqda…">Qidirish</SubmitButton>
        </form>
        {results === null && <p className="adm-meta">Wikidata hozir javob bermadi. Birozdan keyin qayta urinib koʻring.</p>}
        {results && results.length === 0 && <p className="adm-meta">Hech narsa topilmadi.</p>}
        {results && results.length > 0 && (
          <ul className="adm-tg-list">
            {results.map((r) => (
              <li key={r.id}>
                <span><strong>{r.label}</strong> <span className="adm-meta">{r.description || r.id}</span></span>
                {have.has(r.id) ? <span className="tag tag-ok">Saytda bor</span> : (
                  <span className="adm-tg-link">
                    {([["site", "Saytga"], ["both", "Sayt + kanal"]] as const).map(([how, label]) => (
                      <form key={how} action={addDesignerAction}>
                        <input type="hidden" name="qid" value={r.id} />
                        <input type="hidden" name="how" value={how} />
                        <SubmitButton className="chip" pendingLabel="…">{label}</SubmitButton>
                      </form>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="adm-meta">Faqat dizayn bilan bogʻliq kasbdagi odamlar qoʻshiladi (grafik dizayner, tipograf, shrift dizayneri va h.k.).</p>
      </section>

      <section className="adm-card adm-pad" id="designers" aria-labelledby="h-des">
        <h2 className="adm-h2" id="h-des">5. Saytdagi profillar ({designers.length})</h2>
        {designers.length === 0 ? (
          <p className="adm-text">Hali profil yoʻq.</p>
        ) : (
          <ul className="adm-req-list">
            {designers.map((x) => (
              <li key={x.id} id={`d${x.id}`} className="adm-req">
                <div className="adm-req-head">
                  <strong>{x.name}</strong>
                  <span>
                    <span className={`tag ${x.isPublished ? "tag-ok" : "tag-off"}`}>{x.isPublished ? "Saytda" : "Yashirin"}</span>{" "}
                    <Link href={`/dizaynerlar/profil/${x.slug}`} className="link">Koʻrish ↗</Link>
                  </span>
                </div>
                <form action={saveDesignerAction} className="adm-ad-form">
                  <input type="hidden" name="id" value={x.id} />
                  <label className="sr-only" htmlFor={`sum${x.id}`}>{x.name}: matn</label>
                  <textarea id={`sum${x.id}`} name="summary" rows={3} maxLength={3000} defaultValue={x.summary} required />
                  <div className="adm-tg-link">
                    <SubmitButton className="btn btn-sm" pendingLabel="…">Matnni saqlash</SubmitButton>
                  </div>
                </form>
                <div className="adm-tg-link">
                  <form action={toggleDesignerAction}><input type="hidden" name="id" value={x.id} /><SubmitButton className="chip" pendingLabel="…">{x.isPublished ? "Yashirish" : "Koʻrsatish"}</SubmitButton></form>
                  <form action={deleteDesignerAction}><input type="hidden" name="id" value={x.id} /><ConfirmButton className="chip chip-danger" message={`“${x.name}” profili oʻchirilsinmi? U boshqa taklif qilinmaydi.`}>Oʻchirish</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="adm-meta">Yangiliklar “Maqolalar” boʻlimida: ularni u yerdan yashirish yoki oʻchirish mumkin.</p>
      </section>
    </>
  );
}
