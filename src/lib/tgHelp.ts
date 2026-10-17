// The bot's /help menu: what it can do, with a button for each thing. The same buttons work in the
// chat after /start. Admins also see /stat.
import { absoluteImage, botUsername, esc, sendPhotoOrText, siteLink, tg, type Keyboard } from "./telegram";
import { sendMessage } from "./telegram";
import { db } from "./db";
import { getTgState } from "./tgState";
import { sendUzbekLetters } from "./tgSamples";
import { startAdFlow } from "./tgAdFlow";
import { noteBot } from "./botStats";
import { answer } from "./tgAdmin";
import { askBrand, askWallpaper } from "./tgPlay";

// The "/" list is empty on purpose: everything is in the buttons under the input field (and in /help).
// The commands themselves still work when typed. Only an admin's own chat lists /stat.
export const COMMANDS: { command: string; description: string }[] = [];


/** The "/" menu: for everyone, and for an admin's own chat with /stat added. */
export async function setBotCommands(adminChatId?: string): Promise<void> {
  if (!adminChatId) await tg("setMyCommands", { commands: COMMANDS });
  else await tg("setMyCommands", { commands: [{ command: "stat", description: "Bot statistikasi (admin)" }], scope: { type: "chat", chat_id: adminChatId } });
}

const DESCRIPTION =
  "Feekr: bepul shriftlar boti.\n\nMenga istalgan matn yozing: uni oʻzbek harflari (oʻ gʻ, ў қ ғ ҳ) bor shriftlarda rasm qilib qaytaraman. /test: qaysi shrift ekaningni bil. /fon: fon rasmi. /brend: brend nomi uchun shrift. Istalgan chatda @" + "BOT nomi: shriftni doʻstingizga yuboring.\n\nfeekrfont.uz";
const SHORT = "Matningizni bepul shriftlarda koʻring · feekrfont.uz";

/** What people see before they press Start, and in the bot's profile. */
export async function setBotProfile(): Promise<void> {
  await tg("setMyDescription", { description: DESCRIPTION.replace("@BOT", `@${botUsername()}`) });
  await tg("setMyShortDescription", { short_description: SHORT });
}

/** Telegram keeps a picture it has fetched for a URL; a new number here makes it fetch the new design. */
export const HELP_IMAGE_VERSION = 5;

/** The button menu under the input field: label → the command it stands for. */
export const MENU: [string, string][][] = [
  [["🎯 Viktorina", "/viktorina"], ["🎭 Qaysi shrift sen?", "/test"]],
  [["🖼 Fon rasmi", "/fon"], ["🏷 Brend nomi", "/brend"]],
  [["🏆 Reyting", "/reyting"], ["🔤 Harflar", "/harflar"]],
  [["📣 Reklama", "/reklama"], ["ℹ️ Yordam", "/help"]],
];
const MENU_TEXT = new Map(MENU.flat());
/** A tapped menu button arrives as its label: the command it means, or null. */
export const menuCommand = (text: string): string | null => MENU_TEXT.get(text.trim()) ?? null;

/** Send the button menu once to everybody (the keyboard then stays under the input field). */
export async function ensureMenu(chatId: string): Promise<void> {
  if (process.env.BOT_MENU === "off") return;
  const claimed = await db.botUser.updateMany({ where: { chatId, menuShown: false }, data: { menuShown: true } });
  if (claimed.count === 0) return;
  await sendMessage(chatId, "Menyu pastda 👇 Tugmalarni bosing yoki istalgan matnni yozing: uni shriftlarda koʻrsataman.", undefined, {
    reply_markup: { keyboard: MENU.map((row) => row.map(([label]) => ({ text: label }))), resize_keyboard: true, is_persistent: true, input_field_placeholder: "Matn yozing: shriftda koʻrsataman" },
  });
}

export async function sendHelp(chatId: string): Promise<void> {
  const { channel, admins } = await getTgState();
  const isAdmin = admins.some((a) => a.chatId === chatId);
  const lines = [
    "<b>Feekr bot nima qila oladi</b>",
    "",
    "✍️ <b>Matn namunasi.</b> Menga istalgan matn yozing (60 belgigacha): uni shriftlarimizda rasm qilib qaytaraman.",
    "🎯 <b>Kunlik viktorina.</b> /viktorina: bu qaysi shrift? Streak, ball va haftalik /reyting.",
    "🎭 <b>Qaysi shrift sen?</b> /test: 5 ta savol, shaxsiy shrifting va doʻstlarga yuboriladigan karta.",
    "🖼 <b>Fon rasmi.</b> /fon: istalgan matnni telefon fon rasmiga aylantiring.",
    "🏷 <b>Brend nomi.</b> /brend: nomingiz 4 xil shrift va rangda.",
    "🔤 <b>Oʻzbek harflari.</b> /harflar: oʻ gʻ ʼ va ў қ ғ ҳ qaysi shriftlarda bor.",
    `🔎 <b>Qidiruv.</b> Istalgan chatda <code>@${esc(botUsername())} nomi</code> deb yozing: shriftni doʻstingizga yuborasiz.`,
    "📣 <b>Reklama.</b> /reklama: Feekr kanali yoki saytida reklama berish uchun ariza.",
  ];
  if (isAdmin) lines.push("📊 <b>Admin.</b> /stat: bot foydalanuvchilari statistikasi.");
  const keyboard: Keyboard = [
    [{ text: "🎯 Kunlik viktorina", callback_data: "q:t" }, { text: "🎭 Qaysi shrift sen?", callback_data: "t:0:" }],
    [{ text: "🖼 Fon rasmi", callback_data: "h:w" }, { text: "🏷 Brend nomi", callback_data: "h:b" }],
    [{ text: "✍️ Matn namunasi", callback_data: "h:t" }, { text: "🔤 Oʻzbek harflari", callback_data: "h:l" }],
    [{ text: "📣 Reklama berish", callback_data: "h:r" }],
    [{ text: "Shriftlarni koʻrish", url: siteLink("/fonts", "bot") }],
  ];
  if (channel?.username) keyboard.push([{ text: "Kanalga oʻtish", url: `https://t.me/${channel.username}` }]);
  // The picture carries the look; the caption holds the words (and works as plain text if the picture fails).
  await sendPhotoOrText(chatId, absoluteImage(`/api/tg-image/help?v=${HELP_IMAGE_VERSION}`), lines.join("\n").slice(0, 1000), keyboard);
}

type HelpCallback = { id: string; from: { id: number; first_name?: string; username?: string; is_bot?: boolean }; data?: string; message?: { chat: { id: number } } };

/** The help menu buttons: h:t (how to try text), h:l (Uzbek letters), h:r (advertising). */
export async function handleHelpCallback(q: HelpCallback): Promise<void> {
  await answer(q.id, "");
  const chatId = String(q.message?.chat.id ?? q.from.id);
  void noteBot(chatId, "menu");
  if (q.data === "h:t") {
    await sendMessage(chatId, "Menga istalgan matnni yozing, masalan brend nomi yoki ibora. Uni shriftlarimizda koʻrsataman.");
  } else if (q.data === "h:l") {
    await sendUzbekLetters(chatId);
  } else if (q.data === "h:w") {
    await askWallpaper(chatId);
  } else if (q.data === "h:b") {
    await askBrand(chatId);
  } else if (q.data === "h:r") {
    await startAdFlow(q.from as Parameters<typeof startAdFlow>[0]);
  }
}
