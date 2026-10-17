// Who uses the Telegram bot, and for what: counts only. A BotUser row holds the chat id, the first and
// last time, how many times and where the person came from; a BotEvent row is just a kind and a time.
// No name, no username and no text is stored.
import { db } from "./db";
import { TZ_OFFSET_MS, tashkentDay } from "./analytics";

export type BotKind = "start" | "sample" | "help" | "letters" | "ads" | "inline" | "stop" | "menu" | "other";

/** The ?start= label, without the secret one-time codes (l_… and a_… link members and admins). */
export function startSource(payload: string): string | null {
  if (!payload) return null;
  if (/^[la]_/.test(payload)) return "kabinet";
  return /^[A-Za-z0-9_-]{1,24}$/.test(payload) ? payload.toLowerCase() : null;
}

/** Remember one use of the bot. Never throws: statistics must not break the bot. */
export async function noteBot(chatId: string, kind: BotKind, source: string | null = null): Promise<void> {
  try {
    await db.botUser.upsert({
      where: { chatId },
      create: { chatId, source },
      update: { lastAt: new Date(), msgs: { increment: 1 }, blockedAt: null },
    });
    await db.botEvent.create({ data: { kind } });
  } catch {
    /* ignore */
  }
}

/** The person blocked the bot (or unblocked it). */
export async function noteBlocked(chatId: string, blocked: boolean): Promise<void> {
  try {
    await db.botUser.updateMany({ where: { chatId }, data: { blockedAt: blocked ? new Date() : null } });
  } catch {
    /* ignore */
  }
}

const dayStart = (day: string) => Date.parse(`${day}T00:00:00Z`) - TZ_OFFSET_MS; // Tashkent midnight, in UTC ms

export type BotStats = {
  total: number;
  blocked: number;
  today: number;
  week: number;
  active7: number;
  active1: number;
  days: { day: string; fresh: number; events: number }[]; // last 14 days, oldest first
  kinds: { kind: string; n: number }[]; // last 7 days
  sources: { source: string; n: number }[];
};

export async function botStats(now = Date.now()): Promise<BotStats> {
  const today = tashkentDay(new Date(now));
  const t0 = dayStart(today);
  const from14 = t0 - 13 * 864e5;
  const [total, blocked, fresh, events, active7, active1, kinds, sources] = await Promise.all([
    db.botUser.count(),
    db.botUser.count({ where: { blockedAt: { not: null } } }),
    db.botUser.findMany({ where: { firstAt: { gte: new Date(from14) } }, select: { firstAt: true } }),
    db.botEvent.findMany({ where: { at: { gte: new Date(from14) } }, select: { at: true, kind: true } }),
    db.botUser.count({ where: { lastAt: { gte: new Date(t0 - 6 * 864e5) } } }),
    db.botUser.count({ where: { lastAt: { gte: new Date(t0) } } }),
    db.botEvent.groupBy({ by: ["kind"], where: { at: { gte: new Date(t0 - 6 * 864e5) } }, _count: { _all: true } }),
    db.botUser.groupBy({ by: ["source"], _count: { _all: true } }),
  ]);
  const idx = (t: number) => Math.min(13, Math.max(0, Math.floor((t - from14) / 864e5)));
  const days = Array.from({ length: 14 }, (_, i) => ({ day: tashkentDay(new Date(from14 + i * 864e5 + 12 * 36e5)), fresh: 0, events: 0 }));
  for (const f of fresh) days[idx(f.firstAt.getTime())].fresh++;
  for (const e of events) days[idx(e.at.getTime())].events++;
  return {
    total, blocked, today: days[13].fresh, week: days.slice(7).reduce((s, d) => s + d.fresh, 0), active7, active1, days,
    kinds: kinds.map((k) => ({ kind: k.kind, n: k._count._all })).sort((a, b) => b.n - a.n),
    sources: sources.map((s) => ({ source: s.source ?? "nomaʼlum", n: s._count._all })).sort((a, b) => b.n - a.n),
  };
}

export const KIND_LABEL: Record<string, string> = {
  start: "/start", sample: "Matn namunasi", help: "/help", letters: "/harflar", ads: "Reklama", inline: "Inline qidiruv", stop: "/stop", menu: "Menyu tugmalari", other: "Boshqa",
};

/** The short text for admins: /stat in the bot and a line in the daily report. */
export function statsText(s: BotStats): string {
  const top = s.kinds.slice(0, 4).map((k) => `${KIND_LABEL[k.kind] ?? k.kind} ${k.n}`).join(" · ");
  return [
    "🤖 <b>Bot foydalanuvchilari</b>",
    `Jami: <b>${s.total}</b> · bloklagan: ${s.blocked}`,
    `Yangi: bugun <b>${s.today}</b> · 7 kunda <b>${s.week}</b>`,
    `Faol: bugun ${s.active1} · 7 kunda ${s.active7}`,
    top ? `Oxirgi 7 kun: ${top}` : null,
  ].filter((l) => l !== null).join("\n");
}
