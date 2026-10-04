import Link from "next/link";
import { Logo } from "@/components/Logo";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logoutAction } from "../actions";
import AdminNav, { type NavGroup } from "@/components/admin/AdminNav";
import ThemeToggle from "@/components/ThemeToggle";
import { IconArrowUR } from "@/components/Icons";

// Admin is always per-request (auth + live data): never try to prerender it at build.
export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const [newOrders, drafts] = await Promise.all([
    db.order.count({ where: { status: "new" } }),
    db.work.count({ where: { isPublished: false } }),
  ]);

  const groups: NavGroup[] = [
    { label: "Umumiy", items: [{ href: "/admin", label: "Boshqaruv" }] },
    {
      label: "Kontent",
      items: [
        { href: "/admin/fonts", label: "Shriftlar" },
        { href: "/admin/fonts/upload", label: "Shrift yuklash" },
        { href: "/admin/works", label: "Portfolio", badge: drafts },
        { href: "/admin/articles", label: "Maqolalar" },
        { href: "/admin/media", label: "Rasmlar" },
      ],
    },
    {
      label: "Odamlar",
      items: [
        { href: "/admin/users", label: "Foydalanuvchilar" },
        { href: "/admin/notifications", label: "Bildirishnomalar" },
        { href: "/admin/orders", label: "Buyurtmalar", badge: newOrders },
      ],
    },
    { label: "Tizim", items: [{ href: "/admin/settings", label: "Sozlamalar" }] },
  ];

  return (
    <div className="admin-wrap">
      <aside className="admin-side">
        <div className="admin-brand">
          <Link href="/admin" aria-label="Boshqaruv paneli"><Logo className="admin-logo" title="Feekr admin" /></Link>
          <span className="tag">Admin</span>
        </div>
        <AdminNav groups={groups} />
        <div className="admin-foot">
          <div className="admin-foot-row">
            <Link href="/" target="_blank" className="admin-site">Saytni ochish <IconArrowUR /></Link>
            <ThemeToggle />
          </div>
          <form action={logoutAction}>
            <button className="btn btn-sm btn-block">Chiqish · {session.username}</button>
          </form>
        </div>
      </aside>
      <main className="admin-main" id="main">{children}</main>
    </div>
  );
}
