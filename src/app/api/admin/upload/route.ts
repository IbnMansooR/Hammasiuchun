import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { fail, parseImage, sameOrigin, storeImage } from "@/lib/imageUpload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await getSession())) return fail("Avval admin sifatida kiring.", 401);
  if (!sameOrigin(req)) return fail("Notoʻgʻri manba.", 403);
  const parsed = await parseImage(req);
  if (!parsed.ok) return parsed.response;
  return Response.json(await storeImage(parsed.image));
}
