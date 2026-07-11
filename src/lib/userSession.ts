// Edge-safe session primitives for regular (non-admin) users — separate cookie
// and JWT payload shape from the admin session in lib/session.ts, so a user
// login can never be confused with (or escalate into) an admin session.
import { SignJWT, jwtVerify } from "jose";
import { getSecret } from "./session";

export const USER_COOKIE = "feekr_uid";
export const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function signUserSession(userId: number): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyUserToken(token: string | undefined): Promise<{ uid: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const uid = Number(payload.uid);
    if (!Number.isInteger(uid) || uid <= 0) return null;
    return { uid };
  } catch {
    return null;
  }
}
