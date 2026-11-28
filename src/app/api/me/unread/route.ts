import { getCurrentUser, unreadNotifications } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

// Polled by the header bell after client-side navigations (the shared layout
// that rendered the first count does not re-render on soft navigation).
export async function GET() {
  const user = await getCurrentUser();
  const unread = user ? await unreadNotifications(user.id) : 0;
  return Response.json({ unread }, { headers: { "Cache-Control": "private, no-store" } });
}
