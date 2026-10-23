// The bot's "Shrift topish": send a picture of a line of text (and write the text as its caption, or
// answer when the bot asks) and get the closest fonts of ours, with the text set in them.
// The matching is lib/fontFinder (no AI); the picture is only read, never stored.
import { db } from "./db";
import { esc, downloadFile, sendMessage, sendPhotoOrText, siteLink, type Keyboard } from "./telegram";
import { menuMarkup, setAsk } from "./tgMenu";
import { FIND_TEXT_MAX, findFonts } from "./fontFinder";
import { cleanSampleText, sampleFonts, sampleImageUrl, uzbekize } from "./fontSamples";
import { hasProfanity } from "./profanity";
import { noteBot } from "./botStats";

export const FIND_ASK = "🔍 Rasmdagi matnni yozing";
const PENDING_MS = 30 * 60_000;

// A soft per-instance brake: each search reads every font.
const recent = new Map<string, { n: number; t: number }>();
function tooMany(chatId: string): boolean {
  const now = Date.now();
  const r = recent.get(chatId);
  if (!r || now - r.t > 60_000) {
    if (recent.size > 5000) recent.clear();
    recent.set(chatId, { n: 1, t: now });
    return false;
  }
  return ++r.n > 6;
}

export async function askFind(chatId: string): Promise<void> {
  await sendMessage(chatId, "🔍 <b>Shrift topish</b>\nShrifti qiziqtirgan yozuv rasmini yuboring (bitta qator matn, aniq va kesilgan boʻlsa yaxshi). Rasm izohiga rasmdagi matnni yozing, yozmasangiz keyin soʻrayman.\n\nAynan oʻsha shrift bizda boʻlmasa ham, eng oʻxshash bepul shriftlarni koʻrsataman.", [[{ text: "Saytda ham bor", url: siteLink("/shrift-topish", "bot") }]]);
}

/** A picture arrived: with a caption we search at once; without, we ask for the text. */
export async function handlePhoto(chatId: string, fileId: string, caption: string | undefined): Promise<void> {
  const text = uzbekize(cleanSampleText(caption ?? "")).slice(0, FIND_TEXT_MAX).trim();
  if (text.length >= 2) return runFind(chatId, fileId, text);
  await db.botFind.upsert({ where: { chatId }, create: { chatId, fileId }, update: { fileId, at: new Date() } });
  await setAsk(chatId, "find");
  await sendMessage(chatId, `${FIND_ASK} (2–${FIND_TEXT_MAX} belgi).\nMatnni shu yerga yozing: rasmda nima yozilgan boʻlsa, shuni.`, undefined, menuMarkup("Rasmdagi matn"));
}

/** The reply to the question above. */
export async function handleFindReply(chatId: string, raw: string): Promise<void> {
  const row = await db.botFind.findUnique({ where: { chatId } });
  if (!row || Date.now() - row.at.getTime() > PENDING_MS) {
    await sendMessage(chatId, "Rasm eskirgan. Uni qayta yuboring: /topish");
    return;
  }
  if ((await db.botFind.deleteMany({ where: { chatId, fileId: row.fileId } })).count === 0) return; // answered twice
  await runFind(chatId, row.fileId, uzbekize(cleanSampleText(raw)).slice(0, FIND_TEXT_MAX).trim());
}

const REASON = {
  text: `Rasmdagi matnni yozing (kamida 2 harf, ${FIND_TEXT_MAX} belgigacha).`,
  image: "Rasmni oʻqib boʻlmadi. PNG, JPG yoki WebP yuboring.",
  letters: "Rasmda bitta qator matn topilmadi. Faqat yozuvning oʻzini kesib, aniqroq rasm yuboring.",
} as const;

async function runFind(chatId: string, fileId: string, text: string): Promise<void> {
  void noteBot(chatId, "find");
  if (tooMany(chatId)) { await sendMessage(chatId, "Biroz sekinroq: bir daqiqada 6 tadan koʻp qidiruv boʻlmaydi."); return; }
  if (hasProfanity(text)) { await sendMessage(chatId, "Bunday soʻzlarni yozib boʻlmaydi. Rasmdagi matnni toʻgʻri yozing."); return; }
  const img = await downloadFile(fileId);
  if (!img) { await sendMessage(chatId, "Rasmni yuklab boʻlmadi. Uni qayta yuboring (6 MB gacha)."); return; }
  const r = await findFonts(img, text);
  if (!r.ok) { await sendMessage(chatId, REASON[r.reason]); return; }
  const top = r.fonts.slice(0, 5);
  const lines = top.map((f, i) => `${i + 1}. <b>${esc(f.name)}</b> · ${f.pct}%`);
  const caption = [
    "🔍 <b>Eng oʻxshash shriftlar</b>",
    ...lines,
    r.mode === "line" ? "\nHarflarni alohida ajratib boʻlmadi, butun yozuv solishtirildi: natija taxminiyroq." : "",
    "\nAynan oʻsha shrift bizda boʻlmasa ham, bular eng yaqinlari.",
  ].filter(Boolean).join("\n");
  const all = await sampleFonts();
  const picks = top.slice(0, 4).map((f) => all.find((x) => x.slug === f.slug)).filter((f): f is NonNullable<typeof f> => !!f);
  const draws = picks.length > 0 && picks.every((f) => [...text].every((c) => /\s/.test(c) || f.chars.includes(c)));
  const photo = picks.length ? sampleImageUrl(draws ? "text" : "names", draws ? text : "", picks.map((f) => f.slug)) : null;
  const kb: Keyboard = [];
  for (let i = 0; i < Math.min(4, top.length); i += 2) kb.push(top.slice(i, i + 2).map((f, j) => ({ text: `${i + j + 1}. ${f.name}`, url: siteLink(`/fonts/${f.slug}?t=${encodeURIComponent(text)}`, "bot") })));
  kb.push([{ text: "🔍 Yana rasm", callback_data: "h:f" }, { text: "Saytda ham", url: siteLink("/shrift-topish", "bot") }]);
  await sendPhotoOrText(chatId, photo, caption, kb);
}
