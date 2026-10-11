"use server";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { SITE_URL } from "@/lib/site";
import { botEnabled, botToken, sendMessage, tg } from "@/lib/telegram";
import { AUTOPOST_EVERY, LINK_TTL_MS, getTgState, linkCode, updateTgState, type TgChannel } from "@/lib/tgState";
import { runAutopost } from "@/lib/tgAutopost";
import { CAPTION_MAX, digestDraft, fontDraft, postDraft, workDraft } from "@/lib/tgPosts";
import { AUTHOR_MAX, BUILTIN_QUOTES, MOODS, cleanQuote, isQuoteId, type Mood } from "@/lib/quotes";
import { uzbekize } from "@/lib/fontSamples";

const BACK = "/admin/telegram";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const fail = (code: string, back = BACK): never => redirect(`${back}${back.includes("?") ? "&" : "?"}error=${code}`);

const botId = () => botToken().split(":")[0];

/** The bot must be an admin of the channel with the right to post. */
async function checkChannel(chatId: string): Promise<TgChannel | null> {
  const chat = await tg<{ id: number; type: string; title?: string; username?: string }>("getChat", { chat_id: chatId });
  if (!chat.ok || chat.result.type !== "channel") return null;
  const me = await tg<{ status: string; can_post_messages?: boolean }>("getChatMember", { chat_id: chat.result.id, user_id: Number(botId()) });
  if (!me.ok || me.result.status !== "administrator" || me.result.can_post_messages === false) return null;
  return { id: String(chat.result.id), title: (chat.result.title ?? "").slice(0, 120), username: chat.result.username ?? null };
}

export async function setWebhookAction() {
  await requireAdmin();
  if (!botEnabled() || !process.env.TELEGRAM_WEBHOOK_SECRET) fail("env");
  const r = await tg("setWebhook", {
    url: `${SITE_URL}/api/telegram/webhook`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query", "my_chat_member", "inline_query"],
    max_connections: 10,
  });
  if (!r.ok) fail("webhook");
  await tg("setMyCommands", {
    commands: [
      { command: "start", description: "Boshlash / xabarlarni yoqish" },
      { command: "harflar", description: "Oʻzbek harflari qaysi shriftlarda bor" },
      { command: "help", description: "Bot nima qila oladi" },
      { command: "stop", description: "Telegram xabarlarini oʻchirish" },
    ],
  });
  redirect(`${BACK}?ok=webhook`);
}

export async function createAdminLinkAction() {
  await requireAdmin();
  await updateTgState((s) => {
    s.adminNonce = { code: linkCode(), exp: Date.now() + LINK_TTL_MS };
  });
  redirect(`${BACK}?ok=link#admins`);
}

export async function removeTgAdminAction(fd: FormData) {
  await requireAdmin();
  const chatId = str(fd, "chatId");
  await updateTgState((s) => {
    s.admins = s.admins.filter((a) => a.chatId !== chatId);
  });
  redirect(`${BACK}?ok=removed#admins`);
}

export async function testAdminsAction() {
  await requireAdmin();
  const { admins } = await getTgState();
  if (!admins.length) fail("noadmins");
  let sent = 0;
  for (const a of admins) if ((await sendMessage(a.chatId, "🔔 Sinov xabari: Feekr boti ishlayapti.")).ok) sent++;
  redirect(`${BACK}?ok=test&n=${sent}#admins`);
}

/** "@name", "name", "https://t.me/name" or a -100… id → what getChat takes, or null. */
function channelRef(input: string): string | null {
  let raw = input;
  if (/^https?:\/\/t\.me\//i.test(raw)) raw = `@${raw.replace(/^https?:\/\/t\.me\//i, "").split(/[/?#]/)[0]}`;
  if (/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(raw)) raw = `@${raw}`;
  return /^(@[A-Za-z][A-Za-z0-9_]{3,31}|-100\d{5,15})$/.test(raw) ? raw : null;
}

export async function chooseChannelAction(fd: FormData) {
  await requireAdmin();
  const raw = channelRef(str(fd, "channel"));
  if (!raw) fail("channel");
  const ch = await checkChannel(raw!);
  if (!ch) fail("notadmin");
  await updateTgState((s) => {
    s.channel = ch;
    if (s.base?.id === ch!.id) s.base = null; // one channel can't be both
    s.candidates = [...s.candidates.filter((c) => c.id !== ch!.id), ch!];
  });
  redirect(`${BACK}?ok=channel#channel`);
}

/** The file channel: where each posted font's ZIP is kept (lib/tgFiles). */
export async function chooseBaseAction(fd: FormData) {
  await requireAdmin();
  const raw = channelRef(str(fd, "channel"));
  if (!raw) fail("channel");
  const ch = await checkChannel(raw!);
  if (!ch) fail("basenotadmin");
  const { channel } = await getTgState();
  if (channel?.id === ch!.id) fail("basesame");
  await updateTgState((s) => {
    s.base = ch;
    s.candidates = [...s.candidates.filter((c) => c.id !== ch!.id), ch!];
  });
  redirect(`${BACK}?ok=base#channel`);
}

export async function clearBaseAction() {
  await requireAdmin();
  await updateTgState((s) => {
    s.base = null;
  });
  redirect(`${BACK}?ok=basecleared#channel`);
}

export async function clearChannelAction() {
  await requireAdmin();
  await updateTgState((s) => {
    s.channel = null;
  });
  redirect(`${BACK}?ok=cleared#channel`);
}

export async function postToChannelAction(fd: FormData) {
  await requireAdmin();
  const kind = str(fd, "kind");
  const ref = str(fd, "ref");
  const back = `${BACK}/post?${kind === "digest" ? "digest=1" : `${kind === "work" ? "work" : "font"}=${encodeURIComponent(ref)}`}`;
  const quote = str(fd, "q");
  const draft = kind === "work" ? await workDraft(Number(ref)) : kind === "font" ? await fontDraft(ref, isQuoteId(quote) ? quote : null) : kind === "digest" ? await digestDraft() : null;
  if (!draft) fail("gone", back);
  const caption = str(fd, "caption");
  if (!caption) fail("empty", back);
  if (caption.length > CAPTION_MAX) fail("long", back);
  const r = await postDraft(draft!, caption, fd.get("silent") === "on");
  if (!r.ok) fail(r.reason, back);
  revalidatePath(BACK);
  redirect(`${back}&ok=posted`);
}

/* ---------------- automatic font posts ---------------- */

export async function saveAutopostAction(fd: FormData) {
  await requireAdmin();
  const every = Number(fd.get("every"));
  await updateTgState((s) => {
    s.autopost.on = fd.get("on") === "on";
    if ((AUTOPOST_EVERY as readonly number[]).includes(every)) s.autopost.every = every;
  });
  revalidatePath(BACK);
  redirect(`${BACK}?ok=auto#auto`);
}

export async function skipAutopostAction(fd: FormData) {
  await requireAdmin();
  const slug = str(fd, "slug").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  if (slug) await updateTgState((s) => { if (!s.autopost.skip.includes(slug)) s.autopost.skip.push(slug); });
  revalidatePath(BACK);
  redirect(`${BACK}#auto`);
}

export async function unskipAutopostAction() {
  await requireAdmin();
  await updateTgState((s) => { s.autopost.skip = []; });
  revalidatePath(BACK);
  redirect(`${BACK}#auto`);
}

/** "Post now": the next family in the queue, whatever the schedule says. */
export async function postNextNowAction() {
  await requireAdmin();
  const r = await runAutopost({ force: true });
  revalidatePath(BACK);
  if (!r.posted) {
    const code = { empty: "autoempty", nochannel: "channelfirst", notadmin: "notadmin", unsure: "autounsure", basefile: "basefile" } as Record<string, string>;
    fail(code[r.reason ?? ""] ?? "autosend");
  }
  redirect(`${BACK}?ok=autoposted#auto`);
}

/* ---------------- poster quotes ---------------- */

const QBACK = `${BACK}?ok=quote#quotes`;

export async function addQuoteAction(fd: FormData) {
  await requireAdmin();
  const text = cleanQuote(String(fd.get("text") ?? ""));
  const author = uzbekize(str(fd, "author").replace(/[<>]/g, "")).replace(/\s+/g, " ").slice(0, AUTHOR_MAX).trim();
  const mood = str(fd, "mood") as Mood;
  if (!text) fail("qempty", `${BACK}#quotes`);
  if (!MOODS.includes(mood)) fail("qmood", `${BACK}#quotes`);
  await updateTgState((s) => {
    s.quotes.custom = [{ id: `c${crypto.randomBytes(4).toString("hex")}`, text, author: author || null, mood }, ...s.quotes.custom].slice(0, 200);
  });
  revalidatePath(BACK);
  redirect(QBACK);
}

export async function removeQuoteAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  if (isQuoteId(id)) await updateTgState((s) => { s.quotes.custom = s.quotes.custom.filter((q) => q.id !== id); });
  revalidatePath(BACK);
  redirect(`${BACK}#quotes`);
}

/** Switch a ready-made quote off (or back on). */
export async function toggleQuoteAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  if (BUILTIN_QUOTES.some((q) => q.id === id)) {
    await updateTgState((s) => {
      s.quotes.off = s.quotes.off.includes(id) ? s.quotes.off.filter((x) => x !== id) : [...s.quotes.off, id];
    });
  }
  revalidatePath(BACK);
  redirect(`${BACK}#quotes`);
}
