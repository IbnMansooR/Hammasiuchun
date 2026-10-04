import { createRemoteJWKSet, jwtVerify } from "jose";

// Hand-rolled OAuth2 authorization-code flow (not Auth.js/next-auth) so Google
// login reuses the same jose-based session cookie the rest of the app already
// has, instead of introducing a second, parallel auth framework.
export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function redirectUri(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${site.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = { googleId: string; email: string | null; emailVerified: boolean; name: string | null };

/** Exchange an authorization code for an ID token and verify it against Google's JWKS. */
export async function exchangeGoogleCode(code: string): Promise<GoogleProfile | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code,
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) return null;

  try {
    const { payload } = await jwtVerify(body.id_token, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    if (!payload.sub) return null;
    return {
      googleId: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : null,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}
