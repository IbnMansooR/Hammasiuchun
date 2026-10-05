import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  SOURCE_COOKIE, SOURCE_COOKIE_MAX_AGE, classifySource, cleanLabel, clientIpOf, deviceOf, isBot, visitorId,
} from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Events the browser may report. Sign-ups are recorded on the server only.
const CLIENT_EVENTS = new Set(["view", "leave", "download", "wish", "prompt_show", "prompt_click", "prompt_dismiss", "ad_view", "ad_click"]);
const MAX_BODY = 2048;
const DAY = 24 * 60 * 60 * 1000;

// Soft per-instance cap per visitor — a cheap brake on someone scripting the endpoint.
const recent = new Map<string, { n: number; t: number }>();
function tooMany(visitor: string): boolean {
  const now = Date.now();
  const r = recent.get(visitor);
  if (!r || now - r.t > 60_000) {
    if (recent.size > 5000) recent.clear();
    recent.set(visitor, { n: 1, t: now });
    return false;
  }
  return ++r.n > 90;
}

const done = (headers?: Record<string, string>) => new NextResponse(null, { status: 204, headers });

export async function POST(req: NextRequest) {
  // Respect Do-Not-Track and Global Privacy Control.
  if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return done();

  const host = req.headers.get("host") ?? "";
  const origin = req.headers.get("origin");
  if (origin) {
    let same = false;
    try { same = new URL(origin).host === host; } catch { /* garbage */ }
    if (!same) return new NextResponse(null, { status: 403 });
  }
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return done();
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return new NextResponse(null, { status: 413 });
  // The owner's own browsing (signed in as admin) is not an audience.
  if (await getSession()) return done();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return new NextResponse(null, { status: 400 });

  const name = typeof body.n === "string" ? body.n : "";
  if (!CLIENT_EVENTS.has(name)) return new NextResponse(null, { status: 400 });
  // Path only: no query string, no fragment, never admin or API.
  const rawPath = typeof body.p === "string" ? body.p.split(/[?#]/)[0] : "";
  if (!rawPath.startsWith("/") || rawPath.length > 200 || /^\/(admin|api)(\/|$)/.test(rawPath)) {
    return new NextResponse(null, { status: 400 });
  }
  let ms: number | null = null;
  if (name === "leave") {
    const n = Number(body.ms);
    if (!Number.isFinite(n) || n < 0) return new NextResponse(null, { status: 400 });
    ms = Math.min(Math.round(n), 30 * 60 * 1000);
  }
  const meta = typeof body.m === "string" && /^[\w./:-]{1,80}$/.test(body.m) ? body.m : null;

  const ip = clientIpOf(req.headers);
  const visitor = visitorId(ip, ua);
  if (tooMany(visitor)) return done();

  // First page of a visit carries the referrer / utm_source; classify it and
  // remember the label in a cookie so later events and sign-ups can be credited.
  let source = cleanLabel(req.cookies.get(SOURCE_COOKIE)?.value) || "";
  let ref: string | null = null;
  let setCookie: string | undefined;
  const hasEntry = typeof body.r === "string" || typeof body.u === "string";
  if (hasEntry) {
    const c = classifySource({
      utm: typeof body.u === "string" ? body.u : null,
      referrer: typeof body.r === "string" ? body.r.slice(0, 500) : null,
      ua,
      ownHost: host.split(":")[0].toLowerCase(),
    });
    ref = c.ref;
    // A direct visit does not erase an earlier known source.
    if (c.source !== "direct" || !source) {
      source = c.source;
      setCookie = `${SOURCE_COOKIE}=${source}; Path=/; Max-Age=${SOURCE_COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
    }
  }
  if (!source) source = classifySource({ ua, ownHost: "" }).source;

  const country = req.headers.get("x-vercel-ip-country");
  const row = {
    name, path: rawPath, visitor, source, ms, ref, meta,
    device: deviceOf(ua),
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
  };
  after(async () => {
    try {
      await db.hit.create({ data: row });
      // Housekeeping: now and then drop rows older than 400 days.
      if (Math.random() < 0.002) await db.hit.deleteMany({ where: { at: { lt: new Date(Date.now() - 400 * DAY) } } });
    } catch { /* analytics must never surface errors */ }
  });
  return done(setCookie ? { "Set-Cookie": setCookie } : undefined);
}
