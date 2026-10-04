import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/session";

/** Per-request CSP. Next.js reads the nonce from the request's CSP header and
 * stamps it on its own inline/bootstrap scripts; 'strict-dynamic' lets those
 * load the rest. Inline style attributes/tags (font previews) need
 * 'unsafe-inline' for styles only. */
function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Gate every /admin route on a valid session cookie, EXCEPT the login page/action.
  // This is the real auth boundary — the layout check alone is not re-run on
  // client-side navigations between sibling admin routes.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = await verifyToken(req.cookies.get(COOKIE)?.value);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Always run for admin — including prefetch/RSC requests, or the auth gate could be skipped.
    "/admin/:path*",
    {
      // Pages only — API routes, static files and font/asset folders don't need a CSP nonce.
      source: "/((?!api/|_next/static|_next/image|assets/|fonts/montserrat/|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
