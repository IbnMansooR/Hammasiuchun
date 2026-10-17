import type { Prisma } from "@prisma/client";
import { activeRestriction } from "./userAuth";
import { formatDateTime } from "./format";

export const restrictedWhere = (now = new Date()): Prisma.UserWhereInput => ({
  blockedAt: { not: null },
  OR: [{ blockedUntil: null }, { blockedUntil: { gt: now } }],
});
export const unrestrictedWhere = (now = new Date()): Prisma.UserWhereInput => ({
  OR: [{ blockedAt: null }, { blockedUntil: { lte: now } }],
});

export function statusOf(u: { blockedAt: Date | null; blockedUntil: Date | null }): { label: string; cls: string } {
  const r = activeRestriction(u);
  if (!r) return { label: "Faol", cls: "tag tag-ok" };
  if (r.until) return { label: `${formatDateTime(r.until)} gacha`, cls: "tag tag-warn" };
  return { label: "Bloklangan", cls: "tag tag-danger" };
}

export function signInMethods(u: { email: string | null; passwordHash?: string | null; googleId: string | null; phone: string | null }): string[] {
  const m: string[] = [];
  if (u.googleId) m.push("Google");
  if (u.passwordHash) m.push("Email");
  if (u.phone) m.push("Telefon");
  return m;
}

export const displayName = (u: { name: string | null; email: string | null; phone: string | null; id: number }) =>
  u.name || u.email || (u.phone ? `+${u.phone}` : `#${u.id}`);
