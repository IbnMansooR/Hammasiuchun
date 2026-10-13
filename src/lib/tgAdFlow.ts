// /reklama in the bot: a short conversation (what, where, when, contact) that ends in the same
// enquiry the /reklama form sends (lib/adSales), forwarded to the admins. The answers so far are
// kept in a Setting row per chat for 30 minutes.
import { db } from "./db";
import { AD_PLACE_LABEL, AD_PLACES, createAdRequest, firstLink, getAdOffer, getAudience, type AdPlace } from "./adSales";
import { esc, sendMessage, siteLink, tg, type Keyboard } from "./telegram";
import { formatNumber } from "./format";

type Step = "what" | "place" | "timing" | "contact" | "confirm";
type Flow = { step: Step; what?: string; place?: AdPlace; timing?: string | null; contact?: string; at: number };
type From = { id: number; first_name?: string; last_name?: string; username?: string };

const TTL = 30 * 60 * 1000;
const PER_DAY = 3;
const key = (chatId: string) => `adflow:${chatId}`;

async function getFlow(chatId: string): Promise<Flow | null> {
  const row = await db.setting.findUnique({ where: { key: key(chatId) } }).catch(() => null);
  if (!row) return null;
  try {
    const f = JSON.parse(row.value) as Flow;
    return Date.now() - f.at < TTL ? f : null;
  } catch {
    return null;
  }
}
async function setFlow(chatId: string, f: Flow) {
  const value = JSON.stringify({ ...f, at: Date.now() });
  await db.setting.upsert({ where: { key: key(chatId) }, update: { value }, create: { key: key(chatId), value } });
}
const endFlow = (chatId: string) => db.setting.deleteMany({ where: { key: key(chatId) } });

/** True while this chat is in the middle of an enquiry (its plain text belongs to the flow). */
export const inAdFlow = async (chatId: string) => !!(await getFlow(chatId));

const CANCEL: Keyboard = [[{ text: "❌ Bekor qilish", callback_data: "ad:f:c" }]];
const NO_KEYBOARD = { reply_markup: { remove_keyboard: true } };

export async function startAdFlow(from: From): Promise<void> {
  const chatId = String(from.id);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if ((await db.adRequest.count({ where: { tgChatId: chatId, createdAt: { gte: since } } })) >= PER_DAY) {
    await sendMessage(chatId, "Bugun bir nechta ariza yubordingiz, admin ularni koʻrib chiqadi. Ertaga yana yozishingiz mumkin.");
    return;
  }
  const [aud, offer] = await Promise.all([getAudience().catch(() => null), getAdOffer()]);
  const facts = [
    aud?.subscribers ? `📢 Kanal: ${aud.channel ? `@${esc(aud.channel)}` : "Telegram"} — ${formatNumber(aud.subscribers)} obunachi` : null,
    aud?.visits ? `🌐 Sayt: oxirgi 30 kunda ${formatNumber(aud.visits)} tashrif, ${formatNumber(aud.views)} sahifa koʻrish` : null,
    offer.channelPrice ? `Kanalda post: ${esc(offer.channelPrice)}` : null,
    offer.sitePrice ? `Saytda banner: ${esc(offer.sitePrice)}` : null,
  ].filter(Boolean);
  await setFlow(chatId, { step: "what", at: Date.now() });
  await sendMessage(
    chatId,
    [
      "📣 <b>Feekr’da reklama</b>",
      ...(facts.length ? ["", ...facts] : []),
      "",
      "4 ta qisqa savol, keyin arizangiz adminga boradi.",
      "",
      "<b>1/4.</b> Nimani reklama qilmoqchisiz? Brend yoki mahsulot nomi va qisqacha tavsif. Havolasi boʻlsa, shu yerga qoʻshing.",
    ].join("\n"),
    [[{ text: "Batafsil: narxlar va shartlar", url: siteLink("/reklama") }], ...CANCEL],
  );
}

const placeKeyboard: Keyboard = [
  [{ text: AD_PLACE_LABEL.channel, callback_data: "ad:f:p:channel" }, { text: AD_PLACE_LABEL.site, callback_data: "ad:f:p:site" }],
  [{ text: AD_PLACE_LABEL.both, callback_data: "ad:f:p:both" }, { text: AD_PLACE_LABEL.unsure, callback_data: "ad:f:p:unsure" }],
  ...CANCEL,
];

async function askContact(chatId: string, from: From) {
  const rows: Keyboard = [];
  if (from.username) rows.push([{ text: `Telegramda yozing (@${from.username})`, callback_data: "ad:f:u" }]);
  await sendMessage(chatId, "<b>4/4.</b> Siz bilan qanday bogʻlanaylik? Telefon raqamingizni yozing yoki pastdagi tugmani bosing.", [...rows, ...CANCEL]);
  await sendMessage(chatId, "📱 Raqamni bir bosishda yuborish mumkin:", undefined, {
    reply_markup: { keyboard: [[{ text: "📱 Raqamimni yuborish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
  });
}

async function confirm(chatId: string, f: Flow) {
  await sendMessage(
    chatId,
    [
      "Tekshiring:",
      "",
      `<b>Nima:</b> ${esc(f.what ?? "")}`,
      `<b>Qayerda:</b> ${esc(AD_PLACE_LABEL[f.place ?? "unsure"])}`,
      `<b>Muddat / byudjet:</b> ${esc(f.timing || "—")}`,
      `<b>Aloqa:</b> ${esc(f.contact ?? "")}`,
    ].join("\n"),
    [[{ text: "✅ Yuborish", callback_data: "ad:f:ok" }], [{ text: "✏️ Qaytadan", callback_data: "ad:f:r" }, { text: "❌ Bekor qilish", callback_data: "ad:f:c" }]],
  );
}

/** A plain message (or a shared contact) while the flow is open. */
export async function handleAdFlowMessage(from: From, text: string, phone?: string | null): Promise<void> {
  const chatId = String(from.id);
  const f = await getFlow(chatId);
  if (!f) return;
  const t = text.trim();
  if (f.step === "what") {
    if (t.length < 3) { await sendMessage(chatId, "Biroz batafsilroq yozing: nimani reklama qilmoqchisiz?", CANCEL); return; }
    await setFlow(chatId, { ...f, step: "place", what: t.slice(0, 1000) });
    await sendMessage(chatId, "<b>2/4.</b> Reklama qayerda chiqsin?", placeKeyboard);
    return;
  }
  if (f.step === "place") { await sendMessage(chatId, "Pastdagi tugmalardan birini tanlang.", placeKeyboard); return; }
  if (f.step === "timing") {
    await setFlow(chatId, { ...f, step: "contact", timing: t.slice(0, 300) || null });
    await askContact(chatId, from);
    return;
  }
  if (f.step === "contact") {
    const contact = phone ? `+${phone.replace(/[^\d]/g, "")}` : t;
    if (contact.replace(/[^\d@A-Za-z]/g, "").length < 5) { await sendMessage(chatId, "Telefon raqam yoki @username yozing.", CANCEL); return; }
    const next = { ...f, step: "confirm" as const, contact: contact.slice(0, 120) };
    await setFlow(chatId, next);
    // A message can carry one keyboard: this one takes the phone button away, the next has the inline buttons.
    await sendMessage(chatId, "Aloqa qabul qilindi ✓", undefined, NO_KEYBOARD);
    await confirm(chatId, next);
    return;
  }
  await sendMessage(chatId, "Pastdagi “✅ Yuborish” tugmasini bosing yoki bekor qiling.");
}

type Cb = { id: string; from: From; data?: string; message?: { message_id: number; chat: { id: number; type: string } } };
const answer = (id: string, text = "") => tg("answerCallbackQuery", { callback_query_id: id, text });

export async function handleAdFlowCallback(q: Cb): Promise<void> {
  const chatId = String(q.from.id);
  const data = q.data ?? "";
  if (q.message?.chat.type !== "private") { await answer(q.id); return; }
  const f = await getFlow(chatId);
  if (data === "ad:f:c") {
    await endFlow(chatId);
    await answer(q.id, "Bekor qilindi");
    await sendMessage(chatId, "Bekor qilindi. Istalgan payt /reklama deb yozing.", undefined, NO_KEYBOARD);
    return;
  }
  if (data === "ad:f:r") {
    await answer(q.id);
    await startAdFlow(q.from);
    return;
  }
  if (!f) {
    await answer(q.id, "Bu suhbat eskirgan. /reklama deb qayta boshlang.");
    return;
  }
  const p = /^ad:f:p:(\w+)$/.exec(data)?.[1];
  if (p && f.step === "place" && (AD_PLACES as readonly string[]).includes(p)) {
    await answer(q.id, AD_PLACE_LABEL[p as AdPlace]);
    await setFlow(chatId, { ...f, step: "timing", place: p as AdPlace });
    await sendMessage(chatId, "<b>3/4.</b> Qachon va qancha muddatga? Byudjetingiz boʻlsa, uni ham yozing.", [[{ text: "Oʻtkazib yuborish", callback_data: "ad:f:s" }], ...CANCEL]);
    return;
  }
  if (data === "ad:f:s" && f.step === "timing") {
    await answer(q.id);
    await setFlow(chatId, { ...f, step: "contact", timing: null });
    await askContact(chatId, q.from);
    return;
  }
  if (data === "ad:f:u" && f.step === "contact" && q.from.username) {
    await answer(q.id);
    const next = { ...f, step: "confirm" as const, contact: `@${q.from.username}` };
    await setFlow(chatId, next);
    await sendMessage(chatId, "Aloqa qabul qilindi ✓", undefined, NO_KEYBOARD);
    await confirm(chatId, next);
    return;
  }
  if (data === "ad:f:ok" && f.step === "confirm") {
    // Whoever deletes the conversation sends it: a double press makes one enquiry.
    if (!(await endFlow(chatId)).count) { await answer(q.id); return; }
    await answer(q.id, "Yuborildi");
    const name = [q.from.first_name, q.from.last_name].filter(Boolean).join(" ") || (q.from.username ? `@${q.from.username}` : "Telegram");
    const id = await createAdRequest({
      source: "bot", name, contact: f.contact ?? "", what: f.what ?? "", placements: f.place ?? "unsure",
      timing: f.timing ?? null, link: firstLink(f.what ?? ""), tgChatId: chatId, tgUsername: q.from.username ?? null,
    });
    await sendMessage(chatId, `✅ Arizangiz yuborildi (#${id}). Admin koʻrib chiqib, siz bilan bogʻlanadi. Javob shu yerga ham keladi.`);
    return;
  }
  await answer(q.id);
}
