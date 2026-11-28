// Selling ads: the offer shown on /reklama (prices set by the admin, audience numbers from our
// own statistics and the channel), and the enquiries that come from the form or the bot's
// /reklama conversation. Each enquiry goes to the admins' Telegram with ✅ / ❌ buttons.
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { PUBLIC_FAMILY } from "./license";
import { SITE_URL } from "./site";
import { esc, pause, sendMessage, tg, type Keyboard } from "./telegram";
import { getTgState } from "./tgState";

/* ---------------- the offer ---------------- */

export type AdOffer = { channelPrice: string; sitePrice: string; packagePrice: string; note: string };
const OFFER_KEY = "ad-offer";
const EMPTY_OFFER: AdOffer = { channelPrice: "", sitePrice: "", packagePrice: "", note: "" };

export async function getAdOffer(): Promise<AdOffer> {
  try {
    const row = await db.setting.findUnique({ where: { key: OFFER_KEY } });
    const v = row ? (JSON.parse(row.value) as Partial<AdOffer>) : {};
    const s = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : "");
    return { channelPrice: s(v.channelPrice, 80), sitePrice: s(v.sitePrice, 80), packagePrice: s(v.packagePrice, 80), note: s(v.note, 600) };
  } catch {
    return EMPTY_OFFER;
  }
}

export async function saveAdOffer(o: AdOffer): Promise<void> {
  const value = JSON.stringify(o);
  await db.setting.upsert({ where: { key: OFFER_KEY }, update: { value }, create: { key: OFFER_KEY, value } });
}

export type Audience = { visits: number; views: number; subscribers: number | null; channel: string | null; fonts: number; downloads: number };

/** Real numbers only: the last 30 days of our own statistics, the channel's member count. */
export const getAudience = unstable_cache(
  async (): Promise<Audience> => {
    const [traffic, fonts, dl, state] = await Promise.all([
      db.$queryRaw<{ visits: number; views: number }[]>`
        SELECT COUNT(DISTINCT (visitor, ("at" AT TIME ZONE 'Asia/Tashkent')::date))::int AS visits,
               COUNT(*)::int AS views
        FROM "Hit" WHERE name = 'view' AND "at" >= now() - interval '30 days'`,
      db.family.count({ where: PUBLIC_FAMILY }),
      db.family.aggregate({ _sum: { downloads: true } }),
      getTgState(),
    ]);
    let subscribers: number | null = null;
    if (state.channel) {
      const r = await tg<number>("getChatMemberCount", { chat_id: state.channel.id }).catch(() => null);
      if (r?.ok) subscribers = r.result;
    }
    return {
      visits: traffic[0]?.visits ?? 0,
      views: traffic[0]?.views ?? 0,
      subscribers,
      channel: state.channel?.username ?? null,
      fonts,
      downloads: dl._sum.downloads ?? 0,
    };
  },
  ["ad-audience-v1"],
  { revalidate: 3600 },
);

/* ---------------- enquiries ---------------- */

export const AD_PLACES = ["channel", "site", "both", "unsure"] as const;
export type AdPlace = (typeof AD_PLACES)[number];
export const AD_PLACE_LABEL: Record<AdPlace, string> = {
  channel: "Telegram kanal",
  site: "Sayt (banner)",
  both: "Kanal va sayt",
  unsure: "Maslahat kerak",
};
export const AD_STATUS = ["new", "contacted", "accepted", "rejected", "done"] as const;
export const AD_STATUS_LABEL: Record<string, string> = {
  new: "Yangi",
  contacted: "Bogʻlanildi",
  accepted: "Qabul qilindi",
  rejected: "Rad etildi",
  done: "Bajarildi",
};

export type NewAdRequest = {
  source: "site" | "bot";
  name: string;
  contact: string;
  what: string;
  placements: AdPlace;
  timing?: string | null;
  link?: string | null;
  tgChatId?: string | null;
  tgUsername?: string | null;
};

const clip = (s: string | null | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** A link written in the text, if any (http(s) or t.me / instagram without the scheme). */
export function firstLink(text: string): string | null {
  const m = /(https?:\/\/[^\s<>"]+|(?:t\.me|instagram\.com|www\.)[^\s<>"]+)/i.exec(text);
  return m ? m[1].replace(/[.,;:!?)]+$/, "").slice(0, 300) : null;
}

const contactUrl = (r: { tgUsername: string | null; tgChatId: string | null }) =>
  r.tgUsername ? `https://t.me/${r.tgUsername}` : r.tgChatId ? `tg://user?id=${r.tgChatId}` : null;

function requestHtml(r: { id: number; source: string; name: string; contact: string; what: string; placements: string; timing: string | null; link: string | null; tgUsername: string | null }): string {
  return [
    `📣 <b>Yangi reklama arizasi #${r.id}</b> · ${r.source === "bot" ? "bot orqali" : "saytdan"}`,
    "",
    `<b>Kim:</b> ${esc(r.name)}${r.tgUsername ? ` (@${esc(r.tgUsername)})` : ""}`,
    `<b>Aloqa:</b> ${esc(r.contact)}`,
    `<b>Nima:</b> ${esc(r.what)}`,
    `<b>Qayerda:</b> ${esc(AD_PLACE_LABEL[r.placements as AdPlace] ?? r.placements)}`,
    r.timing ? `<b>Muddat / byudjet:</b> ${esc(r.timing)}` : null,
    r.link ? `<b>Havola:</b> ${esc(r.link)}` : null,
  ].filter((l) => l !== null).join("\n");
}

function requestKeyboard(r: { id: number; status: string; tgUsername: string | null; tgChatId: string | null }): Keyboard {
  const write = contactUrl(r);
  const rows: Keyboard = [];
  if (write) rows.push([{ text: "✍️ Yozish", url: write }]);
  if (r.status === "new" || r.status === "contacted") {
    rows.push([{ text: "✅ Qabul qilish", callback_data: `ad:a:${r.id}` }, { text: "❌ Rad etish", callback_data: `ad:x:${r.id}` }]);
  } else {
    rows.push([{ text: r.status === "rejected" ? "❌ Rad etildi" : `✅ ${AD_STATUS_LABEL[r.status] ?? r.status}`, callback_data: "ad:n:0" }]);
  }
  rows.push([{ text: "Admin panelda", url: `${SITE_URL}/admin/ads/requests#r${r.id}` }]);
  return rows;
}

/** Saved, then sent to every admin's Telegram. Returns the new id. */
export async function createAdRequest(input: NewAdRequest): Promise<number> {
  const r = await db.adRequest.create({
    data: {
      source: input.source,
      name: clip(input.name, 80) || "—",
      contact: clip(input.contact, 120),
      what: clip(input.what, 1000),
      placements: input.placements,
      timing: clip(input.timing, 300) || null,
      link: clip(input.link, 300) || null,
      tgChatId: input.tgChatId ?? null,
      tgUsername: input.tgUsername ? input.tgUsername.replace(/[^A-Za-z0-9_]/g, "").slice(0, 64) || null : null,
    },
  });
  try {
    const { admins } = await getTgState();
    const msgs: { chatId: string; messageId: number }[] = [];
    for (const a of admins) {
      const m = await sendMessage(a.chatId, requestHtml(r), requestKeyboard(r)).catch(() => null);
      if (m?.ok) msgs.push({ chatId: a.chatId, messageId: m.result.message_id });
      await pause(40);
    }
    if (msgs.length) await db.adRequest.update({ where: { id: r.id }, data: { msgs: JSON.stringify(msgs) } });
  } catch {
    /* the enquiry is saved and visible in the admin panel either way */
  }
  return r.id;
}

/** A status change from the panel or the admin's Telegram buttons; the applicant hears about ✅ / ❌. */
export async function setAdRequestStatus(id: number, status: string, note?: string | null): Promise<boolean> {
  if (!(AD_STATUS as readonly string[]).includes(status)) return false;
  const before = await db.adRequest.findUnique({ where: { id } });
  if (!before) return false;
  const r = await db.adRequest.update({ where: { id }, data: { status, ...(note !== undefined ? { note: note ? note.slice(0, 1000) : null } : {}) } });
  if (before.status === status) return true;
  // Every admin's copy shows the new state.
  try {
    const msgs = JSON.parse(r.msgs ?? "[]") as { chatId: string; messageId: number }[];
    for (const m of msgs) {
      await tg("editMessageReplyMarkup", { chat_id: m.chatId, message_id: m.messageId, reply_markup: { inline_keyboard: requestKeyboard(r) } }).catch(() => null);
    }
  } catch { /* old or missing copies */ }
  if (r.tgChatId && (status === "accepted" || status === "rejected")) {
    const text = status === "accepted"
      ? `✅ Reklama arizangiz (#${r.id}) qabul qilindi. Admin tez orada siz bilan bogʻlanadi.`
      : `Rahmat! Afsuski, bu safar reklamangizni (#${r.id}) joylay olmaymiz.`;
    await sendMessage(r.tgChatId, text).catch(() => null);
  }
  return true;
}
