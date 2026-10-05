import { permanentRedirect } from "next/navigation";

// All fonts are free now — there is no cart. Keep old links/bookmarks working.
export default function CartPage() {
  permanentRedirect("/wishlist");
}
