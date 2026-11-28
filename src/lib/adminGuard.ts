import { redirect } from "next/navigation";
import { getSession } from "./auth";

/** For server actions outside src/app/admin/actions.ts (kept out of "use server"
 * modules so it can't be invoked as an action itself). */
export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}
