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
  chooseChannelAction, clearChannelAction, createAdminLinkAction, removeTgAdminAction, setWebhookAction, testAdminsAction,
} from "@/app/admin/telegramActions";

export const metadata = { title: "Admin — Telegram" };

const OK: Record<string, string> = {
  webhook: "Webhook oʻrnatildi: bot endi saytga ulandi.",
  link: "Ulash havolasi tayyor. Uni 15 daqiqa ichida Telegramda oching.",
  removed: "Admin Telegrami uzildi.",
  channel: "Kanal ulandi. Endi shrift va ishlarni kanalga yuborishingiz mumkin.",
  cleared: "Kanal uzildi.",
};
const ERR: Record<string, string> = {
  env: "Vercel’da TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME va TELEGRAM_WEBHOOK_SECRET sozlanmagan.",
  webhook: "Telegram webhook’ni qabul qilmadi. Birozdan keyin qayta urinib koʻring.",
  channel: "Kanal nomini @kanal_nomi koʻrinishida yozing.",
  notadmin: "Bot bu kanalda admin emas yoki post yozish huquqi yoʻq. Kanal sozlamalarida botni admin qiling va “Post messages” huquqini bering.",
  noadmins: "Hali birorta admin Telegrami ulanmagan.",
};

type WebhookInfo = { url: string; pending_update_count: number; last_error_message?: string; last_error_date?: number };

export default async function TelegramAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; n?: string }> }) {
  const { ok, error, n } = await searchParams;
  const enabled = botEnabled();
  const bot = botUsername();
  const expected = `${SITE_URL}/api/telegram/webhook`;
  const [state, info, linked, subscribed, posts] = await Promise.all([
    getTgState(),
    enabled ? tg<WebhookInfo>("getWebhookInfo") : Promise.resolve(null),
    db.user.count({ where: { telegramId: { not: null } } }),
    db.user.count({ where: { tgNotify: true, telegramId: { not: null } } }),
    db.tgPost.findMany({ orderBy: { postedAt: "desc" }, take: 10 }),
  ]);
  const hook = info?.ok ? info.result : null;
  const hookOk = !!hook && hook.url === expected;
  const nonce = state.adminNonce && state.adminNonce.exp > Date.now() ? state.adminNonce : null;
  const others = state.candidates.filter((c) => c.id !== state.channel?.id);

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
      {ok && OK[ok] && <Notice>{OK[ok]}</Notice>}
      {error && <Notice tone="error">{ERR[error] ?? "Xatolik yuz berdi."}</Notice>}

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
                    <form action={chooseChannelAction}>
                      <input type="hidden" name="channel" value={c.username ? `@${c.username}` : c.id} />
                      <SubmitButton className="chip chip-ok" pendingLabel="…">Shu kanalni tanlash</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={chooseChannelAction} className="adm-tg-form">
              <label htmlFor="tg-channel" className="sr-only">Kanal nomi</label>
              <input id="tg-channel" type="text" name="channel" placeholder="@kanal_nomi" required maxLength={64} />
              <SubmitButton className="btn btn-sm" pendingLabel="Tekshirilmoqda…">{state.channel ? "Boshqa kanalga almashtirish" : "Kanalni ulash"}</SubmitButton>
            </form>
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
                    const title = p.kind === "font" ? fontNames.get(p.ref) ?? p.ref : p.kind === "digest" ? p.ref : workTitles.get(p.ref) ?? `ish #${p.ref}`;
                    const href = p.kind === "font" ? `/admin/telegram/post?font=${encodeURIComponent(p.ref)}` : p.kind === "digest" ? "/admin/telegram/post?digest=1" : `/admin/telegram/post?work=${p.ref}`;
                    const label = p.kind === "font" ? "Shrift" : p.kind === "digest" ? "Dayjest" : "Ish";
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
