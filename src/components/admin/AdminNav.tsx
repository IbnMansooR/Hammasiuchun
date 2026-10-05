"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavGroup = { label: string; items: { href: string; label: string; badge?: number }[] };

export default function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname() ?? "/admin";
  // The longest matching href wins, so "/admin/fonts/upload" doesn't also light up "/admin/fonts".
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  const active = all
    .filter((h) => (h === "/admin" ? pathname === h : pathname === h || pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="adm-nav" aria-label="Admin">
      {groups.map((g) => (
        <div key={g.label} className="adm-nav-group">
          <div className="adm-nav-label">{g.label}</div>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={i.href === active ? "page" : undefined}>
              <span>{i.label}</span>
              {!!i.badge && <span className="adm-badge">{i.badge}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
