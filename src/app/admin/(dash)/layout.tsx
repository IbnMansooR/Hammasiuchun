import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "../actions";

const NAV = [
  { href: "/admin", label: "Boshqaruv" },
  { href: "/admin/orders", label: "Buyurtmalar" },
  { href: "/admin/articles", label: "Maqolalar" },
  { href: "/admin/media", label: "Rasmlar" },
  { href: "/admin/fonts", label: "Shriftlar" },
  { href: "/admin/fonts/upload", label: "Shrift yuklash" },
  { href: "/admin/settings", label: "Sozlamalar" },
];

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return (
    <div className="admin-wrap">
      <aside className="admin-side">
        <div className="brand">
          <img src="/assets/mark.png" alt="" style={{ height: 22 }} /> Feekr
        </div>
        <nav className="adm-nav">
          {NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
        </nav>
        <div style={{ position: "absolute", bottom: 20, left: 18, right: 18 }}>
          <Link href="/" target="_blank" style={{ color: "rgba(255,255,255,.6)", fontSize: 13, display: "block", marginBottom: 10 }}>
            ↗ Saytni ochish
          </Link>
          <form action={logoutAction}>
            <button className="btn btn-light btn-sm" style={{ width: "100%", justifyContent: "center" }}>
              Chiqish ({session.username})
            </button>
          </form>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
