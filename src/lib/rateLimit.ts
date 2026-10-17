// DB-backed throttling for public auth forms (serverless instances don't share
// memory). Reuses the LoginAttempt table with a prefixed key, so admin, user
// and OTP counters never collide and no migration is needed.
import { headers } from "next/headers";
import { db } from "./db";

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** True while `key` is locked out. */
export async function isLocked(key: string): Promise<boolean> {
  const a = await db.loginAttempt.findUnique({ where: { key } });
  return !!(a?.lockedUntil && a.lockedUntil > new Date());
}

/** Count one attempt; lock the key for `lockMs` once `max` is reached. */
export async function hit(key: string, max: number, lockMs: number): Promise<void> {
  const now = new Date();
  const a = await db.loginAttempt.findUnique({ where: { key } });
  const stale = !!(a?.lockedUntil && a.lockedUntil <= now);
  const count = (stale || !a ? 0 : a.count) + 1;
  const lockedUntil = count >= max ? new Date(now.getTime() + lockMs) : null;
  await db.loginAttempt.upsert({
    where: { key },
    update: { count: lockedUntil ? 0 : count, lockedUntil },
    create: { key, count: lockedUntil ? 0 : count, lockedUntil },
  });
}

export async function clear(key: string): Promise<void> {
  await db.loginAttempt.delete({ where: { key } }).catch(() => {});
}
