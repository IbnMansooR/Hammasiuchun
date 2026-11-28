// The button menu under the input field, and "what is the next plain text the answer to".
// Kept free of other bot code so any message builder can attach the menu without import cycles.
import { db } from "./db";

/** The button menu under the input field: label → the command it stands for. */
export const MENU: [string, string][][] = [
  [["🎯 Viktorina", "/viktorina"], ["🎭 Qaysi shrift sen?", "/test"]],
  [["🖼 Fon rasmi", "/fon"], ["🏷 Brend nomi", "/brend"]],
  [["🏆 Reyting", "/reyting"], ["🔤 Harflar", "/harflar"]],
  [["🔍 Shrift topish", "/topish"], ["📣 Reklama", "/reklama"]],
  [["🎨 Brend palitrasi", "/palitra"], ["ℹ️ Yordam", "/help"]],
];
const MENU_TEXT = new Map(MENU.flat());
/** A tapped menu button arrives as its label: the command it means, or null. */
export const menuCommand = (text: string): string | null => MENU_TEXT.get(text.trim()) ?? null;

/** The keyboard under the input field. Every message that carries it puts it back, so it can't stay lost. */
export const menuMarkup = (placeholder = "Matn yozing: shriftda koʻrsataman") => ({
  reply_markup: { keyboard: MENU.map((row) => row.map(([label]) => ({ text: label }))), resize_keyboard: true, is_persistent: true, input_field_placeholder: placeholder },
});

export type Ask = "wall" | "brand" | "find";
const ASK_TTL_MS = 15 * 60 * 1000;
/** The next plain text from this chat is the answer to a question we asked (no need to "reply" to it). */
export async function setAsk(chatId: string, ask: Ask): Promise<void> {
  await db.botUser.updateMany({ where: { chatId }, data: { ask, askAt: new Date() } });
}
export async function clearAsk(chatId: string): Promise<void> {
  await db.botUser.updateMany({ where: { chatId, ask: { not: null } }, data: { ask: null, askAt: null } });
}
/** What the text is the answer to (once): null when nothing was asked or it is too old. */
export async function takeAsk(chatId: string): Promise<Ask | null> {
  const row = await db.botUser.findUnique({ where: { chatId }, select: { ask: true, askAt: true } });
  if (!row?.ask || !row.askAt || Date.now() - row.askAt.getTime() > ASK_TTL_MS) return null;
  const got = await db.botUser.updateMany({ where: { chatId, ask: row.ask }, data: { ask: null, askAt: null } });
  return got.count ? (row.ask as Ask) : null;
}

