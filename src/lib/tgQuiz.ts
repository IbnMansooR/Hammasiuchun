// The bot's daily quiz: "Bu qaysi shrift?" One question a day, the same for everybody (kept in
// BotQuizDay so the answer can't change if the catalogue does); a streak of days played, points,
// a weekly ranking, and a reminder when a streak is at risk. /viktorina and /reyting.
// Practice questions ("Mashq") are stateless: the right answer index travels in the buttons.
import { db } from "./db";
import { tashkentDay } from "./analytics";
import { botUsername, esc, pause, sendMessage, sendPhotoOrText, tg, type Keyboard } from "./telegram";
import { sampleFonts, uzbekize, type SampleFont } from "./fontSamples";
import { PALETTE_COUNT, cardUrl } from "./playCards";
import { hasProfanity } from "./profanity";
import { answer } from "./tgAdmin";

type Opt = { slug: string; name: string };
type Question = { slug: string; word: string; options: Opt[]; correct: number; palette: number };

const WORDS = ["Toshkent", "Samarqand", "Bahor keldi", "Salom dunyo", "Feekr", "Navroʻz", "Oltin kuz", "Kitob", "Orzu", "Quyosh", "Yangi kun", "Dizayn", "Buxoro", "Marhamat"];
const POOL = 150; // the most downloaded families make the questions
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function rngOf(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffled = <T,>(a: T[], r: () => number) => a.map((x) => [r(), x] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

/** A question from a seed: a font set in a word, four names (same kind of font where possible). */
async function buildQuestion(seed: string): Promise<Question | null> {
  const pool = (await sampleFonts()).slice(0, POOL);
  if (pool.length < 4) return null;
  const r = rngOf(seed);
  const target = pool[Math.floor(r() * pool.length)];
  const draws = (f: SampleFont, w: string) => [...w].every((c) => /\s/.test(c) || f.chars.includes(c));
  const word = shuffled(WORDS, r).find((w) => draws(target, w));
  if (!word) return null;
  const cats = new Map((await db.family.findMany({ where: { slug: { in: pool.map((f) => f.slug) } }, select: { slug: true, category: true } })).map((x) => [x.slug, x.category]));
  const rest = shuffled(pool.filter((f) => f.slug !== target.slug && f.name !== target.name), r);
  const same = rest.filter((f) => cats.get(f.slug) === cats.get(target.slug));
  const others: SampleFont[] = [];
  for (const f of [...same, ...rest]) if (!others.some((o) => o.name === f.name) && others.length < 3) others.push(f);
  if (others.length < 3) return null;
  const options = shuffled([target, ...others], r).map((f) => ({ slug: f.slug, name: f.name }));
  return { slug: target.slug, word, options, correct: options.findIndex((o) => o.slug === target.slug), palette: Math.floor(r() * PALETTE_COUNT) };
}

async function dailyQuestion(day: string): Promise<Question | null> {
  const row = await db.botQuizDay.findUnique({ where: { day } });
  if (row) return { slug: row.slug, word: row.word, options: JSON.parse(row.options) as Opt[], correct: row.correct, palette: row.palette };
  const q = await buildQuestion(`day:${day}`);
  if (!q) return null;
  await db.botQuizDay.create({ data: { day, slug: q.slug, word: q.word, options: JSON.stringify(q.options), correct: q.correct, palette: q.palette } }).catch(() => null); // another request got there first
  return dailyQuestion(day);
}

const shiftDay = (day: string, n: number) => tashkentDay(new Date(Date.parse(`${day}T12:00:00+05:00`) + n * 864e5));
const weekKey = (day: string) => shiftDay(day, -((new Date(`${day}T12:00:00+05:00`).getUTCDay() || 7) - 1)); // the Monday
const compact = (day: string) => day.replace(/-/g, "");
const expand = (c: string) => `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}`;

// A soft per-instance brake: each question draws a picture.
const recent = new Map<string, { n: number; t: number }>();
function tooMany(chatId: string): boolean {
  const now = Date.now();
  const r = recent.get(chatId);
  if (!r || now - r.t > 60_000) {
    if (recent.size > 5000) recent.clear();
    recent.set(chatId, { n: 1, t: now });
    return false;
  }
  return ++r.n > 20;
}

type From = { id: number; first_name?: string; username?: string; is_bot?: boolean };
type QuizCb = { id: string; from: From; data?: string; message?: { message_id: number; chat: { id: number; type: string }; caption?: string; text?: string; reply_markup?: { inline_keyboard?: { text: string }[][] } } };

const nameOf = (raw: string | undefined): string | null => {
  const s = uzbekize((raw ?? "").replace(/[^\p{L}ʻʼ' ]/gu, "").replace(/\s+/g, " ").trim()).slice(0, 14).trim();
  return s.length >= 2 && !hasProfanity(s) ? s : null;
};

async function player(from: From) {
  const name = nameOf(from.first_name);
  const chatId = String(from.id);
  return db.botQuiz.upsert({ where: { chatId }, create: { chatId, name }, update: name ? { name } : {} });
}

const share = (text: string) => ({ text: "📤 Doʻstingga", url: `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${botUsername()}`)}&text=${encodeURIComponent(text)}` });
const optionRows = (prefix: string, opts: Opt[]): Keyboard => [0, 2].map((i) => opts.slice(i, i + 2).map((o, j) => ({ text: o.name.slice(0, 28), callback_data: `${prefix}:${i + j}` })));
const afterRows = (txt: string): Keyboard => [[{ text: "🎯 Mashq: yana bitta", callback_data: "q:n" }, { text: "🏆 Reyting", callback_data: "q:l" }], [share(txt)]];

/** /viktorina and the "🎯 Bugungi savol" buttons. */
export async function showDaily(from: From): Promise<void> {
  const chatId = String(from.id);
  if (tooMany(chatId)) return;
  const day = tashkentDay();
  const [p, q] = await Promise.all([player(from), dailyQuestion(day)]);
  if (!q) { await sendMessage(chatId, "Viktorina hozircha tayyor emas. Birozdan keyin qayta urinib koʻring."); return; }
  if (p.lastDay === day) {
    await sendMessage(chatId, `Bugungi savolga javob berdingiz ✓\n🔥 Streak: <b>${p.streak}</b> kun · ⭐ Ball: <b>${p.score}</b>\nYangi savol ertaga. Hozircha mashq qilishingiz mumkin.`, afterRows(`Men ${p.streak} kunlik streakdaman! Sen ham sinab koʻr`));
    return;
  }
  await sendPhotoOrText(chatId, cardUrl("quiz", q.word, q.slug, String(q.palette)), `🎯 <b>Kunlik viktorina</b>\n🔥 Streak: <b>${p.streak}</b> kun · ⭐ Ball: <b>${p.score}</b>\n\nBu qaysi shrift?`, optionRows(`q:d:${compact(day)}`, q.options));
}

/** q:d:<yyyymmdd>:<option> — the answer that counts. */
async function answerDaily(q: QuizCb, dayC: string, pick: number): Promise<void> {
  const chatId = String(q.from.id);
  const day = expand(dayC);
  if (day !== tashkentDay()) { await answer(q.id, "Bu savol eskirgan. Bugungi savol: /viktorina", true); return; }
  const [prev, qs] = await Promise.all([player(q.from), dailyQuestion(day)]);
  if (!qs || pick < 0 || pick >= qs.options.length) { await answer(q.id, ""); return; }
  // One answer a day: whoever claims the day first counts (a double press gives one).
  const claimed = await db.botQuiz.updateMany({ where: { chatId, OR: [{ lastDay: null }, { lastDay: { not: day } }] }, data: { lastDay: day } });
  if (claimed.count === 0) { await answer(q.id, "Bugun javob berib boʻldingiz. Ertaga yangi savol!", true); return; }
  const right = pick === qs.correct;
  const streak = prev.lastDay === shiftDay(day, -1) ? prev.streak + 1 : 1;
  const points = right ? 10 + Math.min(streak, 7) : 0;
  const wk = weekKey(day);
  const wScore = (prev.wKey === wk ? prev.wScore : 0) + points;
  await db.botQuiz.update({ where: { chatId }, data: { streak, best: Math.max(prev.best, streak), score: { increment: points }, wScore, wKey: wk, played: { increment: 1 }, correct: { increment: right ? 1 : 0 } } });
  await answer(q.id, right ? "To‘g‘ri! 🎉" : "Afsus 🙈");
  const name = qs.options[qs.correct].name;
  const caption = `${right ? "✅ <b>Toʻgʻri!</b>" : "❌ <b>Afsus.</b>"} Bu — <b>${esc(name)}</b>\n🔥 Streak: <b>${streak}</b> kun${right ? ` · +${points} ball` : ""} · ⭐ Jami: <b>${prev.score + points}</b>\nErtaga yangi savol. Streakni uzmang!`;
  const kb = afterRows(`Men ${streak} kunlik streakdaman! Sen ham sinab koʻr`);
  if (q.message) await tg("editMessageMedia", { chat_id: chatId, message_id: q.message.message_id, media: { type: "photo", media: cardUrl("quiz", qs.word, qs.slug, `${qs.palette}r`), caption, parse_mode: "HTML" }, reply_markup: { inline_keyboard: kb } });
  else await sendMessage(chatId, caption, kb);
}

/** q:n — a practice question (no points, no streak). */
async function practice(from: From): Promise<void> {
  const chatId = String(from.id);
  if (tooMany(chatId)) return;
  const q = await buildQuestion(`p:${Date.now()}:${from.id}`);
  if (!q) return;
  await sendPhotoOrText(chatId, cardUrl("quiz", q.word, q.slug, String(q.palette)), "🎯 <b>Mashq</b> (ball va streak hisoblanmaydi)\n\nBu qaysi shrift?", optionRows(`q:p:${q.correct}`, q.options));
}

/** q:p:<correct>:<pick> — the names are read back from the buttons. */
async function answerPractice(q: QuizCb, correct: number, pick: number): Promise<void> {
  const rows = (q.message?.reply_markup?.inline_keyboard ?? []).flat();
  const name = rows[correct]?.text;
  if (!q.message || !name || pick < 0 || pick > 3) { await answer(q.id, ""); return; }
  const right = pick === correct;
  await answer(q.id, right ? "To‘g‘ri! 🎉" : "Afsus 🙈");
  await tg("editMessageCaption", { chat_id: String(q.message.chat.id), message_id: q.message.message_id, caption: `${right ? "✅ <b>Toʻgʻri!</b>" : "❌ <b>Afsus.</b>"} Bu — <b>${esc(name)}</b>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🎯 Yana bitta", callback_data: "q:n" }, { text: "Bugungi savol", callback_data: "q:t" }]] } });
}

/** /reyting: this week's top ten. */
export async function showLeaderboard(from: From): Promise<void> {
  const chatId = String(from.id);
  const wk = weekKey(tashkentDay());
  const top = await db.botQuiz.findMany({ where: { wKey: wk, wScore: { gt: 0 } }, orderBy: [{ wScore: "desc" }, { updatedAt: "asc" }], take: 10 });
  const me = await db.botQuiz.findUnique({ where: { chatId } });
  const medal = ["🥇", "🥈", "🥉"];
  const lines = top.map((r, i) => `${medal[i] ?? `${i + 1}.`} ${r.hidden || !r.name ? "Anonim" : esc(r.name)} — <b>${r.wScore}</b>${r.chatId === chatId ? " (siz)" : ""}`);
  let mine = "";
  if (me && me.wKey === wk && me.wScore > 0 && !top.some((r) => r.chatId === chatId)) {
    const ahead = await db.botQuiz.count({ where: { wKey: wk, wScore: { gt: me.wScore } } });
    mine = `\n\nSiz: ${ahead + 1}-oʻrin · ${me.wScore} ball`;
  }
  const body = lines.length ? lines.join("\n") : "Bu hafta hali hech kim ball olmagan. Birinchi boʻling!";
  await sendMessage(chatId, `🏆 <b>Haftalik reyting</b>\n\n${body}${mine}\n\n<i>Har dushanba yangilanadi. Toʻgʻri javob 10 ball + streak bonusi.</i>`, [
    [{ text: "🎯 Bugungi savol", callback_data: "q:t" }],
    [{ text: me?.hidden ? "👀 Ismimni koʻrsat" : "🙈 Ismimni yashir", callback_data: "q:h" }],
  ]);
}

export async function handleQuizCallback(q: QuizCb): Promise<void> {
  const data = q.data ?? "";
  const d = /^q:d:(\d{8}):([0-3])$/.exec(data);
  const p = /^q:p:([0-3]):([0-3])$/.exec(data);
  if (d) return answerDaily(q, d[1], Number(d[2]));
  if (p) return answerPractice(q, Number(p[1]), Number(p[2]));
  if (data === "q:t") { await answer(q.id, ""); return showDaily(q.from); }
  if (data === "q:n") { await answer(q.id, ""); return practice(q.from); }
  if (data === "q:l") { await answer(q.id, ""); return showLeaderboard(q.from); }
  if (data === "q:h") {
    const row = await db.botQuiz.findUnique({ where: { chatId: String(q.from.id) } });
    if (row) await db.botQuiz.update({ where: { chatId: row.chatId }, data: { hidden: !row.hidden } });
    await answer(q.id, row?.hidden ? "Ismingiz koʻrinadi" : "Ismingiz yashirildi");
    return;
  }
  if (data === "q:r") {
    await db.botQuiz.updateMany({ where: { chatId: String(q.from.id) }, data: { remind: false } });
    await answer(q.id, "Eslatma oʻchirildi");
    return;
  }
  await answer(q.id, "");
}

/** In the evening: players whose streak ends today get one reminder (a few per call, until all are told). */
export async function runQuizReminders(now = new Date()): Promise<{ sent: number }> {
  const hour = Number(new Date(now.getTime() + 5 * 3600e3).toISOString().slice(11, 13));
  if (hour < Number(process.env.QUIZ_REMIND_HOUR ?? 19)) return { sent: 0 };
  const day = tashkentDay(now);
  const due = await db.botQuiz.findMany({ where: { remind: true, lastDay: shiftDay(day, -1), streak: { gte: 1 }, OR: [{ remindedDay: null }, { remindedDay: { not: day } }] }, take: 100 });
  let sent = 0;
  for (const u of due) {
    await db.botQuiz.update({ where: { chatId: u.chatId }, data: { remindedDay: day } });
    const r = await sendMessage(u.chatId, `🔥 <b>${u.streak} kunlik streakingiz xavfda!</b>\nBugungi savolga javob bering, streak uzilmasin.`, [[{ text: "🎯 Bugungi savol", callback_data: "q:t" }], [{ text: "🔕 Eslatmani oʻchirish", callback_data: "q:r" }]]).catch(() => null);
    if (r && !r.ok && r.code === 403) await db.botQuiz.update({ where: { chatId: u.chatId }, data: { remind: false } }); // blocked the bot
    if (r?.ok) sent++;
    await pause(40);
  }
  return { sent };
}
