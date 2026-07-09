import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { COOKIE, SESSION_MAX_AGE, signSession, verifyToken } from "./session";

export type Session = { username: string };

// Constant-time-ish dummy hash so that an unknown username costs the same as a
// known one (mitigates username enumeration by response timing).
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8tS8oQ9pQ5m0Zx3aQ2yqA2y0m0K2W";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const admin = await db.admin.findUnique({ where: { username } });
  // Always run a compare (even when the user is missing) to keep timing constant.
  const hash = admin?.passwordHash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  return !!admin && ok;
}

export async function createSession(username: string): Promise<void> {
  const token = await signSession(username);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
