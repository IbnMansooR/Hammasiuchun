import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/userAuth";
import { hit, isLocked } from "@/lib/rateLimit";
import { fail, parseImage, sameOrigin, storeImage } from "@/lib/imageUpload";

export const runtime = "nodejs";

// A member may upload up to 24 images, then is paused for 24 hours (≈ three submissions of eight).
const DAILY_UPLOADS = 24;
const DAY = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ru = req.nextUrl.searchParams.get("lang") === "ru"; // the form on a Russian page asks for Russian errors
  const user = await getCurrentUser(); // null for signed-out and blocked accounts alike
  if (!user) return fail(ru ? "Войдите в аккаунт, чтобы загружать изображения." : "Rasm yuklash uchun hisobingizga kiring.", 401);
  if (!sameOrigin(req)) return fail(ru ? "Неверный источник." : "Notoʻgʻri manba.", 403);
  const key = `upl:${user.id}`;
  if (await isLocked(key)) return fail(ru ? "Дневной лимит загрузок исчерпан. Попробуйте завтра." : "Bugungi yuklash chegarasi tugadi. Ertaga qayta urinib koʻring.", 429);

  const parsed = await parseImage(req, ru);
  if (!parsed.ok) return parsed.response;
  await hit(key, DAILY_UPLOADS, DAY);
  return Response.json(await storeImage(parsed.image, user.id));
}
