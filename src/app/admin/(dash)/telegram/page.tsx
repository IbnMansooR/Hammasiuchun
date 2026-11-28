import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { botEnabled, botUsername, tg } from "@/lib/telegram";
import { getTgState } from "@/lib/tgState";
import Notice from "@/components/admin/Notice";
import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/ConfirmButton";
import {
  addQuoteAction, chooseBaseAction, chooseChannelAction, clearBaseAction, clearChannelAction, createAdminLinkAction, postNextNowAction, removeQuoteAction, removeTgAdminAction,
  saveAutopostAction, setWebhookAction, skipAutopostAction, testAdminsAction, toggleQuoteAction, unskipAutopostAction,
  decideScoutAction, saveScoutAction, scoutNowAction, saveChannelQuizAction, channelQuizNowAction, saveBotPromoAction, botPromoNowAction,
} from "@/app/admin/telegramActions";
import { autopostQueue, nextRun, postsPerWeek } from "@/lib/tgAutopost";
import { AUTOPOST_MAX_TIMES } from "@/lib/tgState";
import { posterAlbum } from "@/lib/fontPoster";
import { AUTHOR_MAX, BUILTIN_QUOTES, MOODS, MOOD_LABEL, QUOTE_MAX } from "@/lib/quotes";
import { SCOUT_PER_DAY, getScout, previewUrl } from "@/lib/fontScout";
import { gfPage } from "@/lib/googleFonts";
import { KIND_LABEL, botStats } from "@/lib/botStats";
import { channelQuizLink, getChannelQuiz } from "@/lib/channelQuiz";
import { PROMO_IMAGE, PROMO_TEXT_MAX, getBotPromo, promoCaption, promoNext } from "@/lib/botPromo";

export const metadata = { title: "Admin — Telegram" };
export const maxDuration = 60; // "post now" sends an album of rendered posters

const DAY_LABEL: [number, string, string][] = [
  [1, "Du", "Dushanba"], [2, "Se", "Seshanba"], [3, "Ch", "Chorshanba"], [4, "Pa", "Payshanba"], [5, "Ju", "Juma"], [6, "Sh", "Shanba"], [7, "Ya", "Yakshanba"],
];

const OK: Record<string, string> = {
  webhook: "Webhook oʻrnatildi: bot endi saytga ulandi.",
  link: "Ulash havolasi tayyor. Uni 15 daqiqa ichida Telegramda oching.",
  removed: "Admin Telegrami uzildi.",
  channel: "Kanal ulandi. Endi shrift va ishlarni kanalga yuborishingiz mumkin.",
  cleared: "Kanal uzildi.",
  base: "Fayl kanali ulandi: endi har bir shrift fayli u yerga yuklanadi va postlarda “Telegramdan yuklab olish” havolasi chiqadi.",
  basecleared: "Fayl kanali uzildi: postlarda faqat saytga havola qoladi.",
  auto: "Avtomatik postlar sozlamasi saqlandi.",
  autoposted: "Navbatdagi shrift kanalga yuborildi ✓",
  quote: "Iqtibos qoʻshildi. Keyingi postlarda birinchi navbatda ishlatiladi.",
  scout: "Yangi shrift takliflari sozlamasi saqlandi.",
  scoutrejected: "Taklif rad etildi: bu shrift boshqa taklif qilinmaydi.",
  botpromo: "Bot reklamasi sozlamasi saqlandi.",
  botpromoposted: "Bot reklamasi kanalga chiqdi ✓",
  cquiz: "Kanal viktorinasi sozlamasi saqlandi.",
  cquizposted: "Bugungi savol kanalga chiqdi ✓",
  scoutadded: "Shrift saytga qoʻshildi va kanal navbatiga tushdi ✓",
};
const ERR: Record<string, string> = {
  env: "Vercel’da TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME va TELEGRAM_WEBHOOK_SECRET sozlanmagan.",
  webhook: "Telegram webhook’ni qabul qilmadi. Birozdan keyin qayta urinib koʻring.",
  channel: "Kanal nomini @kanal_nomi koʻrinishida yozing.",
  notadmin: "Bot bu kanalda admin emas yoki post yozish huquqi yoʻq. Kanal sozlamalarida botni admin qiling va “Post messages” huquqini bering.",
  noadmins: "Hali birorta admin Telegrami ulanmagan.",
  autoempty: "Navbatda shrift qolmagan: hamma shriftlar kanalga chiqqan yoki oʻtkazib yuborilgan.",
  channelfirst: "Avval kanalni ulang.",
  autotime: "Vaqtni SS:DD koʻrinishida kiriting (masalan 09:00). Kuniga 4 tagacha.",
  autonotime: "Kamida bitta post vaqtini kiriting.",
  autogap: "Post vaqtlari orasi kamida 30 daqiqa boʻlsin.",
  autodays: "Kamida bitta kunni tanlang.",
  autosend: "Telegram postni qabul qilmadi. Birozdan keyin qayta urinib koʻring.",
  autounsure: "Telegram vaqtida javob bermadi: post kanalga chiqqan boʻlishi mumkin. Kanalni tekshiring; shrift navbatdan chetga olindi, chiqmagan boʻlsa “Oʻtkazilganlarni qaytarish”ni bosing.",
  basenotadmin: "Bot bu kanalda admin emas yoki post yozish huquqi yoʻq. Fayl kanalida ham botni admin qiling.",
  basesame: "Fayl kanali asosiy kanaldan boshqa boʻlsin.",
  basefile: "Shrift faylini fayl kanaliga yuklab boʻlmadi, post yuborilmadi. Bot u yerda admin ekanini tekshiring.",
  qempty: "Iqtibos matnini yozing.",
  qmood: "Iqtibos mavzusini tanlang.",
  promotime: "Vaqtni SS:DD koʻrinishida kiriting (masalan 12:00).",
  promoday: "Haftaning kunini tanlang.",
  promotext: "Matn juda uzun: 600 belgigacha yozing.",
  promosend: "Reklama kanalga chiqmadi.",
  cquiztime: "Vaqtlarni SS:DD koʻrinishida kiriting (masalan 19:00 va 09:00).",
  cquizbusy: "Bugungi savol kanalga allaqachon chiqqan.",
  cquizsend: "Savol kanalga chiqmadi: bot kanalda admin ekanini va savol tayyor ekanini tekshiring.",
  scouttime: "Vaqtni SS:DD koʻrinishida kiriting (masalan 11:00).",
  scoutcount: "Kuniga 1 tadan 5 tagacha taklif tanlang.",
  scoutfull: "Koʻrib chiqilmagan takliflar koʻp (15 ta). Avval ularni qoʻshing yoki rad eting.",
  scoutnone: "Hozir yangi taklif topilmadi: Google Fonts javob bermadi yoki mos shrift qolmadi. Keyinroq urinib koʻring.",
  scoutgone: "Bu taklif allaqachon koʻrib chiqilgan.",
  scoutfiles: "Google shrift fayllarini bermadi. Taklif roʻyxatda qoldi, keyinroq qayta urinib koʻring.",
  scoutlicence: "Shrift faylida ochiq litsenziya topilmadi, saytga qoʻshilmadi.",
};

type WebhookInfo = { url: string; pending_update_count: number; last_error_message?: string; last_error_date?: number };

export default async function TelegramAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; n?: string; slug?: string; detail?: string }> }) {
  const { ok, error, n, slug, detail } = await searchParams;
  const enabled = botEnabled();
  const bot = botUsername();
  const expected = `${SITE_URL}/api/telegram/webhook`;
  const [state, info, linked, subscribed, posts, waiting, scout, botUse, cq, promo] = await Promise.all([
    getTgState(),
    enabled ? tg<WebhookInfo>("getWebhookInfo") : Promise.resolve(null),
    db.user.count({ where: { telegramId: { not: null } } }),
    db.user.count({ where: { tgNotify: true, telegramId: { not: null } } }),
    db.tgPost.findMany({ where: { kind: { not: "file" } }, orderBy: { postedAt: "desc" }, take: 10 }),
    enabled ? autopostQueue(5) : Promise.resolve({ items: [], total: 0 }),
    getScout(),
    botStats(),
    getChannelQuiz(),
    getBotPromo(),
  ]);
  const queue = waiting.items;
  const auto = state.autopost;
  const quotes = state.quotes;
  const upcoming = nextRun(auto);
  const perWeek = postsPerWeek(auto);
  const lastsDays = perWeek ? Math.ceil((waiting.total / perWeek) * 7) : 0;
  const preview = queue[0]?.drawable ? (await posterAlbum(queue[0].slug))?.urls ?? null : null;
  const hook = info?.ok ? info.result : null;
  const hookOk = !!hook && hook.url === expected;
  const nonce = state.adminNonce && state.adminNonce.exp > Date.now() ? state.adminNonce : null;
  const others = state.candidates.filter((c) => c.id !== state.channel?.id && c.id !== state.base?.id);

  const fontNames = new Map(
    (await db.family.findMany({ where: { slug: { in: posts.filter((p) => p.kind === "font").map((p) => p.ref) } }, select: { slug: true, name: true } }))
      .map((f) => [f.slug, f.name]),
  );
  const workTitles = new Map(
    (await db.work.findMany({ where: { id: { in: posts.filter((p) => p.kind === "work").map((p) => Number(p.ref)).filter(Number.isInteger) } }, select: { id: true, title: true } }))
      .map((w) => [String(w.id), w.title]),
  );

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Telegram</h1>
          <p className="adm-sub">Bot, kanal va sizning Telegramingiz. Shu yerda bir marta sozlanadi.</p>
        </div>
        {bot && <a href={`https://t.me/${bot}`} target="_blank" rel="noopener" className="btn btn-sm">@{bot} ↗</a>}
      </div>

      {ok === "test" && <Notice>Sinov xabari yuborildi: {n ?? 0} ta adminga.</Notice>}
      {ok === "scoutsent" && <Notice>{`${n ?? 0} ta yangi shrift taklif qilindi: pastdagi roʻyxatda va Telegramingizda.`}</Notice>}
      {ok === "scoutadded" && slug && /^[a-z0-9-]+$/.test(slug) && <Notice><Link href={`/fonts/${slug}`} className="link">Saytda koʻrish ↗</Link></Notice>}
      {ok && OK[ok] && <Notice>{OK[ok]}</Notice>}
      {error && <Notice tone="error">{ERR[error] ?? "Xatolik yuz berdi."}{error === "promosend" && detail ? ` Telegram: ${detail.slice(0, 120)}` : ""}</Notice>}

      {!enabled ? (
        <Notice tone="warn">Bot sozlanmagan: Vercel’ga TELEGRAM_BOT_TOKEN va TELEGRAM_BOT_USERNAME qoʻshing.</Notice>
      ) : (
        <>
          <section className="adm-card adm-pad" aria-labelledby="h-hook">
            <h2 className="adm-h2" id="h-hook">1. Bot va sayt aloqasi</h2>
            <p className="adm-text">
              {hookOk ? "✓ Ulangan." : "Ulanmagan: Telegram xabarlari saytga kelmaydi."}
              {hook?.pending_update_count ? ` Navbatda: ${hook.pending_update_count}.` : ""}
            </p>
            {hook?.last_error_message && (
              <p className="adm-meta">
                Oxirgi xato{hook.last_error_date ? ` (${formatDateTime(new Date(hook.last_error_date * 1000))})` : ""}: {hook.last_error_message}
              </p>
            )}
            <form action={setWebhookAction}>
              <SubmitButton className={`btn btn-sm${hookOk ? "" : " btn-accent"}`} pendingLabel="Ulanmoqda…">{hookOk ? "Qayta ulash" : "Ulash"}</SubmitButton>
            </form>
          </section>

          <section className="adm-card adm-pad" id="admins" aria-labelledby="h-admins">
            <h2 className="adm-h2" id="h-admins">2. Sizning Telegramingiz (admin)</h2>
            <p className="adm-text">Yangi ishlar ✅/❌ tugmalari bilan va har kuni ertalab 9:00 da qisqa hisobot shu yerga keladi.</p>
            {state.admins.length > 0 && (
              <ul className="adm-tg-list">
                {state.admins.map((a) => (
                  <li key={a.chatId}>
                    <span><b>{a.name}</b> <span className="adm-meta">ulangan: {formatDateTime(a.at)}</span></span>
                    <form action={removeTgAdminAction}>
                      <input type="hidden" name="chatId" value={a.chatId} />
                      <ConfirmButton className="chip chip-danger" message={`${a.name} uzilsinmi? Unga admin xabarlari kelmay qoladi.`}>Uzish</ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {nonce ? (
              <div className="adm-tg-link">
                <a href={`https://t.me/${bot}?start=a_${nonce.code}`} target="_blank" rel="noopener" className="btn btn-accent btn-sm">Telegramda ochish va “Start”ni bosish</a>
                <span className="adm-meta">Havola bir marta ishlaydi, {formatDateTime(new Date(nonce.exp))} gacha.</span>
              </div>
            ) : (
              <div className="adm-tg-link">
                <form action={createAdminLinkAction}>
                  <SubmitButton className={`btn btn-sm${state.admins.length ? "" : " btn-accent"}`} pendingLabel="…">{state.admins.length ? "Yana bir Telegramni ulash" : "Telegramimni ulash"}</SubmitButton>
                </form>
                {state.admins.length > 0 && (
                  <form action={testAdminsAction}>
                    <SubmitButton className="btn btn-sm" pendingLabel="Yuborilmoqda…">Sinov xabari</SubmitButton>
                  </form>
                )}
              </div>
            )}
          </section>

          <section className="adm-card adm-pad" id="channel" aria-labelledby="h-channel">
            <h2 className="adm-h2" id="h-channel">3. Kanal</h2>
            {state.channel ? (
              <ul className="adm-tg-list">
                <li>
                  <span>
                    ✓ <b>{state.channel.title || state.channel.id}</b>
                    {state.channel.username && <> · <a href={`https://t.me/${state.channel.username}`} target="_blank" rel="noopener" className="link">@{state.channel.username}</a></>}
                  </span>
                  <form action={clearChannelAction}>
                    <ConfirmButton className="chip" message="Kanal uzilsinmi? Postlar yuborilmay qoladi.">Uzish</ConfirmButton>
                  </form>
                </li>
              </ul>
            ) : (
              <ol className="adm-text adm-steps">
                <li>Telegramda kanalingizni oching → Sozlamalar → Administratorlar → <b>@{bot}</b> ni qoʻshing va “Post messages” huquqini qoldiring.</li>
                <li>Kanal pastda paydo boʻladi yoki nomini (@kanal) yozib ulang.</li>
              </ol>
            )}
            {others.length > 0 && (
              <ul className="adm-tg-list">
                {others.map((c) => (
                  <li key={c.id}>
                    <span>{c.title || c.id}{c.username ? ` · @${c.username}` : ""} <span className="adm-meta">bot admin qilingan</span></span>
                    <span className="adm-tg-link">
                      <form action={chooseChannelAction}>
                        <input type="hidden" name="channel" value={c.username ? `@${c.username}` : c.id} />
                        <SubmitButton className="chip chip-ok" pendingLabel="…">Asosiy kanal qilish</SubmitButton>
                      </form>
                      {state.channel && (
                        <form action={chooseBaseAction}>
                          <input type="hidden" name="channel" value={c.username ? `@${c.username}` : c.id} />
                          <SubmitButton className="chip" pendingLabel="…">Fayl kanali qilish</SubmitButton>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form action={chooseChannelAction} className="adm-tg-form">
              <label htmlFor="tg-channel" className="sr-only">Kanal nomi</label>
              <input id="tg-channel" type="text" name="channel" placeholder="@kanal_nomi" required maxLength={64} />
              <SubmitButton className="btn btn-sm" pendingLabel="Tekshirilmoqda…">{state.channel ? "Boshqa kanalga almashtirish" : "Kanalni ulash"}</SubmitButton>
            </form>

            <h3 className="adm-h3" id="base">Fayl kanali</h3>
            <p className="adm-text">
              Har bir shriftning ZIP fayli (saytdan yuklab olinadigan faylning aynan oʻzi) shu kanalga yuklanadi. Asosiy kanaldagi
              postda esa “Telegramdan yuklab olish” havolasi chiqadi. Fayl bir marta yuklanadi va shrift fayllari oʻzgarmaguncha qayta ishlatiladi.
            </p>
            {state.base ? (
              <ul className="adm-tg-list">
                <li>
                  <span>
                    ✓ <b>{state.base.title || state.base.id}</b>
                    {state.base.username && <> · <a href={`https://t.me/${state.base.username}`} target="_blank" rel="noopener" className="link">@{state.base.username}</a></>}
                  </span>
                  <form action={clearBaseAction}>
                    <ConfirmButton className="chip" message="Fayl kanali uzilsinmi? Postlarda Telegram havolasi chiqmay qoladi.">Uzish</ConfirmButton>
                  </form>
                </li>
              </ul>
            ) : (
              <p className="adm-meta">Ulanmagan: postlarda faqat saytga havola boʻladi. Botni fayl kanaliga ham admin qilib, shu yerda ulang.</p>
            )}
            <form action={chooseBaseAction} className="adm-tg-form">
              <label htmlFor="tg-base" className="sr-only">Fayl kanali nomi</label>
              <input id="tg-base" type="text" name="channel" placeholder="@feekrfontbase" required maxLength={64} />
              <SubmitButton className="btn btn-sm" pendingLabel="Tekshirilmoqda…" disabled={!state.channel}>{state.base ? "Boshqa fayl kanaliga almashtirish" : "Fayl kanalini ulash"}</SubmitButton>
            </form>
          </section>

          <section className="adm-card adm-pad" id="auto" aria-labelledby="h-auto">
            <h2 className="adm-h2" id="h-auto">4. Avtomatik postlar</h2>
            <p className="adm-text">
              Bot saytdagi shriftlarni kanalga oʻzi joylaydi: har birini 4–5 ta rasmli albom qilib (shu shriftda terilgan iqtibos, muqova,
              harflar, matn, uslublar), tagida havolalar bilan. Siz belgilagan vaqtlarda, navbat boʻyicha: avval yangi shriftlar.
            </p>
            <form action={saveAutopostAction} className="adm-tg-auto-form">
              <label className="check"><input type="checkbox" name="on" defaultChecked={auto.on} /> Yoqilgan</label>
              <fieldset className="adm-tg-times">
                <legend>Post vaqtlari (Toshkent vaqti)</legend>
                {Array.from({ length: AUTOPOST_MAX_TIMES }, (_, i) => (
                  <input key={i} type="time" name="time" defaultValue={auto.times[i] ?? ""} aria-label={`${i + 1}-post vaqti`} />
                ))}
                <span className="adm-meta">Kuniga 4 tagacha; keraksizini boʻsh qoldiring. Post belgilangan vaqtdan 5 daqiqa ichida chiqadi.</span>
              </fieldset>
              <fieldset className="adm-tg-days">
                <legend>Kunlar</legend>
                {DAY_LABEL.map(([n, short, full]) => (
                  <label key={n} className="adm-tg-day" title={full}>
                    <input type="checkbox" name="day" value={n} defaultChecked={auto.days.includes(n)} />
                    <span>{short}</span>
                  </label>
                ))}
              </fieldset>
              <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
            </form>
            <p className="adm-meta">
              {!state.channel
                ? "Kanal ulanmaguncha post chiqmaydi."
                : auto.on
                  ? `Keyingi post: ${upcoming ? formatDateTime(upcoming) : "—"}${queue[0] ? ` · ${queue[0].name}` : ""}. Haftasiga ${perWeek} ta post.`
                  : "Oʻchirilgan: post faqat “Hozir yuborish” bilan chiqadi."}
              {auto.lastAt ? ` Oxirgisi: ${formatDateTime(auto.lastAt)}.` : ""}
              {state.channel && auto.on && waiting.total > 0 ? ` Navbatda ${waiting.total} ta shrift: taxminan ${lastsDays} kunga yetadi.` : ""}
            </p>
            {preview && (
              <div className="adm-tg-album" aria-label={`${queue[0].name}: kanaldagi rasmlar`}>
                {preview.map((u, i) => <img key={u} src={u.replace(/^https?:\/\/[^/]+/, "")} alt={`${i + 1}-rasm`} loading="lazy" />)}
              </div>
            )}
            {queue.length > 0 ? (
              <ol className="adm-tg-list adm-tg-queue">
                {queue.map((q) => (
                  <li key={q.slug}>
                    <span>
                      <Link href={`/admin/telegram/post?font=${encodeURIComponent(q.slug)}`} className="link">{q.name}</Link>
                      {q.isNew && <span className="tag tag-new" style={{ marginLeft: 8 }}>Yangi</span>}
                      {!q.drawable && <span className="adm-meta"> · rasmlarsiz (bitta karta bilan)</span>}
                    </span>
                    <form action={skipAutopostAction}>
                      <input type="hidden" name="slug" value={q.slug} />
                      <SubmitButton className="chip" pendingLabel="…">Oʻtkazib yuborish</SubmitButton>
                    </form>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="adm-text">Navbat boʻsh: hamma shriftlar kanalga chiqqan. Yangi shrift qoʻshilsa, avtomatik davom etadi.</p>
            )}
            <div className="adm-tg-link">
              <form action={postNextNowAction}>
                <SubmitButton className="btn btn-accent btn-sm" pendingLabel="Yuborilmoqda…" disabled={!state.channel || queue.length === 0}>Navbatdagisini hozir yuborish</SubmitButton>
              </form>
              {auto.skip.length > 0 && (
                <form action={unskipAutopostAction}>
                  <SubmitButton className="btn btn-sm" pendingLabel="…">{`Oʻtkazilganlarni qaytarish (${auto.skip.length})`}</SubmitButton>
                </form>
              )}
            </div>
          </section>

          <section className="adm-card adm-pad" id="scout" aria-labelledby="h-scout">
            <h2 className="adm-h2" id="h-scout">5. Yangi shriftlar (Google Fonts)</h2>
            <p className="adm-text">
              Bot har kuni Google Fonts’dan saytda yoʻq bepul shriftlarni topib, sizga Telegramda rasmi bilan yuboradi: avval oʻzbekcha
              harflari (oʻ gʻ, ў қ ғ ҳ) borlarini. “✅ Saytga qoʻshish”ni bossangiz, shrift barcha uslublari va oʻzbekcha tavsifi bilan
              saytga qoʻshiladi va kanal navbatiga tushadi. Faqat OFL va Apache litsenziyali shriftlar: ularni tarqatish ruxsat etilgan.
            </p>
            <form action={saveScoutAction} className="adm-tg-auto-form">
              <label className="check"><input type="checkbox" name="on" defaultChecked={scout.on} /> Yoqilgan</label>
              <label className="adm-tg-scout-field">
                <span>Kuniga</span>
                <select name="perDay" className="sel" defaultValue={String(scout.perDay)}>
                  {SCOUT_PER_DAY.map((k) => <option key={k} value={k}>{`${k} ta taklif`}</option>)}
                </select>
              </label>
              <label className="adm-tg-scout-field">
                <span>Vaqti (Toshkent)</span>
                <input type="time" name="time" defaultValue={scout.time} required />
              </label>
              <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
            </form>
            <p className="adm-meta">
              {state.admins.length === 0
                ? "Telegramingiz ulanmagan: takliflar faqat shu yerda chiqadi (“Hozir taklif olish”)."
                : scout.on ? `Har kuni ${scout.time} da ${scout.perDay} ta taklif Telegramingizga keladi.` : "Oʻchirilgan: taklif faqat “Hozir taklif olish” bilan."}
              {scout.imported.length > 0 ? ` Shu yoʻl bilan qoʻshilgan: ${scout.imported.length} ta.` : ""}
              {scout.rejected.length > 0 ? ` Rad etilgan yoki mos kelmagan: ${scout.rejected.length} ta.` : ""}
            </p>
            {scout.pending.length > 0 ? (
              <ul className="adm-scout-list">
                {scout.pending.map((p) => (
                  <li key={p.id} className="adm-scout-item">
                    <img src={previewUrl(p.family).replace(/^https?:\/\/[^/]+/, "")} alt={`${p.family}: namuna`} loading="lazy" width={600} height={380} />
                    <div className="adm-scout-info">
                      <strong>{p.family}</strong>
                      <span className="adm-meta">
                        {`${p.cov.cyrillic ? "Lotin + Kirill" : "Lotin"} · oʻ gʻ ${p.cov.uzLatin ? "✓" : "—"} · ў қ ғ ҳ ${p.cov.uzCyrillic ? "✓" : "—"} · ${formatDateTime(p.at)}`}
                      </span>
                      <div className="adm-tg-link">
                        <form action={decideScoutAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="do" value="add" />
                          <SubmitButton className="btn btn-accent btn-sm" pendingLabel="Qoʻshilmoqda…">✅ Saytga qoʻshish</SubmitButton>
                        </form>
                        <form action={decideScoutAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="do" value="reject" />
                          <SubmitButton className="btn btn-sm" pendingLabel="…">❌ Kerak emas</SubmitButton>
                        </form>
                        <a href={gfPage(p.family)} target="_blank" rel="noopener" className="link">Google Fonts ↗</a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-text">Koʻrib chiqilmagan taklif yoʻq.</p>
            )}
            <form action={scoutNowAction}>
              <SubmitButton className="btn btn-sm" pendingLabel="Qidirilmoqda…">Hozir taklif olish</SubmitButton>
            </form>
          </section>

          <section className="adm-card adm-pad" id="cquiz" aria-labelledby="h-cquiz">
            <h2 className="adm-h2" id="h-cquiz">Viktorina (kanalda)</h2>
            <p className="adm-text">
              Har kuni belgilangan vaqtda kanalga “Bu qaysi shrift?” savoli chiqadi (botdagi bugungi savol bilan bir xil). Kanal a’zolari tugmani
              bossa, javobi ball va streak bilan hisoblanadi, natija ekranda oynada koʻrinadi. Javob ertasi kuni ertalab shu postning oʻzida
              ochiladi (nechta odam qaysi variantni tanlagani bilan), dushanba kuni oʻtgan haftaning birinchi oʻnligi chiqadi.
            </p>
            <form action={saveChannelQuizAction} className="adm-tg-auto-form">
              <label className="check"><input type="checkbox" name="on" defaultChecked={cq.on} /> Yoqilgan</label>
              <label className="adm-tg-scout-field">
                <span>Savol vaqti (Toshkent)</span>
                <input type="time" name="time" defaultValue={cq.time} required />
              </label>
              <label className="adm-tg-scout-field">
                <span>Javob ochilishi (ertasi kuni)</span>
                <input type="time" name="reveal" defaultValue={cq.reveal} required />
              </label>
              <label className="check"><input type="checkbox" name="weekly" defaultChecked={cq.weekly} /> Dushanba kuni haftalik reyting</label>
              <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
            </form>
            <p className="adm-meta">
              {!state.channel ? "Avval kanalni ulang (3-boʻlim)." : cq.on ? `Har kuni ${cq.time} da savol, ertasi kuni ${cq.reveal} da javob.` : "Oʻchirilgan: savol faqat “Hozir chiqarish” bilan chiqadi."}
            </p>
            {Object.keys(cq.posts).length > 0 && state.channel ? (
              <ul className="adm-list">
                {Object.entries(cq.posts).sort().reverse().slice(0, 5).map(([day, p]) => (
                  <li key={day}>
                    <a href={channelQuizLink(p.messageId, state.channel!)} target="_blank" rel="noopener" className="link">{day} ↗</a>
                    {` · ${p.count} javob · ${p.revealed ? "javob ochilgan" : "ochiq"}`}
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={channelQuizNowAction}>
              <SubmitButton className="btn btn-sm" pendingLabel="Yuborilmoqda…">Hozir chiqarish</SubmitButton>
            </form>
          </section>

          <section className="adm-card adm-pad" id="botpromo" aria-labelledby="h-botpromo">
            <h2 className="adm-h2" id="h-botpromo">Bot reklamasi (kanalda)</h2>
            <p className="adm-text">
              Bot kanalga oʻzini reklama qiladi: rasm, qisqa matn va “Botni ochish” tugmasi. Shrift postlaridagi kabi vaqt va kunlarni
              belgilaysiz (odatda haftada bir marta). Matn oʻzi almashib turadi (5 xil); xohlasangiz oʻz matningizni yozing. Shu post
              orqali kelganlar bot statistikasida “kanalpost” manbasi bilan koʻrinadi.
            </p>
            <form action={saveBotPromoAction} className="adm-tg-auto-form">
              <label className="check"><input type="checkbox" name="on" defaultChecked={promo.on} /> Yoqilgan</label>
              <fieldset className="adm-tg-times">
                <legend>Post vaqtlari (Toshkent vaqti)</legend>
                {Array.from({ length: AUTOPOST_MAX_TIMES }, (_, i) => (
                  <input key={i} type="time" name="time" defaultValue={promo.times[i] ?? ""} aria-label={`Reklama ${i + 1}-vaqti`} />
                ))}
                <span className="adm-meta">Kuniga 4 tagacha; keraksizini boʻsh qoldiring. Post belgilangan vaqtdan 5 daqiqa ichida chiqadi.</span>
              </fieldset>
              <fieldset className="adm-tg-days">
                <legend>Kunlar</legend>
                {DAY_LABEL.map(([n, short, full]) => (
                  <label key={n} className="adm-tg-day" title={full}>
                    <input type="checkbox" name="day" value={n} defaultChecked={promo.days.includes(n)} />
                    <span>{short}</span>
                  </label>
                ))}
              </fieldset>
              <label className="adm-tg-scout-field">
                <span>Oʻz matningiz (boʻsh qolsa, tayyor matnlar navbat bilan)</span>
                <textarea name="text" rows={4} maxLength={PROMO_TEXT_MAX} defaultValue={promo.text} />
              </label>
              <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
            </form>
            <p className="adm-meta">
              {!state.channel ? "Kanal ulanmaguncha post chiqmaydi. " : promo.on ? `Keyingi post: ${promoNext(promo) ? formatDateTime(promoNext(promo)!) : "—"}. Haftasiga ${promo.times.length * promo.days.length} ta. ` : "Oʻchirilgan: post faqat “Hozir yuborish” bilan chiqadi. "}
              {promo.lastAt ? `Oxirgisi: ${formatDateTime(promo.lastAt)}. ` : "Hali chiqmagan. "}
              {`Keyingi matn: “${promoCaption(promo).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)}…”`}
            </p>
            <div className="adm-tg-album" aria-label="Reklama rasmi">
              <img src={PROMO_IMAGE} alt="Bot reklamasi rasmi" loading="lazy" />
            </div>
            <form action={botPromoNowAction}>
              <SubmitButton className="btn btn-sm" pendingLabel="Yuborilmoqda…">Hozir yuborish</SubmitButton>
            </form>
          </section>

          <section className="adm-card adm-pad" id="quotes" aria-labelledby="h-quotes">
            <h2 className="adm-h2" id="h-quotes">Rasmdagi iqtiboslar</h2>
            <p className="adm-text">
              Albomning birinchi rasmi: shu shriftda terilgan iqtibos. Mavzu shrift turiga qarab tanlanadi: qoʻlyozma shriftga mehr,
              serifga hikmat, display shriftga gʻayrat, sans-serifga hayot haqidagi gaplar. Oxirgi 40 ta postdagisi takrorlanmaydi,
              siz qoʻshganlar birinchi navbatda ishlatiladi. Kirill shriftlarda iqtibos kirillda chiqadi.
            </p>
            <form action={addQuoteAction} className="adm-quote-form">
              <div className="field">
                <label htmlFor="quote-text">Iqtibos</label>
                <textarea id="quote-text" name="text" rows={3} maxLength={QUOTE_MAX} required placeholder="Masalan: Ilm — aql chirogʻi." />
              </div>
              <div className="adm-quote-row">
                <div className="field">
                  <label htmlFor="quote-author">Muallif (ixtiyoriy)</label>
                  <input id="quote-author" name="author" type="text" maxLength={AUTHOR_MAX} placeholder="Xalq maqoli" />
                </div>
                <div className="field">
                  <label htmlFor="quote-mood">Mavzu</label>
                  <select id="quote-mood" name="mood" className="sel" defaultValue="hikmat">
                    {MOODS.map((m) => <option key={m} value={m}>{MOOD_LABEL[m]}</option>)}
                  </select>
                </div>
              </div>
              <SubmitButton className="btn btn-sm" pendingLabel="…">Iqtibos qoʻshish</SubmitButton>
            </form>
            {quotes.custom.length > 0 && (
              <>
                <h3 className="adm-h3">Siz qoʻshganlar ({quotes.custom.length})</h3>
                <ul className="adm-quote-list">
                  {quotes.custom.map((q) => (
                    <li key={q.id}>
                      <span>
                        <q>{q.text}</q>
                        <span className="adm-meta"> {q.author ? `— ${q.author} · ` : "· "}{MOOD_LABEL[q.mood]}</span>
                      </span>
                      <form action={removeQuoteAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <ConfirmButton message="Bu iqtibos oʻchirilsinmi?">Oʻchirish</ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <details className="adm-quote-builtin">
              <summary>
                Tayyor iqtiboslar ({BUILTIN_QUOTES.length}{quotes.off.length ? `, ${quotes.off.length} tasi oʻchirilgan` : ""})
              </summary>
              {MOODS.map((m) => (
                <div key={m}>
                  <h3 className="adm-h3">{MOOD_LABEL[m]}</h3>
                  <ul className="adm-quote-list">
                    {BUILTIN_QUOTES.filter((q) => q.mood === m).map((q) => {
                      const off = quotes.off.includes(q.id);
                      return (
                        <li key={q.id} className={off ? "is-off" : undefined}>
                          <span>
                            <q>{q.text}</q>
                            <span className="adm-meta"> — {q.author}{off ? " · oʻchirilgan" : ""}</span>
                          </span>
                          <form action={toggleQuoteAction}>
                            <input type="hidden" name="id" value={q.id} />
                            <SubmitButton className="chip" pendingLabel="…">{off ? "Yoqish" : "Oʻchirish"}</SubmitButton>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </details>
          </section>

          <section className="adm-card adm-pad" id="botusers" aria-labelledby="h-botusers">
            <h2 className="adm-h2" id="h-botusers">6. Bot foydalanuvchilari</h2>
            <p className="adm-text">
              Botdan kim foydalanayotgani: faqat sonlar. Suhbat raqami, kelgan vaqti va qayerdan kelgani saqlanadi; ism, username va yozilgan matn saqlanmaydi.
              Telegramda adminlar uchun <code>/stat</code> buyrugʻi ham bor.
            </p>
            <p className="adm-meta">
              Jami <strong>{formatNumber(botUse.total)}</strong> · bloklaganlar {formatNumber(botUse.blocked)} · yangi: bugun {formatNumber(botUse.today)}, 7 kunda {formatNumber(botUse.week)} · faol: bugun {formatNumber(botUse.active1)}, 7 kunda {formatNumber(botUse.active7)}
            </p>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <caption className="sr-only">Oxirgi 14 kun</caption>
                <thead><tr><th scope="col">Kun</th><th scope="col">Yangi odam</th><th scope="col">Amallar</th></tr></thead>
                <tbody>
                  {[...botUse.days].reverse().map((d) => (
                    <tr key={d.day}><th scope="row">{d.day}</th><td>{formatNumber(d.fresh)}</td><td>{formatNumber(d.events)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {botUse.kinds.length > 0 && <p className="adm-meta">Oxirgi 7 kun: {botUse.kinds.map((k) => `${KIND_LABEL[k.kind] ?? k.kind} ${formatNumber(k.n)}`).join(" · ")}</p>}
            {botUse.sources.length > 0 && <p className="adm-meta">Qayerdan kelgan: {botUse.sources.map((s) => `${s.source} ${formatNumber(s.n)}`).join(" · ")}</p>}
          </section>

          <section className="adm-card adm-pad" aria-labelledby="h-digest">
            <h2 className="adm-h2" id="h-digest">Haftalik dayjest</h2>
            <p className="adm-text">
              Har juma ertalab haftaning eng koʻp yuklangan shriftlari, yangi shriftlar va ishlardan post qoralamasi Telegramingizga keladi.
              “Kanalga yuborish”ni bossangiz, kanalga chiqadi. Istalgan payt shu yerdan ham koʻrib, tahrirlab yuborishingiz mumkin.
            </p>
            <Link href="/admin/telegram/post?digest=1" className="btn btn-sm">Dayjestni koʻrish</Link>
          </section>

          <section className="adm-card" aria-labelledby="h-posts">
            <h2 className="adm-h2 adm-pad-top" id="h-posts">Kanalga soʻnggi postlar</h2>
            {posts.length ? (
              <table className="adm-table">
                <thead><tr><th>Nima</th><th>Qachon</th><th><span className="sr-only">Havola</span></th></tr></thead>
                <tbody>
                  {posts.map((p) => {
                    const title = p.kind === "font" ? fontNames.get(p.ref) ?? p.ref : p.kind === "digest" || p.kind === "news" || p.kind === "designer" ? p.ref : workTitles.get(p.ref) ?? `ish #${p.ref}`;
                    const href = p.kind === "font" ? `/admin/telegram/post?font=${encodeURIComponent(p.ref)}` : p.kind === "digest" ? "/admin/telegram/post?digest=1"
                      : p.kind === "news" ? `/blog/${encodeURIComponent(p.ref)}` : p.kind === "designer" ? `/dizaynerlar/profil/${encodeURIComponent(p.ref)}` : `/admin/telegram/post?work=${p.ref}`;
                    const label = p.kind === "font" ? "Shrift" : p.kind === "digest" ? "Dayjest" : p.kind === "news" ? "Yangilik" : p.kind === "designer" ? "Dizayner" : "Ish";
                    const pub = state.channel?.id === p.chatId && state.channel.username ? `https://t.me/${state.channel.username}/${p.messageId}` : null;
                    return (
                      <tr key={p.id}>
                        <td><Link href={href} className="link">{label}: {title}</Link></td>
                        <td>{formatDateTime(p.postedAt)}</td>
                        <td>{pub && <a href={pub} target="_blank" rel="noopener" className="link">Telegramda ↗</a>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="adm-text adm-pad-x">Hali post yoʻq. Shrift sahifasida yoki “Dizaynerlar”da “Telegram kanalga” tugmasini bosing.</p>
            )}
          </section>

          <p className="adm-meta" style={{ marginTop: 16 }}>
            Telegramini hisobga ulagan aʼzolar: {formatNumber(linked)} · shulardan xabar oladiganlar: {formatNumber(subscribed)}.
            Shaxsiy xabarlar va yangiliklar ularga Telegramda ham boradi.
          </p>
        </>
      )}
    </>
  );
}
