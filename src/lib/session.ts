// Edge-safe session primitives (JWT only — no DB/bcrypt imports so this can be
// used from middleware). auth.ts builds the cookie layer on top of this.
import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "feekr_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Resolve the signing secret. Fails closed in production if unset/weak. */
export function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET must be set to a random value of at least 32 characters in production.",
      );
    }
    // Development only — never reached in a production build.
    return new TextEncoder().encode("dev-only-insecure-secret-set-SESSION_SECRET-please");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

/** Verify a token; returns the username or null. Algorithm is pinned to HS256. */
export async function verifyToken(token: string | undefined): Promise<{ username: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload.username) return null;
    return { username: String(payload.username) };
  } catch {
    return null;
  }
}
