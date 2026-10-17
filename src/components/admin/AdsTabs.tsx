import Link from "next/link";
import { db } from "@/lib/db";

const TABS = [
  { href: "/admin/ads", label: "Bannerlar" },
  { href: "/admin/ads/requests", label: "Arizalar" },
  { href: "/admin/ads/channel", label: "Kanal postlari" },
  { href: "/admin/ads/offer", label: "Narxlar va promo" },
];

/** The four parts of Admin → Reklama, with the number of unanswered enquiries. */
export default async function AdsTabs({ current }: { current: string }) {
  const fresh = await db.adRequest.count({ where: { status: "new" } }).catch(() => 0);
  return (
    <nav className="adm-filters adm-ads-tabs" aria-label="Reklama boʻlimlari">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`chip${current === t.href ? " active" : ""}`} aria-current={current === t.href ? "page" : undefined}>
          {t.label}
          {t.href === "/admin/ads/requests" && fresh > 0 && <span className="n">{fresh}</span>}
        </Link>
      ))}
    </nav>
  );
}
