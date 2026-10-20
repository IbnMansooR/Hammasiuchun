// /palitra in the bot: pick a kind of business, then a mood, and get a ready brand palette with fonts as a picture.
// "Yana" shows the next one. The kits come from the library on the site (lib/brandKit): no AI call here.
import { answer, type CallbackQuery } from "./tgAdmin";
import { esc, sendMessage, sendPhotoOrText, siteLink, tg, type Keyboard } from "./telegram";
import { INDUSTRIES, MOODS, ROLES, ROLE_LABEL, industryLabel, kitsFor, moodLabel } from "./brandKit";
import { kitCardUrl } from "./brandKitCard";
import { db } from "./db";

const industryKb = (): Keyboard => {
  const rows: Keyboard = [];
  for (let i = 0; i < INDUSTRIES.length; i += 2) rows.push(INDUSTRIES.slice(i, i + 2).map(([, label], j) => ({ text: label, callback_data: `k:${i + j}` })));
  return rows;
};
const moodKb = (i: number): Keyboard => {
  const rows: Keyboard = [];
  for (let m = 0; m < MOODS.length; m += 2) rows.push(MOODS.slice(m, m + 2).map(([, label], j) => ({ text: label, callback_data: `k:${i}:${m + j}` })));
  rows.push([{ text: "⬅️ Boshqa soha", callback_data: "k:x" }]);
  return rows;
};

export const KIT_ASK = "🎨 Brend palitrasi.\n\nBiznesingiz qaysi sohada?";

export async function askKit(chatId: string): Promise<void> {
  await sendMessage(chatId, KIT_ASK, industryKb());
}

/** k:x (back) | k:<industry> (moods) | k:<industry>:<mood>[:<n>] (a palette) */
export async function handleKitCallback(q: CallbackQuery): Promise<void> {
  const m = /^k:(?:(x)|(\d{1,2})(?::(\d{1,2})(?::(\d{1,3}))?)?)$/.exec(q.data ?? "");
  if (!m || !q.message) { await answer(q.id, ""); return; }
  const chatId = String(q.message.chat.id), messageId = q.message.message_id;
  await answer(q.id, "");
  if (m[1]) { await tg("editMessageText", { chat_id: chatId, message_id: messageId, text: KIT_ASK, reply_markup: { inline_keyboard: industryKb() } }); return; }
  const i = Number(m[2]);
  if (i >= INDUSTRIES.length) return;
  if (m[3] === undefined) {
    await tg("editMessageText", { chat_id: chatId, message_id: messageId, text: `🎨 ${industryLabel(INDUSTRIES[i][0])}\n\nQanday kayfiyat kerak?`, reply_markup: { inline_keyboard: moodKb(i) } });
    return;
  }
  const mood = MOODS[Number(m[3])];
  if (!mood) return;
  const n = Number(m[4] ?? 0);
  const [industry] = INDUSTRIES[i];
  let kits = await kitsFor(industry, mood[0], 40, false);
  if (kits.length === 0) kits = await kitsFor(industry, null, 40, false); // nothing in this mood yet: the kind of business as a whole
  if (kits.length === 0) {
    await sendMessage(chatId, `Bu soha uchun shablonlar hali tayyorlanmoqda. Saytda koʻring: ${siteLink(`/brend?soha=${industry}&kayfiyat=${mood[0]}`)}`);
    return;
  }
  const kit = kits[n % kits.length];
  const [heading, body] = await Promise.all([db.family.findUnique({ where: { slug: kit.headingSlug }, select: { name: true } }), db.family.findUnique({ where: { slug: kit.bodySlug }, select: { name: true } })]);
  const caption = [
    `🎨 <b>${esc(kit.name)}</b> · ${esc(industryLabel(kit.industry))}, ${esc(moodLabel(kit.mood))}`,
    kit.note ? esc(kit.note) : "",
    "",
    ROLES.map((r) => `${ROLE_LABEL[r]}: <code>${kit.kit[r].toUpperCase()}</code>`).join("\n"),
    "",
    `Sarlavha: <b>${esc(heading?.name ?? kit.headingSlug)}</b> · Matn: <b>${esc(body?.name ?? kit.bodySlug)}</b>`,
  ].filter((l, idx, a) => !(l === "" && a[idx - 1] === "")).join("\n");
  const kb: Keyboard = [
    [{ text: "🔄 Yana", callback_data: `k:${i}:${m[3]}:${(n + 1) % 1000}` }, { text: "🎭 Boshqa kayfiyat", callback_data: `k:${i}` }],
    [{ text: "🌐 Saytda: nom bilan, CSS bilan", url: siteLink(`/brend?soha=${industry}&kayfiyat=${kit.mood}`) }],
  ];
  await sendPhotoOrText(chatId, kitCardUrl(kit.id, "Brendingiz"), caption, kb);
}
