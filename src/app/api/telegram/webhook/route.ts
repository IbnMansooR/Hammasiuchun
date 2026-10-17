// Telegram → site. Telegram POSTs every update here (setWebhook, with a secret_token that comes
// back in a header). Handled: /start with a deep-link payload (connect a member or an admin),
// /stop, the bot being added to / removed from a channel, and the admin's ✅/❌ buttons.
import crypto from "node:crypto";
import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { botEnabled, botUsername, esc, sendMessage, siteLink, type Keyboard } from "@/lib/telegram";
import { getTgState, updateTgState, type TgChannel } from "@/lib/tgState";
import { handleAdminCallback, handleDigestCallback } from "@/lib/tgAdmin";
import { handleSampleCallback, sendSample, sendUzbekLetters } from "@/lib/tgSamples";
import { handleInlineQuery } from "@/lib/tgInline";
import { handleScoutCallback } from "@/lib/fontScout";
import { handleContentCallback } from "@/lib/contentScout";
import { handleAdFlowCallback, handleAdFlowMessage, inAdFlow, startAdFlow } from "@/lib/tgAdFlow";
import { handleAdRequestCallback } from "@/lib/channelAds";
import { handleHelpCallback, sendHelp, setBotCommands } from "@/lib/tgHelp";
import { askBrand, askWallpaper, handleBrandCallback, handleTestCallback, handleWallCallback, isPlayReply, makeBrand, makeWallpaper, startTest } from "@/lib/tgPlay";
import { botStats, noteBlocked, noteBot, startSource, statsText, type BotKind } from "@/lib/botStats";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // the first call of the day also builds the font list

type From = { id: number; first_name?: string; last_name?: string; username?: string; is_bot?: boolean };
type Chat = { id: number; type: string; title?: string; username?: string };
type Update = {
  message?: { message_id: number; from?: From; chat: Chat; text?: string; contact?: { phone_number: string; user_id?: number }; reply_to_message?: { text?: string } };
  callback_query?: { id: string; from: From; data?: string; message?: { message_id: number; chat: Chat; caption?: string; text?: string } };
  inline_query?: { id: string; from: From; query: string };
  my_chat_member?: { chat: Chat; from: From; new_chat_member: { status: string } };
};

function sameSecret(given: string | null): boolean {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  if (!want || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const ok = () => NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  if (!botEnabled() || !sameSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return new NextResponse(null, { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as Update | null;
  if (!update) return ok();
  try {
    const cb = update.callback_query;
    if (cb?.data?.startsWith("s:")) after(() => handleSampleCallback(cb).catch(() => {})); // re-renders a picture: answer Telegram first
    else if (cb?.data?.startsWith("d:")) await handleDigestCallback(cb);
    else if (cb?.data?.startsWith("h:")) await handleHelpCallback(cb);
    else if (cb?.data?.startsWith("t:")) await handleTestCallback(cb);
    else if (cb?.data?.startsWith("f:")) after(() => handleWallCallback(cb).catch(() => {})); // draws a picture: answer Telegram first
    else if (cb?.data?.startsWith("b:")) after(() => handleBrandCallback(cb).catch(() => {}));
    else if (cb?.data?.startsWith("ad:f:")) await handleAdFlowCallback(cb);
    else if (cb?.data?.startsWith("ad:")) await handleAdRequestCallback(cb);
    else if (cb?.data?.startsWith("cs:")) after(() => handleContentCallback(cb).catch(() => {})); // saving a profile downloads a picture
    else if (cb?.data?.startsWith("gf:")) after(() => handleScoutCallback(cb).catch(() => {})); // adding a font takes a while
    else if (cb) await handleAdminCallback(cb);
    else if (update.inline_query) {
      void noteBot(String(update.inline_query.from.id), "inline");
      await handleInlineQuery(update.inline_query);
    }
    else if (update.my_chat_member) await onMembership(update.my_chat_member);
    else if (update.message?.chat.type === "private" && update.message.from && !update.message.from.is_bot) {
      const c = update.message.contact;
      // A shared phone number only counts when it is the sender's own.
      if (c && c.user_id === update.message.from.id) await handleAdFlowMessage(update.message.from, "", c.phone_number);
      else await onPrivateMessage(update.message.from, update.message.text ?? "", update.message.reply_to_message?.text);
    }
  } catch {
    // Always 200: a non-2xx makes Telegram resend the same update again and again.
  }
  return ok();
}

/* ---------------- private chat ---------------- */

const STOP_HINT = "Oʻchirish: /stop";

async function onPrivateMessage(from: From, text: string, replyText?: string) {
  const chatId = String(from.id);
  const [cmd, payload = ""] = text.trim().split(/\s+/, 2);

  // Count the use (kinds only, never the text). /stat is the admin's own tool and is not counted.
  if (cmd !== "/stat") {
    const adAnswer = !text.trim().startsWith("/") && (await inAdFlow(chatId));
    const play = !text.trim().startsWith("/") ? isPlayReply(replyText) : null;
    const kind: BotKind = cmd === "/start" ? "start" : cmd === "/help" ? "help" : cmd === "/harflar" ? "letters" : cmd === "/reklama" || adAnswer ? "ads"
      : cmd === "/test" ? "test" : cmd === "/fon" || play === "wall" ? "wall" : cmd === "/brend" || play === "brand" ? "brand"
      : cmd === "/stop" ? "stop" : !text.trim().startsWith("/") ? (text.trim() ? "sample" : "other") : "other";
    await noteBot(chatId, kind, cmd === "/start" ? startSource(payload) : null);
  }

  if (cmd === "/start" && payload.startsWith("l_")) return linkMember(from, payload.slice(2));
  if (cmd === "/start" && payload.startsWith("a_")) return linkAdmin(from, payload.slice(2));

  if (cmd === "/reklama" || (cmd === "/start" && payload === "reklama")) return startAdFlow(from);
  // Plain text in the middle of an ad enquiry is an answer, not a text sample.
  if (!text.trim().startsWith("/") && (await inAdFlow(chatId))) return handleAdFlowMessage(from, text);
  if (cmd === "/harflar") return sendUzbekLetters(chatId);
  if (cmd === "/help") return sendHelp(chatId);
  if (cmd === "/test") return startTest(chatId);
  if (cmd === "/fon") return askWallpaper(chatId);
  if (cmd === "/brend") return askBrand(chatId);
  // A reply to the /fon or /brend question (the picture takes a few seconds: Telegram gets its answer first).
  const played = !text.trim().startsWith("/") ? isPlayReply(replyText) : null;
  if (played === "wall") { after(() => makeWallpaper(chatId, text).catch(() => {})); return; }
  if (played === "brand") { after(() => makeBrand(chatId, text).catch(() => {})); return; }
  if (cmd === "/stat") {
    const { admins } = await getTgState();
    if (!admins.some((a) => a.chatId === chatId)) return; // only the admins
    await sendMessage(chatId, statsText(await botStats()), [[{ text: "Batafsil", url: `${SITE_URL}/admin/telegram#botusers` }]]);
    return;
  }
  // Plain text: show it in our fonts. Rendering takes a few seconds, so Telegram gets its answer first.
  if (!text.trim().startsWith("/")) {
    if (text.trim()) after(() => sendSample(chatId, text).catch(() => {}));
    return;
  }

  const member = await db.user.findUnique({ where: { telegramId: chatId }, select: { id: true, tgNotify: true } });

  if (cmd === "/stop") {
    if (member?.tgNotify) await db.user.update({ where: { id: member.id }, data: { tgNotify: false } });
    await sendMessage(chatId, "Telegram xabarlari oʻchirildi. Saytdagi qoʻngʻiroqchada xabarlar qolaveradi.\nQayta yoqish: /start");
    return;
  }

  if (cmd === "/start" && member) {
    if (!member.tgNotify) await db.user.update({ where: { id: member.id }, data: { tgNotify: true } });
    await sendMessage(
      chatId,
      `✅ Xabarlar yoqildi. Shaxsiy xabarlar va yangi shriftlar haqidagi yangiliklar shu yerga keladi.\n\n${STOP_HINT}`,
      [[{ text: "Kabinetim", url: siteLink("/account") }]],
    );
    return;
  }

  await sendWelcome(chatId);
}

async function sendWelcome(chatId: string) {
  const { channel } = await getTgState();
  const lines = [
    "Salom! Men <b>Feekr</b> botiman: feekrfont.uz dagi bepul shriftlar.",
    "",
    "✍️ Menga istalgan matn yozing (60 belgigacha): uni shriftlarimizda rasm qilib qaytaraman.",
    "🔤 /harflar: oʻzbek harflari (oʻ gʻ ʼ, ў қ ғ ҳ) qaysi shriftlarda bor.",
    `🔎 Istalgan chatda <code>@${esc(botUsername())} nomi</code> deb yozib, shriftni doʻstingizga yuboring.`,
    "🔔 Kabinetda “Telegramni ulash”ni bossangiz, shaxsiy xabarlar va yangi shriftlar shu yerga keladi.",
    "📣 /reklama: Feekr kanali yoki saytida reklama berish uchun ariza.",
  ];
  if (channel?.username) lines.push(`• Yangi shriftlar kanali: @${esc(channel.username)}`);
  const keyboard: Keyboard = [
    [{ text: "Shriftlarni koʻrish", url: siteLink("/fonts") }],
    [{ text: "Saytga kirish", url: siteLink("/login") }],
  ];
  if (channel?.username) keyboard.push([{ text: "Kanalga oʻtish", url: `https://t.me/${channel.username}` }]);
  await sendMessage(chatId, lines.join("\n"), keyboard);
}

async function linkMember(from: From, code: string) {
  const chatId = String(from.id);
  const expired = () =>
    sendMessage(chatId, "Bu havola eskirgan yoki allaqachon ishlatilgan. Saytdagi kabinetdan “Telegramni ulash”ni qayta bosing.", [
      [{ text: "Kabinetim", url: siteLink("/account") }],
    ]);
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(code)) return expired();
  const user = await db.user.findUnique({ where: { tgLinkCode: code }, select: { id: true, telegramId: true, tgLinkExp: true } });
  if (!user || !user.tgLinkExp || user.tgLinkExp < new Date()) return expired();

  const clear = { tgLinkCode: null, tgLinkExp: null };
  const owner = await db.user.findUnique({ where: { telegramId: chatId }, select: { id: true } });
  if (owner && owner.id !== user.id) {
    await db.user.update({ where: { id: user.id }, data: clear });
    return sendMessage(chatId, "Bu Telegram boshqa Feekr hisobiga ulangan. Oʻsha hisobga Telegram orqali kirishingiz mumkin.");
  }
  if (user.telegramId && user.telegramId !== chatId) {
    await db.user.update({ where: { id: user.id }, data: clear });
    return sendMessage(chatId, "Bu Feekr hisobi boshqa Telegramga ulangan. Avvalgi Telegram orqali kiring.");
  }
  const username = (from.username ?? "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 64) || null;
  await db.user.update({ where: { id: user.id }, data: { ...clear, telegramId: chatId, telegramUsername: username, tgNotify: true } });
  await sendMessage(
    chatId,
    `✅ Telegram Feekr hisobingizga ulandi.\nEndi shaxsiy xabarlar va yangi shriftlar shu yerga keladi. Saytga Telegram orqali ham kira olasiz.\n\n${STOP_HINT}`,
    [[{ text: "Kabinetim", url: siteLink("/account") }]],
  );
}

async function linkAdmin(from: From, code: string) {
  const chatId = String(from.id);
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").slice(0, 60) + (from.username ? ` (@${from.username})` : "");
  let linked = false as boolean;
  await updateTgState((s) => {
    const n = s.adminNonce;
    const valid = !!n && n.exp > Date.now() && n.code.length === code.length && crypto.timingSafeEqual(Buffer.from(n.code), Buffer.from(code));
    if (!valid) return;
    linked = true;
    s.adminNonce = null; // one use only
    s.admins = [...s.admins.filter((a) => a.chatId !== chatId), { chatId, name: name || chatId, at: new Date().toISOString() }];
  });
  if (!linked) {
    await sendMessage(chatId, "Bu admin havolasi eskirgan yoki ishlatilgan. Admin paneldagi Telegram sahifasidan yangisini oling.");
    return;
  }
  await setBotCommands(chatId).catch(() => null); // adds /stat to this admin's menu
  await sendMessage(
    chatId,
    "✅ Siz Feekr admini sifatida ulandingiz.\nYangi ishlar (✅/❌ tugmalari bilan) va har kungi qisqa hisobot shu yerga keladi.",
    [[{ text: "Admin panel", url: `${SITE_URL}/admin/telegram` }]],
  );
}

/* ---------------- channels and blocks ---------------- */

async function onMembership(m: NonNullable<Update["my_chat_member"]>) {
  const { chat } = m;
  const status = m.new_chat_member.status;

  if (chat.type === "private") {
    // The person blocked the bot: stop sending them copies.
    await noteBlocked(String(chat.id), status === "kicked");
    if (status === "kicked") await db.user.updateMany({ where: { telegramId: String(chat.id) }, data: { tgNotify: false } });
    return;
  }
  if (chat.type !== "channel") return;

  const entry: TgChannel = { id: String(chat.id), title: (chat.title ?? "").slice(0, 120), username: chat.username ?? null };
  const isAdmin = status === "administrator";
  let lostSelected = false as boolean;
  const state = await updateTgState((s) => {
    s.candidates = s.candidates.filter((c) => c.id !== entry.id);
    if (isAdmin) s.candidates.push(entry);
    if (s.channel?.id === entry.id) {
      if (isAdmin) s.channel = entry; // keep the title / @username fresh
      else {
        s.channel = null;
        lostSelected = true;
      }
    }
  });
  const text = isAdmin
    ? state.channel?.id === entry.id
      ? null
      : `Bot “${esc(entry.title)}” kanaliga admin qilindi. Postlar shu kanalga borishi uchun admin panelda tasdiqlang.`
    : lostSelected
      ? `⚠️ Bot “${esc(entry.title)}” kanalidan chiqarildi yoki adminlikdan olindi. Kanalga postlar toʻxtadi.`
      : null;
  if (text) {
    for (const a of state.admins) await sendMessage(a.chatId, text, [[{ text: "Telegram sozlamalari", url: `${SITE_URL}/admin/telegram` }]]);
  }
}
