import type { Metadata } from "next";
import { alternates, getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

// The wishlist page is a client component, so its <title> lives here.
export async function generateMetadata(): Promise<Metadata> {
  return { title: DICTS[await getLocale()].wishlist.metaTitle, alternates: await alternates("/wishlist"), robots: { index: false } };
}

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
