import { permanentRedirect } from "next/navigation";
import { lhref } from "@/i18n/server";

// All fonts are free now — there is no cart. Keep old links/bookmarks working.
export default async function CartPage() {
  permanentRedirect(await lhref("/wishlist"));
}
