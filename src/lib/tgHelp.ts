// The bot's /help menu: what it can do, with a button for each thing. The same buttons work in the
// chat after /start. Admins also see /stat.
import { absoluteImage, botUsername, esc, sendPhotoOrText, siteLink, tg, type Keyboard } from "./telegram";
import { sendMessage } from "./telegram";
import { getTgState } from "./tgState";
import { sendUzbekLetters } from "./tgSamples";
import { startAdFlow } from "./tgAdFlow";
import { noteBot } from "./botStats";
import { answer } from "./tgAdmin";

export const COMMANDS = [
  { command: "start", description: "Boshlash / xabarlarni yoqish" },
  { command: "help", description: "Bot nima qila oladi (menyu)" },
  { command: "harflar", description: "Oʻzbek harflari qaysi shriftlarda bor" },
  { command: "reklama", description: "Reklama berish (ariza)" },
  { command: "stop", description: "Telegram xabarlarini oʻchirish" },
];

/** The "/" menu: for everyone, and for an admin's own chat with /stat added. */
export async function setBotCommands(adminChatId?: string): Promise<void> {
  if (!adminChatId) await tg("setMyCommands", { commands: COMMANDS });
  else await tg("setMyCommands", { commands: [...COMMANDS, { command: "stat", description: "Bot statistikasi (admin)" }], scope: { type: "chat", chat_id: adminChatId } });
}

const DESCRIPTION =
  "Feekr: bepul shriftlar boti.\n\nMenga istalgan matn yozing: uni oʻzbek harflari (oʻ gʻ, ў қ ғ ҳ) bor shriftlarda rasm qilib qaytaraman. /harflar: qaysi shriftlarda oʻzbek harflari bor. Istalgan chatda @" + "BOT nomi: shriftni doʻstingizga yuboring.\n\nfeekrfont.uz";
const SHORT = "Matningizni bepul shriftlarda koʻring · feekrfont.uz";

/** What people see before they press Start, and in the bot's profile. */
export async function setBotProfile(): Promise<void> {
  await tg("setMyDescription", { description: DESCRIPTION.replace("@BOT", `@${botUsername()}`) });
  await tg("setMyShortDescription", { short_description: SHORT });
}

export async function sendHelp(chatId: string): Promise<void> {
  const { channel, admins } = await getTgState();
  const isAdmin = admins.some((a) => a.chatId === chatId);
  const lines = [
    "<b>Feekr bot nima qila oladi</b>",
    "",
    "✍️ <b>Matn namunasi.</b> Menga istalgan matn yozing (60 belgigacha): uni shriftlarimizda rasm qilib qaytaraman.",
    "🔤 <b>Oʻzbek harflari.</b> /harflar: oʻ gʻ ʼ va ў қ ғ ҳ qaysi shriftlarda bor.",
    `🔎 <b>Qidiruv.</b> Istalgan chatda <code>@${esc(botUsername())} nomi</code> deb yozing: shriftni doʻstingizga yuborasiz.`,
    "🔔 <b>Xabarlar.</b> Kabinetda “Telegramni ulash”ni bossangiz, shaxsiy xabarlar va yangi shriftlar shu yerga keladi.",
    "📣 <b>Reklama.</b> /reklama: Feekr kanali yoki saytida reklama berish uchun ariza.",
  ];
  if (isAdmin) lines.push("📊 <b>Admin.</b> /stat: bot foydalanuvchilari statistikasi.");
  const keyboard: Keyboard = [
    [{ text: "✍️ Matn namunasi", callback_data: "h:t" }, { text: "🔤 Oʻzbek harflari", callback_data: "h:l" }],
    [{ text: "📣 Reklama berish", callback_data: "h:r" }],
    [{ text: "Shriftlarni koʻrish", url: siteLink("/fonts", "bot") }],
  ];
  if (channel?.username) keyboard.push([{ text: "Kanalga oʻtish", url: `https://t.me/${channel.username}` }]);
  // The picture carries the look; the caption holds the words (and works as plain text if the picture fails).
  await sendPhotoOrText(chatId, absoluteImage("/api/tg-image/help"), lines.join("\n").slice(0, 1000), keyboard);
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
  } else if (q.data === "h:r") {
    await startAdFlow(q.from as Parameters<typeof startAdFlow>[0]);
  }
}
