// The admin side of the bot: a message with ✅/❌ buttons when a member sends a work, the
// handling of those buttons, and the morning report. Everything goes only to the admins'
// private chats that were connected from /admin/telegram.
import { db } from "./db";
import { SITE_URL } from "./site";
import { formatDate, formatNumber } from "./format";
import { TZ_OFFSET_MS, tashkentDay } from "./analytics";
import { absoluteImage, esc, pause, sendMessage, sendPhotoOrText, siteLink, tg, type Keyboard } from "./telegram";
import { getTgState, isTgAdmin } from "./tgState";
import { approveWork, rejectWork } from "./workModeration";
import { splitLines, splitTags } from "./works";

const DAY = 24 * 60 * 60 * 1000;

export const REJECT_REASONS = [
  "Rasmlar sifati yetarli emas",
  "Ishda Feekr shrifti koʻrinmaydi",
  "Mualliflik shubhali: ish sizniki ekanini koʻrsating",
  "“Dizaynerlar” boʻlimi mavzusiga mos emas",
];

const adminUrl = (path: string) => `${SITE_URL}${path}`;

function reviewKeyboard(id: number): Keyboard {
  return [
    [{ text: "✅ Tasdiqlash", callback_data: `w:a:${id}` }, { text: "❌ Rad etish", callback_data: `w:r:${id}` }],
    [{ text: "Saytda ochish", url: adminUrl(`/admin/works/${id}`) }],
  ];
}

function reasonsKeyboard(id: number): Keyboard {
  return [
    ...REJECT_REASONS.map((r, i) => [{ text: r, callback_data: `w:x:${id}:${i}` }]),
    [{ text: "Boshqa sabab (saytda yozish)", url: adminUrl(`/admin/works#w${id}`) }],
    [{ text: "↩ Orqaga", callback_data: `w:b:${id}` }],
  ];
}

/** Sent right after a member submits a work. Never throws. */
export async function notifyAdminsNewWork(workId: number): Promise<void> {
  try {
    const state = await getTgState();
    if (state.admins.length === 0) return;
    const w = await db.work.findUnique({ where: { id: workId } });
    if (!w) return;
    const who = w.submittedById
      ? await db.user.findUnique({ where: { id: w.submittedById }, select: { name: true, email: true, phone: true, telegramUsername: true } })
      : null;
    const sender = who ? who.name || who.email || who.phone || (who.telegramUsername ? `@${who.telegramUsername}` : "aʼzo") : "aʼzo";
    const fonts = splitTags(w.fonts);
    const lines = [
      "🆕 <b>Yangi ish tasdiq kutmoqda</b>",
      "",
      `<b>${esc(w.title)}</b>`,
      w.summary ? esc(w.summary) : null,
      `Muallif: ${esc(w.authorName ?? "—")}${w.authorUrl ? ` · <a href="${esc(w.authorUrl)}">portfolio</a>` : ""}`,
      `Yubordi: ${esc(sender)}`,
      `Rasmlar: ${splitLines(w.images).length} ta${fonts.length ? ` · Shriftlar: ${esc(fonts.join(", "))}` : ""}`,
    ].filter((l) => l !== null);
    const html = lines.join("\n").slice(0, 1000);
    for (const a of state.admins) {
      await sendPhotoOrText(a.chatId, absoluteImage(w.coverImage), html, reviewKeyboard(w.id));
      await pause(40);
    }
  } catch {
    /* the work is saved and visible in the admin queue either way */
  }
}

type CallbackQuery = {
  id: string;
  from: { id: number };
  data?: string;
  message?: { message_id: number; chat: { id: number; type: string } };
};

const answer = (id: string, text: string, alert = false) =>
  tg("answerCallbackQuery", { callback_query_id: id, text: text.slice(0, 190), show_alert: alert });

const setKeyboard = (q: CallbackQuery, keyboard: Keyboard) =>
  q.message
    ? tg("editMessageReplyMarkup", { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: keyboard } })
    : Promise.resolve(null);

export async function handleAdminCallback(q: CallbackQuery): Promise<void> {
  const state = await getTgState();
  // Only a connected admin, pressing a button in their own private chat with the bot.
  if (!isTgAdmin(state, q.from.id) || q.message?.chat.type !== "private" || String(q.message.chat.id) !== String(q.from.id)) {
    await answer(q.id, "Bu tugma faqat Feekr admini uchun.", true);
    return;
  }
  const m = /^w:([arxbn]):(\d{1,9})(?::(\d))?$/.exec(q.data ?? "");
  if (!m) {
    await answer(q.id, "");
    return;
  }
  const [, op, idRaw, reasonRaw] = m;
  const id = Number(idRaw);

  if (op === "r") {
    await setKeyboard(q, reasonsKeyboard(id));
    await answer(q.id, "Sababni tanlang");
    return;
  }
  if (op === "b") {
    await setKeyboard(q, reviewKeyboard(id));
    await answer(q.id, "");
    return;
  }
  if (op === "n") {
    await answer(q.id, "");
    return;
  }

  const w = await db.work.findUnique({ where: { id }, select: { slug: true } });
  if (!w) {
    await setKeyboard(q, [[{ text: "Bu ish oʻchirilgan", callback_data: "w:n:0" }]]);
    await answer(q.id, "Bu ish oʻchirilgan.", true);
    return;
  }
  if (op === "a") {
    const r = await approveWork(id);
    await setKeyboard(q, [
      [{ text: "✅ Tasdiqlandi · saytda koʻrish", url: siteLink(`/dizaynerlar/${w.slug}`) }],
      [{ text: "📣 Kanalga yuborish", url: adminUrl(`/admin/telegram/post?work=${id}`) }],
    ]);
    await answer(q.id, r === "already" ? "Allaqachon chop etilgan." : "Tasdiqlandi. Muallifga xabar ketdi.");
    return;
  }
  // op === "x": reject with a preset reason
  const reason = REJECT_REASONS[Number(reasonRaw)];
  if (!reason) {
    await answer(q.id, "");
    return;
  }
  const r = await rejectWork(id, reason);
  await setKeyboard(q, [[{ text: `❌ Rad etildi: ${reason}`.slice(0, 60), callback_data: "w:n:0" }]]);
  await answer(q.id, r === "already" ? "Allaqachon rad etilgan." : "Rad etildi. Muallifga sabab yuborildi.");
}

/* ---------------- morning report ---------------- */

const pct = (now: number, before: number) => {
  if (!before) return "";
  const d = Math.round(((now - before) / before) * 100);
  return d === 0 ? " (oʻzgarishsiz)" : ` (${d > 0 ? "+" : ""}${d}%)`;
};

const SOURCE: Record<string, string> = { direct: "toʻgʻridan-toʻgʻri", referral: "boshqa saytlar", instagram: "Instagram", telegram: "Telegram", google: "Google" };

/** Yesterday in Tashkent, compared with the day before. */
export async function buildDailyReport(now = new Date()): Promise<string> {
  const todayStart = Date.parse(`${tashkentDay(now)}T00:00:00Z`) - TZ_OFFSET_MS;
  const from = new Date(todayStart - DAY);
  const to = new Date(todayStart);
  const prevFrom = new Date(todayStart - 2 * DAY);

  type Kpi = { visitors: number; views: number; downloads: number; wishes: number; signups: number };
  const kpiOf = (a: Date, b: Date) => db.$queryRaw<Kpi[]>`
    SELECT COUNT(DISTINCT visitor) FILTER (WHERE name = 'view')::int AS visitors,
           COUNT(*) FILTER (WHERE name = 'view')::int AS views,
           COUNT(*) FILTER (WHERE name = 'download')::int AS downloads,
           COUNT(*) FILTER (WHERE name = 'wish')::int AS wishes,
           COUNT(*) FILTER (WHERE name = 'signup')::int AS signups
    FROM "Hit" WHERE "at" >= ${a} AND "at" < ${b}`;

  const [[k], [p], sources, downloads, newUsers, pending] = await Promise.all([
    kpiOf(from, to),
    kpiOf(prevFrom, from),
    db.$queryRaw<{ source: string; v: number }[]>`
      SELECT source, COUNT(DISTINCT visitor)::int AS v FROM "Hit"
      WHERE "at" >= ${from} AND "at" < ${to} AND name = 'view' GROUP BY source ORDER BY v DESC LIMIT 3`,
    db.$queryRaw<{ slug: string; n: number }[]>`
      SELECT meta AS slug, COUNT(*)::int AS n FROM "Hit"
      WHERE "at" >= ${from} AND "at" < ${to} AND name = 'download' AND meta IS NOT NULL GROUP BY meta ORDER BY n DESC LIMIT 3`,
    db.user.count({ where: { createdAt: { gte: from, lt: to } } }),
    db.work.count({ where: { status: "pending" } }),
  ]);
  const names = new Map(
    (await db.family.findMany({ where: { slug: { in: downloads.map((d) => d.slug) } }, select: { slug: true, name: true } })).map((f) => [f.slug, f.name]),
  );

  const n = (x: number) => formatNumber(x);
  const lines = [
    `📊 <b>Kecha, ${esc(formatDate(new Date(todayStart - DAY + TZ_OFFSET_MS)).replace(/, \d{4}$/, ""))}</b>`,
    "",
    `👤 ${n(k?.visitors ?? 0)} mehmon${pct(k?.visitors ?? 0, p?.visitors ?? 0)} · ${n(k?.views ?? 0)} koʻrish`,
    `⬇️ ${n(k?.downloads ?? 0)} yuklash · ♡ ${n(k?.wishes ?? 0)}`,
    `🆕 ${n(newUsers)} yangi aʼzo`,
  ];
  if (sources.length) lines.push(`🧭 ${sources.map((s) => `${esc(SOURCE[s.source] ?? s.source)} ${n(s.v)}`).join(" · ")}`);
  if (downloads.length) lines.push(`🏆 ${downloads.map((d) => `${esc(names.get(d.slug) ?? d.slug)} ${n(d.n)}`).join(" · ")}`);
  if (pending) lines.push("", `⏳ Tasdiq kutayotgan ishlar: <b>${n(pending)}</b>`);
  return lines.join("\n");
}

export async function sendDailyReport(): Promise<{ sent: number }> {
  const state = await getTgState();
  if (state.admins.length === 0) return { sent: 0 };
  const html = await buildDailyReport();
  const keyboard: Keyboard = [[{ text: "Statistika", url: adminUrl("/admin/stats") }]];
  const pending = await db.work.count({ where: { status: "pending" } });
  if (pending) keyboard[0].push({ text: "Ishlarni koʻrish", url: adminUrl("/admin/works") });
  let sent = 0;
  for (const a of state.admins) {
    if ((await sendMessage(a.chatId, html, keyboard)).ok) sent++;
    await pause(40);
  }
  return { sent };
}
