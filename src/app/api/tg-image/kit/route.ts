import { renderKitCard, verifyKitCard } from "@/lib/brandKitCard";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (overLimit("kit-img", req.headers, 60, 10 * 60_000)) return tooManyRequests(300);
  const q = new URL(req.url).searchParams;
  const id = Number(q.get("id")), t = q.get("t") ?? "", s = q.get("s") ?? "";
  if (!Number.isInteger(id) || id <= 0 || t.length > 40 || !verifyKitCard(id, t, s)) return new Response(null, { status: 403 });
  const res = await renderKitCard(id, t).catch(() => null);
  return res ?? new Response(null, { status: 404 });
}
