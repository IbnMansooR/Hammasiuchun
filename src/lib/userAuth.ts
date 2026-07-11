import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { USER_COOKIE, USER_SESSION_MAX_AGE, signUserSession, verifyUserToken } from "./userSession";

export type SessionUser = { id: number; email: string | null; phone: string | null; name: string | null };

// Same timing-safe-ish trick as admin auth: always run a compare so a missing
// account doesn't respond faster than a wrong password (username enumeration).
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8tS8oQ9pQ5m0Zx3aQ2yqA2y0m0K2W";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = await verifyUserToken(store.get(USER_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.uid },
    select: { id: true, email: true, phone: true, name: true },
  });
  return user;
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
