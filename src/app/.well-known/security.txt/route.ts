// RFC 9116: where to report a security problem with the site.
import { getSiteSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const { contactEmail, contactTelegram } = await getSiteSettings().catch(() => ({ contactEmail: "", contactTelegram: "" }));
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  expires.setUTCHours(0, 0, 0, 0);
  const lines = [
    ...(contactEmail ? [`Contact: mailto:${contactEmail}`] : []),
    ...(/^https:\/\//.test(contactTelegram) ? [`Contact: ${contactTelegram}`] : []),
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: uz, ru, en",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    `Policy: ${SITE_URL}/support`,
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
