// Who may run the scheduled jobs: Vercel Cron sends "Authorization: Bearer $CRON_SECRET"; the
// database's pg_cron sends a token it keeps in the Setting table ("cron-token"), so that secret
// never has to leave the database.
import crypto from "node:crypto";
import { db } from "./db";

const same = (given: string, secret: string) => {
  const want = `Bearer ${secret}`;
  return given.length === want.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want));
};

export async function cronAuthorized(req: Request): Promise<boolean> {
  const given = req.headers.get("authorization") ?? "";
  if (!given.startsWith("Bearer ")) return false;
  const env = process.env.CRON_SECRET ?? "";
  if (env.length >= 16 && same(given, env)) return true;
  const row = await db.setting.findUnique({ where: { key: "cron-token" } }).catch(() => null);
  return !!row && row.value.length >= 32 && same(given, row.value);
}
