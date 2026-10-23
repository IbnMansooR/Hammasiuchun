// "Shrift topish": a picture of text + the text → our closest fonts (lib/fontFinder, no AI).
import { NextRequest, NextResponse } from "next/server";
import { FIND_TEXT_MAX, findFonts } from "@/lib/fontFinder";
import { sniffImageFamily } from "@/lib/imagesniff";
import { hasProfanity } from "@/lib/profanity";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;
const REASON: Record<string, string> = {
  image: "Rasmni oʻqib boʻlmadi. PNG, JPG yoki WebP yuboring.",
  text: `Rasmdagi matnni yozing (kamida 2 harf, ${FIND_TEXT_MAX} belgigacha).`,
  letters: "Rasmda bitta qator matn topilmadi. Faqat matnning oʻzini kesib, aniqroq rasm yuboring.",
};

export async function POST(req: NextRequest) {
  if (overLimit("find-font", req.headers, Number(process.env.FIND_LIMIT ?? 8), 60_000)) return tooManyRequests(60);
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: REASON.image }, { status: 400 }); }
  const file = form.get("image");
  const text = String(form.get("text") ?? "").slice(0, 80);
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: REASON.image }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (!["png", "jpeg", "webp"].includes(sniffImageFamily(buf) ?? "")) return NextResponse.json({ error: REASON.image }, { status: 400 });
  if (hasProfanity(text)) return NextResponse.json({ error: "Bunday soʻzlarni yozib boʻlmaydi." }, { status: 400 });
  const r = await findFonts(buf, text);
  if (!r.ok) return NextResponse.json({ error: REASON[r.reason] }, { status: 422 });
  return NextResponse.json({ mode: r.mode, fonts: r.fonts });
}
