import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { USER_COOKIE, USER_SESSION_MAX_AGE, signUserSession, verifyUserToken } from "./userSession";

export type SessionUser = { id: number; email: string | null; phone: string | null; name: string | null };

// Same timing-safe-ish trick as admin auth: always run a compare so a missing
// account doesn't respond faster than a wrong password (username enumeration).
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8tS8oQ9pQ5m0Zx3aQ2yqA2y0m0K2W";

export type Restriction = { until: Date | null; reason: string | null };

/** A block with no end date lasts until an admin lifts it; a suspension ends by itself. */
export function activeRestriction(u: { blockedAt: Date | null; blockedUntil: Date | null; blockReason?: string | null }): Restriction | null {
  if (!u.blockedAt) return null;
  if (u.blockedUntil && u.blockedUntil <= new Date()) return null;
  return { until: u.blockedUntil, reason: u.blockReason ?? null };
}

/** Where a restricted sign-in attempt is sent; the login page explains it. */
export function blockedLoginUrl(r: Restriction): string {
  return r.until ? `/login?error=blocked&until=${encodeURIComponent(r.until.toISOString())}` : "/login?error=blocked";
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = await verifyUserToken(store.get(USER_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.uid },
    select: { id: true, email: true, phone: true, name: true, blockedAt: true, blockedUntil: true },
  });
  // A block takes effect on the very next request, even for an open session.
  if (!user || activeRestriction(user)) return null;
  return { id: user.id, email: user.email, phone: user.phone, name: user.name };
}

/**
 * The single entry point for signing a user in (password, SMS, Google, reset).
 * Returns the restriction instead of creating a session for a blocked account.
 */
export async function startUserSession(userId: number): Promise<Restriction | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { blockedAt: true, blockedUntil: true, blockReason: true },
  });
  if (!user) return { until: null, reason: null };
  const r = activeRestriction(user);
  if (r) return r;
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  await createUserSession(userId);
  return null;
}

export async function unreadNotifications(userId: number): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function createUserSession(userId: number): Promise<void> {
  const token = await signUserSession(userId);
  const store = await cookies();
  store.set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE,
  });
}

export async function destroyUserSession(): Promise<void> {
  const store = await cookies();
  store.delete(USER_COOKIE);
}

export async function verifyUserPassword(email: string, password: string): Promise<number | null> {
  const user = await db.user.findUnique({ where: { email } });
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  return user && ok ? user.id : null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
