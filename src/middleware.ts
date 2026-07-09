import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/session";

// Gate every /admin route on a valid session cookie, EXCEPT the login page/action.
// This is the real auth boundary — the layout check alone is not re-run on
// client-side navigations between sibling admin routes.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const session = await verifyToken(req.cookies.get(COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
