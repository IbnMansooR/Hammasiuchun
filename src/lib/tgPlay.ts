// The bot's playful features, made to be shared:
//   /test   "Qaysi shrift sensan?": five questions, then a story card with the person's name in their font
//   /fon    a phone wallpaper with any short text (⟵ ⟶ other fonts, 🎨 other colours)
//   /brend  four wordmarks for a brand name, in different fonts and colours
// Nothing is stored: the questions travel in the buttons, the text travels in the caption.
import { db } from "./db";
import { esc, sendAlbum, sendMessage, sendPhotoOrText, siteLink, tg, botUsername, type Keyboard } from "./telegram";
import { cleanSampleText, sampleFonts, uzbekize, type SampleFont } from "./fontSamples";
import { CARD_TEXT_MAX, PALETTE_COUNT, TYPES, cardUrl, isType, type TypeCode } from "./playCards";
import { hasProfanity } from "./profanity";
import { answer } from "./tgAdmin";

export const WALL_ASK = "🖼 Fon rasmi uchun matn yozing (3–40 belgi).";
export const BRAND_ASK = "🏷 Brend nomini yozing (2–24 belgi).";
const REFUSED = "Bunday soʻzlarni yozib boʻlmaydi. Iltimos, boshqa matn yozing.";

// A soft per-instance brake: each picture is drawn on request.
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

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ---------------- the test ---------------- */

const QUESTIONS: { q: string; a: [TypeCode, string][] }[] = [
  { q: "Dushanba ertalab uyghondingiz. Birinchi nima qilasiz?", a: [["K", "☕ Choy damlab, sekin boshlayman"], ["Z", "📱 Kun rejasini tuzaman"], ["J", "🎧 Musiqani baland qoʻyaman"], ["R", "🛏 Yana 5 daqiqa… va yana 5"]] },
  { q: "Telefoningizning fon rasmi qanaqa?", a: [["K", "Eski rasm yoki muqova"], ["Z", "Toza, bir rangli"], ["J", "Yorqin, koʻzni oladigan"], ["R", "Tabiat yoki oʻzim chizgan"]] },
  { q: "Doʻstlar davrasida siz…", a: [["K", "Jim, lekin hammasini kuzataman"], ["Z", "Rejani siz tuzasiz"], ["J", "Davraning markazidasiz"], ["R", "Hammani kuldirib, hikoya aytasiz"]] },
  { q: "Eng yoqqan kiyimingiz?", a: [["K", "Palto va klassik poyabzal"], ["Z", "Oq krossovka, oddiy futbolka"], ["J", "Katta, yorqin, bezakli"], ["R", "Qulay, vintaj narsalar"]] },
  { q: "Hayotdagi shioringiz?", a: [["K", "Sabr — oltin"], ["Z", "Kamroq, lekin yaxshiroq"], ["J", "“Yoʻq” degan soʻz yoʻq!"], ["R", "Bir kun hammasi joyiga tushadi"]] },
];

const cleanName = (raw: string | undefined): string => {
  const s = uzbekize((raw ?? "").replace(/[^\p{L}ʻʼ' ]/gu, "").replace(/\s+/g, " ").trim()).slice(0, 16).trim();
  return s.length >= 2 && !hasProfanity(s) ? s : "";
};

async function pickFont(type: TypeCode, name: string, seed: number): Promise<SampleFont | null> {
  const all = await sampleFonts();
  const need = [...new Set([...name].filter((c) => !/\s/.test(c)))];
  const can = all.filter((f) => need.every((c) => f.chars.includes(c)));
  if (can.length === 0) return null;
  const rows = await db.family.findMany({ where: { slug: { in: can.map((f) => f.slug) }, category: { in: [...TYPES[type].categories] } }, select: { slug: true } });
  const ok = new Set(rows.map((r) => r.slug));
  const pool = can.filter((f) => ok.has(f.slug)).slice(0, 25); // most downloaded first
  const list = pool.length ? pool : can.slice(0, 25);
  return list[seed % list.length];
}

function questionKeyboard(i: number, acc: string): Keyboard {
  return QUESTIONS[i].a.map(([code, label]) => [{ text: label, callback_data: `t:${i + 1}:${acc}${code}` }]);
}
const questionText = (i: number) => `<b>${i + 1}/${QUESTIONS.length}.</b> ${esc(QUESTIONS[i].q)}`;

export async function startTest(chatId: string): Promise<void> {
  await sendMessage(chatId, `🎭 <b>Qaysi shrift sensan?</b>\n5 ta savol, javobga qarab shaxsiy shrifting chiqadi.\n\n${questionText(0)}`, questionKeyboard(0, ""));
}

type PlayCb = { id: string; from: { id: number; first_name?: string; username?: string; is_bot?: boolean }; data?: string; message?: { message_id: number; chat: { id: number; type: string }; caption?: string; text?: string } };

async function showResult(q: PlayCb, acc: string): Promise<void> {
  const chatId = String(q.message?.chat.id ?? q.from.id);
  if (tooMany(chatId)) return;
  const tally: Record<string, number> = {};
  for (const c of acc) tally[c] = (tally[c] ?? 0) + 1;
  const seed = hash(`${q.from.id}:${acc}`);
  // The top answer wins; a tie is settled by the seed (the same answers always give the same font).
  const top = Math.max(...Object.values(tally));
  const tied = (Object.keys(tally) as string[]).filter((c) => tally[c] === top && isType(c)).sort();
  const type = tied[seed % tied.length] as TypeCode;
  let name = cleanName(q.from.first_name);
  let font = name ? await pickFont(type, name, seed) : null;
  if (!font) { name = "Sen"; font = await pickFont(type, name, seed); }
  if (!font) { await sendMessage(chatId, "Hozircha natija chiqarib boʻlmadi. Birozdan keyin qayta urinib koʻring."); return; }
  const t = TYPES[type];
  const share = `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${botUsername()}`)}&text=${encodeURIComponent(`Men ${font.name} ekanman! Sen qaysi shriftsan?`)}`;
  const kb: Keyboard = [
    [{ text: "📤 Doʻstingga yubor", url: share }],
    [{ text: "🖼 Fon rasmi qilish", callback_data: "h:w" }, { text: "🔁 Qayta", callback_data: "t:0:" }],
    [{ text: `${font.name}ni koʻrish`, url: siteLink(`/fonts/${font.slug}`, "bot") }],
  ];
  await sendPhotoOrText(chatId, cardUrl("test", name, font.slug, type), `🎭 <b>Sen — ${t.label}</b>\nShrifting: <b>${esc(font.name)}</b>\n${esc(t.line)}\n\nStoriesga qoʻy, doʻstlaring ham sinab koʻrsin 👇`, kb);
}

/** t:<next question>:<answers so far> */
export async function handleTestCallback(q: PlayCb): Promise<void> {
  const m = /^t:([0-5]):([KZJR]{0,5})$/.exec(q.data ?? "");
  if (!m || !q.message) { await answer(q.id, ""); return; }
  const i = Number(m[1]);
  const acc = m[2];
  if (acc.length !== i) { await answer(q.id, "Bu savol eskirgan. /test deb qayta boshlang."); return; }
  await answer(q.id, "");
  const chatId = String(q.message.chat.id);
  if (i === QUESTIONS.length) { await showResult(q, acc); return; }
  const r = await tg("editMessageText", { chat_id: chatId, message_id: q.message.message_id, text: questionText(i), parse_mode: "HTML", reply_markup: { inline_keyboard: questionKeyboard(i, acc) } });
  if (!r.ok) await sendMessage(chatId, questionText(i), questionKeyboard(i, acc));
}

/* ---------------- wallpaper ---------------- */

const forceReply = (placeholder: string) => ({ reply_markup: { force_reply: true, input_field_placeholder: placeholder } });

export async function askWallpaper(chatId: string): Promise<void> {
  await sendMessage(chatId, `${WALL_ASK}\nShu xabarga javob (reply) qilib yozing: masalan “Bugun mening kunim”.`, undefined, forceReply("Fon uchun matn"));
}
export async function askBrand(chatId: string): Promise<void> {
  await sendMessage(chatId, `${BRAND_ASK}\nShu xabarga javob (reply) qilib yozing: masalan “Nur Cafe”.`, undefined, forceReply("Brend nomi"));
}

async function fontsFor(text: string): Promise<SampleFont[]> {
  const need = [...new Set([...text].filter((c) => !/\s/.test(c)))];
  return (await sampleFonts()).filter((f) => need.every((c) => f.chars.includes(c))).slice(0, 500);
}

const wallKeyboard = (i: number, p: number): Keyboard => [
  [{ text: "⟵ Shrift", callback_data: `f:${i - 1}:${p}` }, { text: "Shrift ⟶", callback_data: `f:${i + 1}:${p}` }],
  [{ text: "🎨 Boshqa rang", callback_data: `f:${i}:${(p + 1) % PALETTE_COUNT}` }, { text: "📤 Doʻstingga", url: `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${botUsername()}`)}` }],
];

async function wallCard(text: string, i0: number, p: number) {
  const fonts = await fontsFor(text);
  if (fonts.length === 0) return null;
  const i = ((i0 % fonts.length) + fonts.length) % fonts.length;
  return { photo: cardUrl("wall", text, fonts[i].slug, String(p)), caption: `«${esc(text)}»\n${i + 1} / ${fonts.length} · ${esc(fonts[i].name)}`, i, p };
}

/** The reply to the /fon question. */
export async function makeWallpaper(chatId: string, raw: string): Promise<void> {
  if (tooMany(chatId)) { await sendMessage(chatId, "Biroz sekinroq: bir daqiqada 20 tadan koʻp rasm boʻlmaydi."); return; }
  const text = uzbekize(cleanSampleText(raw)).slice(0, 40).trim();
  if (text.length < 3) { await sendMessage(chatId, "Matn juda qisqa. Kamida 3 belgi yozing: /fon"); return; }
  if (hasProfanity(text)) { await sendMessage(chatId, REFUSED); return; }
  const card = await wallCard(text, hash(text) % 7, 0);
  if (!card) { await sendMessage(chatId, "Bu matndagi hamma harflarni chiza oladigan shrift topilmadi. Boshqa matn yozib koʻring."); return; }
  await sendPhotoOrText(chatId, card.photo, card.caption, wallKeyboard(card.i, card.p));
}

/** f:<font index>:<colour> — the text is in the caption. */
export async function handleWallCallback(q: PlayCb): Promise<void> {
  const m = /^f:(-?\d{1,3}):(\d{1,2})$/.exec(q.data ?? "");
  const text = /^«(.+)»$/m.exec(q.message?.caption ?? "")?.[1];
  if (!m || !q.message || !text) { await answer(q.id, "Matnni qaytadan yuboring: /fon"); return; }
  await answer(q.id, "");
  const chatId = String(q.message.chat.id);
  if (tooMany(chatId)) return;
  const card = await wallCard(text, Number(m[1]), Number(m[2]) % PALETTE_COUNT);
  if (!card) return;
  await tg("editMessageMedia", { chat_id: chatId, message_id: q.message.message_id, media: { type: "photo", media: card.photo, caption: card.caption, parse_mode: "HTML" }, reply_markup: { inline_keyboard: wallKeyboard(card.i, card.p) } });
}

/* ---------------- brand name ---------------- */

async function brandAlbum(chatId: string, name: string, round: number): Promise<void> {
  const fonts = await fontsFor(name);
  if (fonts.length === 0) { await sendMessage(chatId, "Bu nomdagi hamma harflarni chiza oladigan shrift topilmadi. Boshqa nom yozib koʻring."); return; }
  const stride = Math.max(1, Math.floor(fonts.length / 4));
  const picks = Array.from({ length: Math.min(4, fonts.length) }, (_, j) => fonts[(hash(name) + round * 7 + j * stride) % fonts.length]);
  const urls = picks.map((f, j) => cardUrl("brand", name, f.slug, String((hash(name) + round + j * 3) % PALETTE_COUNT)));
  const list = picks.map((f, j) => `${j + 1}. ${esc(f.name)}`).join("  ·  ");
  const r = await sendAlbum(chatId, urls, `«${esc(name)}»\n${list}`);
  if (!r.ok) { await sendMessage(chatId, "Rasmlarni yuborib boʻlmadi. Birozdan keyin qayta urinib koʻring."); return; }
  await sendMessage(chatId, `«${esc(name)}»: yoqqanini saqlang. Yana variant kerakmi?`, [[{ text: "🔄 Yana 4 ta", callback_data: `b:${round + 1}` }, { text: "🖼 Fon rasmi qilish", callback_data: "h:w" }]]);
}

export async function makeBrand(chatId: string, raw: string): Promise<void> {
  if (tooMany(chatId)) { await sendMessage(chatId, "Biroz sekinroq: bir daqiqada 20 tadan koʻp rasm boʻlmaydi."); return; }
  const name = uzbekize(cleanSampleText(raw)).slice(0, 24).trim();
  if (name.length < 2) { await sendMessage(chatId, "Nom juda qisqa. Kamida 2 belgi yozing: /brend"); return; }
  if (hasProfanity(name)) { await sendMessage(chatId, REFUSED); return; }
  await tg("sendChatAction", { chat_id: chatId, action: "upload_photo" });
  await brandAlbum(chatId, name, 0);
}

/** b:<round> — the name is in the message text. */
export async function handleBrandCallback(q: PlayCb): Promise<void> {
  const m = /^b:(\d{1,3})$/.exec(q.data ?? "");
  const name = /«(.+?)»/.exec(q.message?.text ?? "")?.[1];
  if (!m || !q.message || !name) { await answer(q.id, "Nomni qaytadan yuboring: /brend"); return; }
  await answer(q.id, "");
  const chatId = String(q.message.chat.id);
  if (tooMany(chatId)) return;
  await tg("sendChatAction", { chat_id: chatId, action: "upload_photo" });
  await brandAlbum(chatId, name, Number(m[1]));
}

export const isPlayReply = (replyText: string | undefined): "wall" | "brand" | null =>
  replyText?.startsWith("🖼 Fon rasmi uchun") ? "wall" : replyText?.startsWith("🏷 Brend nomini") ? "brand" : null;

export const CARD_LIMIT = CARD_TEXT_MAX;
