// Stateless password-reset tokens: a short-lived JWT bound to a fingerprint of
// the user's current password hash, so a token stops working as soon as the
// password changes (or after 30 minutes). No DB table/migration needed.
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getSecret } from "./session";

const fingerprint = (passwordHash: string | null) =>
  crypto.createHash("sha256").update(passwordHash ?? "").digest("hex").slice(0, 16);

export async function signResetToken(userId: number, passwordHash: string | null): Promise<string> {
  return new SignJWT({ uid: userId, ph: fingerprint(passwordHash), purpose: "pw-reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(getSecret());
}

/** Returns the user id when the token is valid for this user's current password. */
export async function verifyResetToken(
  token: string,
  lookup: (uid: number) => Promise<{ passwordHash: string | null } | null>,
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.purpose !== "pw-reset") return null;
    const uid = Number(payload.uid);
    if (!Number.isInteger(uid) || uid <= 0) return null;
    const user = await lookup(uid);
    if (!user || payload.ph !== fingerprint(user.passwordHash)) return null;
    return uid;
  } catch {
    return null;
  }
}
