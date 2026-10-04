"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "./StoreProvider";
import { Logo } from "./Logo";
import ThemeToggle from "./ThemeToggle";
import SearchDialog from "./SearchDialog";
import { IconArrow, IconClose, IconHeart, IconMenu, IconSearch, IconUser } from "./Icons";

const NAV = [
  { href: "/fonts", label: "Shriftlar" },
  { href: "/pairs", label: "Juftliklar" },
  { href: "/blog", label: "Jurnal" },
  { href: "/about", label: "Biz haqimizda" },
];

type HeaderUser = { name: string | null; email: string | null } | null;

export default function Header({ user = null }: { user?: HeaderUser }) {
  const pathname = usePathname() ?? "/";
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const { wish, ready } = useStore();
  const wishN = ready ? wish.length : 0;
  const openSearch = useCallback(() => { setMenu(false); setSearch(true); }, []);
  const closeSearch = useCallback(() => setSearch(false), []);

  // Close the sheet on navigation; lock page scroll while it is open.
  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = menu ? "hidden" : "";
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const current = (href: string) => (pathname === href || pathname.startsWith(href + "/") ? "page" : undefined);

  return (
    <header className="hdr">
      <div className="container hdr-in">
        <Link href="/" className="logo" aria-label="Feekr — bosh sahifa">
          <Logo />
        </Link>
        <nav className="hdr-nav" aria-label="Asosiy">
          {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{n.label}</Link>)}
        </nav>
        <div className="hdr-spacer" />
        <div className="hdr-actions">
          <button type="button" className="hdr-search" onClick={openSearch} aria-label="Shrift qidirish" aria-keyshortcuts="Control+K Meta+K /">
            <IconSearch />
            <span>Shrift qidirish…</span>
            <kbd className="kbd" aria-hidden="true">/</kbd>
          </button>
          <ThemeToggle />
          <Link href="/wishlist" className="icon-btn" aria-label={wishN ? `Sevimlilar (${wishN})` : "Sevimlilar"} aria-current={current("/wishlist")}>
            <IconHeart />
            {wishN > 0 && <span className="count" aria-hidden="true">{wishN}</span>}
          </Link>
          {user ? (
            <Link href="/account" className="icon-btn hide-m" aria-label="Mening kabinetim"><IconUser /></Link>
          ) : (
            <Link href="/login" className="btn btn-sm hide-m">Kirish</Link>
          )}
          <button
            type="button"
            className="icon-btn menu-toggle"
            aria-label={menu ? "Menyuni yopish" : "Menyu"}
            aria-expanded={menu}
            aria-controls="mobile-nav"
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {menu && (
        <div className="mnav" id="mobile-nav">
          <nav className="mnav-links" aria-label="Mobil menyu">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={current(n.href)} onClick={() => setMenu(false)}>
                {n.label} <IconArrow />
              </Link>
            ))}
          </nav>
          <div className="mnav-foot">
            <button type="button" className="btn" onClick={openSearch}><IconSearch className="ico" /> Qidirish</button>
            <Link href={user ? "/account" : "/login"} className="btn" onClick={() => setMenu(false)}>
              <IconUser className="ico" /> {user ? "Mening kabinetim" : "Kirish"}
            </Link>
            {!user && <Link href="/register" className="btn btn-primary" onClick={() => setMenu(false)}>Roʻyxatdan oʻtish</Link>}
          </div>
        </div>
      )}

      <SearchDialog open={search} onOpen={openSearch} onClose={closeSearch} />
    </header>
  );
}
