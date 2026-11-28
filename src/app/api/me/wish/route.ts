import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { getCurrentUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

const MAX = 500;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const headers = { "Cache-Control": "private, no-store" };

type Item = { slug: string; name: string };

/** The signed-in user's saved families, newest last, limited to ones still on the site. */
async function listFor(userId: number): Promise<Item[]> {
  const rows = await db.wish.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: MAX, select: { slug: true } });
  if (!rows.length) return [];
  const fams = await db.family.findMany({ where: { ...PUBLIC_FAMILY, slug: { in: rows.map((r) => r.slug) } }, select: { slug: true, name: true } });
  const name = new Map(fams.map((f) => [f.slug, f.name]));
  return rows.filter((r) => name.has(r.slug)).map((r) => ({ slug: r.slug, name: name.get(r.slug)! }));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401, headers });
  return NextResponse.json({ items: await listFor(user.id) }, { headers });
}

/** Replace the user's list with the given slugs (unknown or hidden families are dropped). */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401, headers });
  const origin = req.headers.get("origin");
  if (origin) {
    let same = false;
    try { same = new URL(origin).host === req.headers.get("host"); } catch { /* garbage */ }
    if (!same) return NextResponse.json({ error: "origin" }, { status: 403, headers });
  }
  if (Number(req.headers.get("content-length") ?? 0) > 32 * 1024) return NextResponse.json({ error: "size" }, { status: 413, headers });

  const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
  if (!body || !Array.isArray(body.items) || body.items.length > MAX) return NextResponse.json({ error: "bad" }, { status: 400, headers });
  const slugs = [...new Set(body.items.filter((s): s is string => typeof s === "string" && SLUG.test(s)))];

  const valid = slugs.length
    ? (await db.family.findMany({ where: { ...PUBLIC_FAMILY, slug: { in: slugs } }, select: { slug: true } })).map((f) => f.slug)
    : [];
  const keep = new Set(valid);
  await db.$transaction([
    db.wish.deleteMany({ where: { userId: user.id, slug: { notIn: valid } } }),
    // Keep the client's order: rows are created in sequence so createdAt follows it.
    ...slugs.filter((s) => keep.has(s)).map((slug) => db.wish.upsert({ where: { userId_slug: { userId: user.id, slug } }, create: { userId: user.id, slug }, update: {} })),
  ]);
  return NextResponse.json({ items: await listFor(user.id) }, { headers });
}
