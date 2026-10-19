// The daily quiz in the Telegram channel. At the set time the day's question (the same one the bot
// asks, lib/tgQuiz) goes out as a card with four buttons; pressing one counts for the player (a
// popup tells them how they did, points and streak are shared with the bot); next morning the post
// is edited to show the answer and how the votes went; on Monday the finished week's top ten is
// posted. Only the answer counts: nothing but the pressed button's number is kept per player.
import { after } from "next/server";
import { db } from "./db";
import { tashkentDay } from "./analytics";
import { botUsername, esc, pause, sendMessage, tg, sendPhotoOrText, type Keyboard } from "./telegram";
import { getTgState, isClock } from "./tgState";
import { cardUrl } from "./playCards";
import { answer } from "./tgAdmin";
import { fontFact } from "./aiIdeas";
import { compact, dailyQuestion, expand, scoreDaily, shiftDay, weekKey, type QuizCb } from "./tgQuiz";
import { dueSlots } from "./tgAutopost";

export type CQPost = { messageId: number; chatId: string; count: number; editedAt: number; revealed: boolean };
export type ChannelQuiz = { on: boolean; time: string; reveal: string; weekly: boolean; posts: Record<string, CQPost> };

const KEY = "channel-quiz";
const DEFAULT: ChannelQuiz = { on: false, time: "19:00", reveal: "09:00", weekly: true, posts: {} };
const KEEP_DAYS = 14;
const EDIT_EVERY = 60 * 1000; // the cron catches up on a count the live update skipped
const LIVE_EDIT_GAP = 2500; // Telegram throttles edits of one message: a burst of presses is one edit

export function readChannelQuiz(raw: unknown): ChannelQuiz {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<ChannelQuiz>;
  const posts: Record<string, CQPost> = {};
  if (v.posts && typeof v.posts === "object") {
    for (const [day, p] of Object.entries(v.posts)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !p || typeof p.messageId !== "number") continue;
      posts[day] = { messageId: p.messageId, chatId: String(p.chatId), count: Number(p.count) || 0, editedAt: Number(p.editedAt) || 0, revealed: !!p.revealed };
    }
  }
  return {
    on: typeof v.on === "boolean" ? v.on : DEFAULT.on,
    time: typeof v.time === "string" && isClock(v.time) ? v.time : DEFAULT.time,
    reveal: typeof v.reveal === "string" && isClock(v.reveal) ? v.reveal : DEFAULT.reveal,
    weekly: typeof v.weekly === "boolean" ? v.weekly : DEFAULT.weekly,
    posts,
  };
}

export async function getChannelQuiz(): Promise<ChannelQuiz> {
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    return readChannelQuiz(row ? JSON.parse(row.value) : null);
  } catch {
    return readChannelQuiz(null);
  }
}

export async function updateChannelQuiz(change: (s: ChannelQuiz) => void): Promise<ChannelQuiz> {
  const s = await getChannelQuiz();
  change(s);
  const keep = new Set(Object.keys(s.posts).sort().slice(-KEEP_DAYS));
  for (const d of Object.keys(s.posts)) if (!keep.has(d)) delete s.posts[d];
  const value = JSON.stringify(s);
  await db.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return s;
}

const momentOf = (day: string, time: string) => Date.parse(`${day}T${time}:00+05:00`);
/** When the answer of a question is shown: next morning at the set time. */
export const revealAt = (day: string, reveal: string) => momentOf(shiftDay(day, 1), reveal);

const botLink = (start: string) => `https://t.me/${botUsername()}?start=${start}`;
const linkRow = (): Keyboard[number] => [{ text: "🤖 Botda oʻynash", url: botLink("viktorina") }, { text: "🏆 Reyting", url: botLink("reyting") }];

function openCaption(cq: ChannelQuiz, n: number): string {
  return `🎯 <b>Kunlik viktorina</b>\n\nBu qaysi shrift? Pastdagi tugmalardan birini tanlang.\n⏳ Javob ertaga ${cq.reveal} da ochiladi${n > 0 ? ` · 👥 ${n} kishi javob berdi` : ""}\n\n<i>Bir kunda bitta javob. Toʻgʻri javob 10 ball + streak bonusi.</i>`;
}

const openKeyboard = (day: string, names: string[]): Keyboard => [
  ...[0, 2].map((i) => names.slice(i, i + 2).map((n, j) => ({ text: n.slice(0, 28), callback_data: `q:c:${compact(day)}:${i + j}` }))),
  linkRow(),
];

export type CQResult = { posted: string | null; revealed: string[]; weekly: boolean; reason?: "off" | "nochannel" | "notdue" | "busy" | "noquestion" | "send" };

const claim = (key: string) => db.loginAttempt.create({ data: { key, count: 1 } }).then(() => true, () => false);

/** Sends the question of `day` to the channel (the caller has claimed the slot). */
async function postQuestion(day: string): Promise<string | null> {
  const { channel } = await getTgState();
  if (!channel) return null;
  const q = await dailyQuestion(day);
  if (!q) return null;
  const cq = await getChannelQuiz();
  const r = await sendPhotoOrText(channel.id, cardUrl("quiz", q.word, q.slug, String(q.palette)), openCaption(cq, 0), openKeyboard(day, q.options.map((o) => o.name))).catch(() => null);
  if (!r?.ok) return null;
  const messageId = (r.result as { message_id: number }).message_id;
  await updateChannelQuiz((s) => { s.posts[day] = { messageId, chatId: channel.id, count: 0, editedAt: Date.now(), revealed: false }; });
  return day;
}

/** The post edited to the answer, with how the votes went. */
async function revealPost(day: string): Promise<boolean> {
  const cq = await getChannelQuiz();
  const post = cq.posts[day];
  const q = await dailyQuestion(day);
  if (!post || !q) return false;
  const picks = await db.botQuizPick.groupBy({ by: ["pick"], where: { day }, _count: { _all: true } });
  const counts = q.options.map((_, i) => picks.find((p) => p.pick === i)?._count._all ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const pct = (n: number) => (total ? Math.round((100 * n) / total) : 0);
  const lines = q.options.map((o, i) => `${i === q.correct ? "✅" : "▫️"} ${esc(o.name)} — ${pct(counts[i])}%`).join("\n");
  const fact = await fontFact(q.slug).catch(() => null);
  const caption = `✅ <b>Javob: ${esc(q.options[q.correct].name)}</b>\n\n${fact ? `💡 ${esc(fact)}\n\n` : ""}${total ? `👥 ${total} kishi javob berdi, ${pct(counts[q.correct])}% toʻgʻri topdi:\n${lines}` : "Bu safar hech kim javob bermadi."}\n\nYangi savol bugun ${cq.time} da. Reyting va mashq — botda.`;
  const r = await tg("editMessageMedia", { chat_id: post.chatId, message_id: post.messageId, media: { type: "photo", media: cardUrl("quiz", q.word, q.slug, `${q.palette}r`), caption, parse_mode: "HTML" }, reply_markup: { inline_keyboard: [linkRow()] } });
  await updateChannelQuiz((s) => { if (s.posts[day]) s.posts[day].revealed = true; });
  return r.ok;
}

/** The finished week's top ten, as a message in the channel. */
async function postWeekly(weekMonday: string): Promise<boolean> {
  const { channel } = await getTgState();
  if (!channel) return false;
  const top = await db.botQuiz.findMany({ where: { wKey: weekMonday, wScore: { gt: 0 } }, orderBy: [{ wScore: "desc" }, { updatedAt: "asc" }], take: 10 });
  if (top.length === 0) return false;
  const medal = ["🥇", "🥈", "🥉"];
  const lines = top.map((r, i) => `${medal[i] ?? `${i + 1}.`} ${r.hidden || !r.name ? "Anonim" : esc(r.name)} — <b>${r.wScore}</b>`);
  const r = await sendMessage(channel.id, `🏆 <b>Oʻtgan haftaning kuchlilari</b>\n\n${lines.join("\n")}\n\nBu hafta ham qatnashing: har kuni ${(await getChannelQuiz()).time} da yangi savol.`, [linkRow()]).catch(() => null);
  return !!r?.ok;
}

/** Called by the 5-minute cron: today's question at its time, the answer of yesterday's in the morning,
 * the weekly ranking on Mondays, and the count of answers kept fresh on the open post. `force` posts now. */
export async function runChannelQuiz({ force = false, now = Date.now() }: { force?: boolean; now?: number } = {}): Promise<CQResult> {
  const cq = await getChannelQuiz();
  if (!force && (!cq.on || process.env.CHANNEL_QUIZ === "off")) return { posted: null, revealed: [], weekly: false, reason: "off" };
  const { channel } = await getTgState();
  if (!channel) return { posted: null, revealed: [], weekly: false, reason: "nochannel" };
  const out: CQResult = { posted: null, revealed: [], weekly: false };

  // 1. The answer of a finished question (the oldest first, one call may do a few).
  for (const day of Object.keys(cq.posts).sort()) {
    const p = cq.posts[day];
    if (p.revealed || revealAt(day, cq.reveal) > now) continue;
    if (!(await claim(`cquizr:${day}`))) continue;
    if (await revealPost(day)) out.revealed.push(day);
    // Monday's reveal closes Sunday, so the week is complete.
    if (cq.weekly && new Date(`${shiftDay(day, 1)}T12:00:00+05:00`).getUTCDay() === 1) {
      const wk = weekKey(day);
      if (await claim(`cquizw:${wk}`)) out.weekly = await postWeekly(wk);
    }
    await pause(40);
  }

  // 2. The count of answers on the open post (the live update after each press may have been skipped).
  const today = tashkentDay(new Date(now));
  for (const day of [shiftDay(today, -1), today]) {
    const p = cq.posts[day];
    if (!p || p.revealed || now - p.editedAt < EDIT_EVERY) continue;
    await refreshCount(day, now);
  }

  // 3. The new question.
  if (force) {
    const day = tashkentDay(new Date(now));
    if (cq.posts[day]) return { ...out, reason: "busy" };
    out.posted = await postQuestion(day);
    return out.posted ? out : { ...out, reason: "noquestion" };
  }
  const due = dueSlots({ on: true, times: [cq.time], days: [1, 2, 3, 4, 5, 6, 7], lastAt: null, skip: [] }, now);
  if (due.length === 0) return { ...out, reason: "notdue" };
  let slot: (typeof due)[number] | null = null;
  for (const d of due) if (await claim(d.key.replace(/^autopost:/, "cquiz:"))) { slot = d; break; }
  if (!slot) return { ...out, reason: "busy" };
  const day = /^autopost:(\d{4}-\d{2}-\d{2})@/.exec(slot.key)![1];
  if (cq.posts[day]) return { ...out, reason: "busy" };
  out.posted = await postQuestion(day);
  if (!out.posted) return { ...out, reason: "noquestion" };
  return out;
}

/** The open post's caption with the number of people who have answered, edited right after an answer
 * (at most once every couple of seconds; the cron's 5-minute pass brings a skipped one up to date). */
export async function refreshCount(day: string, now = Date.now(), wait = false): Promise<boolean> {
  let cq = await getChannelQuiz();
  let p = cq.posts[day];
  if (!p || p.revealed) return false;
  if (now - p.editedAt < LIVE_EDIT_GAP) {
    // Too soon after the last edit: the live path waits its turn (so the last press of a burst always shows), the cron path leaves it.
    if (!wait) return false;
    await pause(LIVE_EDIT_GAP - (now - p.editedAt) + 150);
    now = Date.now();
    cq = await getChannelQuiz();
    p = cq.posts[day];
    if (!p || p.revealed || now - p.editedAt < LIVE_EDIT_GAP) return false;
  }
  const n = await db.botQuizPick.count({ where: { day } });
  if (n === p.count) return false;
  const q = await dailyQuestion(day);
  if (!q) return false;
  // Marked first, so a burst of presses doesn't send an edit each.
  await updateChannelQuiz((s) => { if (s.posts[day]) { s.posts[day].count = n; s.posts[day].editedAt = now; } });
  await tg("editMessageCaption", { chat_id: p.chatId, message_id: p.messageId, caption: openCaption(cq, n), parse_mode: "HTML", reply_markup: { inline_keyboard: openKeyboard(day, q.options.map((o) => o.name)) } });
  return true;
}

/** q:c:<yyyymmdd>:<option> — a button on the channel post. The popup is the only answer the player gets. */
export async function answerChannelQuiz(q: QuizCb): Promise<void> {
  const m = /^q:c:(\d{8}):([0-3])$/.exec(q.data ?? "");
  if (!m || q.from.is_bot) { await answer(q.id, ""); return; }
  const day = expand(m[1]);
  const cq = await getChannelQuiz();
  const post = cq.posts[day];
  if (!post || !q.message || String(q.message.chat.id) !== post.chatId || post.messageId !== q.message.message_id) { await answer(q.id, "Bu savol topilmadi.", true); return; }
  if (post.revealed || revealAt(day, cq.reveal) <= Date.now()) { await answer(q.id, "Bu savol yopilgan: javob postda koʻrsatilgan.", true); return; }
  const qs = await dailyQuestion(day);
  const pick = Number(m[2]);
  if (!qs || pick >= qs.options.length) { await answer(q.id, ""); return; }
  const res = await scoreDaily(q.from, day, qs, pick, true);
  if (!res) { await answer(q.id, "Bu kunga javob berib boʻlgansiz. Yangi savol — keyingi postda.", true); return; }
  after(() => refreshCount(day, Date.now(), true).catch(() => {}));
  await answer(
    q.id,
    res.right
      ? `✅ Toʻgʻri! +${res.points} ball · 🔥 ${res.streak} kun · ⭐ ${res.total}\nReyting va mashq: ${botLink("reyting").replace("https://", "")}`
      : `❌ Afsus, bu emas. 🔥 ${res.streak} kun · ⭐ ${res.total}\nJavob ertaga ${cq.reveal} da ochiladi.`,
    true,
  );
}

export const channelQuizLink = (messageId: number, channel: { username: string | null; id: string }) => (channel.username ? `https://t.me/${channel.username}/${messageId}` : `https://t.me/c/${channel.id.replace(/^-100/, "")}/${messageId}`);
