// Bot: a person sends any text, the bot answers with that text set in the fonts that can draw every
// letter of it (Uzbek ʻ ʼ and ғ қ ҳ ў included), four at a time, with links to each font.
import { esc, sendMessage, sendPhotoOrText, siteLink, tg, type Keyboard } from "./telegram";
import { PER_PAGE, cleanSampleText, matchFonts, sampleFonts, sampleImageUrl, uzbekize, type Match } from "./fontSamples";

// A soft per-instance brake against someone flooding the bot (each sample renders a picture).
const recent = new Map<string, { n: number; t: number }>();
function tooMany(chatId: string): boolean {
  const now = Date.now();
  const r = recent.get(chatId);
  if (!r || now - r.t > 60_000) {
    if (recent.size > 5000) recent.clear();
    recent.set(chatId, { n: 1, t: now });
    return false;
  }
  return ++r.n > 12;
}

const UZ_LAT = /[ʻʼ]/;
const UZ_CYR = /[ЎўҚқҒғҲҳ]/;

function caption(text: string, offset: number, m: Match, fixed: boolean): string {
  const lines = [`«${esc(text)}»`, `${offset + 1}–${offset + m.fonts.length} / ${m.total} ta mos shrift`];
  if (UZ_LAT.test(text)) lines.push("ʻ va ʼ belgilari bor shriftlar tanlandi.");
  if (UZ_CYR.test(text)) lines.push("Kirill oʻzbek harflari (ў қ ғ ҳ) bor shriftlar tanlandi.");
  if (fixed) lines.push("Belgilar oʻzbekcha yozuvga keltirildi: o' → oʻ, g' → gʻ.");
  return lines.join("\n");
}

function keyboard(text: string, offset: number, m: Match): Keyboard {
  const fontButtons = m.fonts.map((f, i) => ({ text: `${offset + i + 1}. ${f.name}`, url: siteLink(`/fonts/${f.slug}?t=${encodeURIComponent(text)}`, "bot") }));
  const rows: Keyboard = [];
  for (let i = 0; i < fontButtons.length; i += 2) rows.push(fontButtons.slice(i, i + 2));
  const nav = [];
  if (offset > 0) nav.push({ text: "⟵ Oldingi", callback_data: `s:${Math.max(0, offset - PER_PAGE)}` });
  if (offset + PER_PAGE < m.total) nav.push({ text: "Keyingi ⟶", callback_data: `s:${offset + PER_PAGE}` });
  if (nav.length) rows.push(nav);
  rows.push([{ text: "Barcha shriftlar", url: siteLink("/fonts", "bot") }]);
  return rows;
}

async function show(chatId: string, text: string, offset: number, fixed: boolean, editMessageId?: number) {
  const m = await matchFonts(text, offset);
  if (m.total === 0 || m.fonts.length === 0) {
    const why = m.missing.length
      ? `Bu belgilar shriftlarimizda yoʻq: ${m.missing.slice(0, 12).map(esc).join(" ")}\nUlarsiz qayta yozib koʻring.`
      : "Bu matndagi hamma harflarni chiza oladigan shrift topilmadi. Boshqa matn yozib koʻring.";
    await sendMessage(chatId, why);
    return;
  }
  const html = caption(text, offset, m, fixed);
  const kb = keyboard(text, offset, m);
  const photo = sampleImageUrl("text", text, m.fonts.map((f) => f.slug));
  if (editMessageId) {
    const r = await tg("editMessageMedia", {
      chat_id: chatId,
      message_id: editMessageId,
      media: { type: "photo", media: photo, caption: html, parse_mode: "HTML" },
      reply_markup: { inline_keyboard: kb },
    });
    if (r.ok) return;
  }
  await sendPhotoOrText(chatId, photo, html, kb);
}

/** Any plain text a person sends the bot in private. */
export async function sendSample(chatId: string, raw: string): Promise<void> {
  if (tooMany(chatId)) {
    await sendMessage(chatId, "Biroz sekinroq: bir daqiqada 12 tadan koʻp namuna boʻlmaydi.");
    return;
  }
  const typed = cleanSampleText(raw);
  if (!typed) return;
  const text = uzbekize(typed);
  await tg("sendChatAction", { chat_id: chatId, action: "upload_photo" });
  await show(chatId, text, 0, text !== typed);
}

type SampleCallback = { id: string; from: { id: number }; data?: string; message?: { message_id: number; chat: { id: number; type: string }; caption?: string } };

/** "⟵ Oldingi" / "Keyingi ⟶": the text travels in the photo's caption, so nothing is stored. */
export async function handleSampleCallback(q: SampleCallback): Promise<void> {
  const offset = Number(/^s:(\d{1,3})$/.exec(q.data ?? "")?.[1] ?? NaN);
  const text = /^«(.+)»$/m.exec(q.message?.caption ?? "")?.[1];
  if (!q.message || !Number.isInteger(offset) || !text) {
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: "Matnni qaytadan yuboring." });
    return;
  }
  await tg("answerCallbackQuery", { callback_query_id: q.id });
  if (tooMany(String(q.message.chat.id))) return;
  await show(String(q.message.chat.id), text, offset, false, q.message.message_id);
}

/** /harflar: why Uzbek letters matter and how many of our fonts have them. */
export async function sendUzbekLetters(chatId: string): Promise<void> {
  const all = await sampleFonts();
  const lat = all.filter((f) => f.chars.includes("ʻ") && f.chars.includes("ʼ"));
  const cyr = all.filter((f) => [..."ЎўҚқҒғҲҳ"].every((c) => f.chars.includes(c)));
  const names = (list: typeof all) => (list.length ? `: ${list.slice(0, 5).map((f) => esc(f.name)).join(", ")}${list.length > 5 ? " va boshqalar" : ""}` : "");
  const html = [
    "<b>Oʻzbek harflari</b>",
    "",
    "Lotin yozuvida <b>oʻ</b> va <b>gʻ</b> uchun ʻ belgisi, tutuq belgisi uchun ʼ ishlatiladi. Koʻp shriftlarda ular yoʻq, shunda dizaynda ‘ yoki ' chiqib qoladi.",
    "",
    `✦ ʻ va ʼ bor: <b>${lat.length}</b> ta shrift${names(lat)}`,
    `✦ Kirill ў қ ғ ҳ bor: <b>${cyr.length}</b> ta shrift${names(cyr)}`,
    "",
    "Istalgan matn yozing: uni shu harflarni toʻliq chiza oladigan shriftlarda koʻrsataman.",
  ].join("\n");
  await sendMessage(chatId, html, [[{ text: "Shriftlarni koʻrish", url: siteLink("/fonts", "bot") }]]);
}
