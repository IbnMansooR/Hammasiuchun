// Messages to site members: always the bell on the site, plus a copy in Telegram for those who
// turned it on. The Telegram part runs after the response (after()), so a slow or failing
// Telegram never delays the admin, and someone who blocked the bot is switched off automatically.
import crypto from "node:crypto";
import { after } from "next/server";
import { db } from "./db";
import { botEnabled, esc, pause, sendMessage, siteLink } from "./telegram";

export type Note = { title: string; body?: string; link?: string | null };

export async function notifyUser(userId: number, note: Note): Promise<void> {
  await db.notification.create({
    data: { userId, batch: crypto.randomUUID(), title: note.title, body: note.body ?? "", link: note.link ?? null },
  });
  mirrorToTelegram([userId], note);
}

/** One notification per recipient, all sharing a batch id so the admin can withdraw it as one send. */
export async function notifyUsers(ids: number[], note: Note): Promise<string> {
  const batch = crypto.randomUUID();
  for (let i = 0; i < ids.length; i += 1000) {
    await db.notification.createMany({
      data: ids.slice(i, i + 1000).map((userId) => ({ userId, batch, title: note.title, body: note.body ?? "", link: note.link ?? null })),
    });
  }
  mirrorToTelegram(ids, note);
  return batch;
}

export function telegramText(note: Note): string {
  const body = note.body?.trim();
  return `<b>${esc(note.title)}</b>${body ? `\n\n${esc(body)}` : ""}\n\n<i>Telegram xabarlarini oʻchirish: /stop</i>`;
}

function mirrorToTelegram(ids: number[], note: Note) {
  if (!botEnabled() || ids.length === 0) return;
  after(async () => {
    try {
      // A broadcast can name thousands of ids; then read the (much shorter) Telegram list and filter here.
      const wanted = new Set(ids);
      const people = (
        await db.user.findMany({
          where: { tgNotify: true, telegramId: { not: null }, ...(ids.length <= 1000 ? { id: { in: ids } } : {}) },
          select: { id: true, telegramId: true },
        })
      ).filter((p) => wanted.has(p.id));
      const keyboard = [[{ text: "Ochish", url: siteLink(note.link || "/account/notifications") }]];
      const html = telegramText(note);
      for (const p of people) {
        let r = await sendMessage(p.telegramId!, html, keyboard);
        if (!r.ok && r.code === 429) {
          await pause(1500);
          r = await sendMessage(p.telegramId!, html, keyboard);
        }
        // 403: the person blocked the bot; 400 "chat not found": they never opened it.
        if (!r.ok && (r.code === 403 || /chat not found/i.test(r.description))) {
          await db.user.update({ where: { id: p.id }, data: { tgNotify: false } });
        }
        await pause(40); // ≈25 messages a second, under Telegram's limit
      }
    } catch {
      /* the bell copy is already saved; Telegram is best effort */
    }
  });
}
