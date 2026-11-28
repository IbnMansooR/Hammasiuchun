// Read-change-write of one JSON Setting row that is safe against two writers at once: the row is
// saved only if nobody saved in between, else it is read again and the change redone. Two admins
// pressing the same button, or a cron call and a button, can't both take the same item.
import { db } from "./db";

export async function casUpdate<T>(key: string, parse: (raw: string | undefined) => T, change: (s: T) => void): Promise<T> {
  for (let i = 0; i < 8; i++) {
    const row = await db.setting.findUnique({ where: { key } });
    const s = parse(row?.value);
    change(s);
    const value = JSON.stringify(s);
    const saved = row
      ? (await db.setting.updateMany({ where: { key, value: row.value }, data: { value } })).count === 1
      : await db.setting.create({ data: { key, value } }).then(() => true, () => false);
    if (saved) return s;
    await new Promise((r) => setTimeout(r, 20 + Math.random() * 80));
  }
  throw new Error(`${key}: busy`);
}

export async function readSetting<T>(key: string, parse: (raw: string | undefined) => T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } }).catch(() => null);
  return parse(row?.value);
}
