"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "./StoreProvider";

const NAV = [
  { href: "/fonts", label: "Barcha shriftlar" },
  { href: "/pairs", label: "Juftliklar" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "Biz haqimizda" },
];

function CountIcon({ href, label, count, children }: { href: string; label: string; count: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="iconbtn"
      aria-label={count > 0 ? `${label} (${count})` : label}
      style={{ position: "relative" }}
    >
      {children}
      {count > 0 && (
        <span aria-hidden="true" style={{
          position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, padding: "0 4px",
          background: "var(--accent)", color: "#fff", borderRadius: 999, fontSize: 10.5, fontWeight: 700,
          display: "grid", placeItems: "center", lineHeight: 1,
        }}>{count}</span>
      )}
    </Link>
  );
}

type HeaderUser = { name: string | null; email: string | null } | null;

export default function Header({ user = null }: { user?: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const { wish, ready } = useStore();
  const wishN = ready ? wish.length : 0;

  return (
    <header className="hdr">
      <div className="container hdr-in">
        <Link href="/" className="logo" onClick={() => setOpen(false)}>
          <img src="/assets/logo-header.png" alt="Feekr" width={101} height={26} />
        </Link>
        <nav>
          {NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
        </nav>
        <div className="spacer" />
        <div className="actions">
          <Link href="/fonts" className="iconbtn hdr-search" aria-label="Qidiruv">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <CountIcon href="/wishlist" label="Sevimlilar" count={wishN}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>
          </CountIcon>
          {user ? (
            <Link href="/account" className="iconbtn" aria-label="Mening kabinetim">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            </Link>
          ) : (
            <Link href="/login" className="btn btn-sm" style={{ marginLeft: 2 }}>Kirish</Link>
          )}
          <button
            className="iconbtn menu-toggle"
            aria-label="Menyu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="container" style={{ paddingBottom: 16 }}>
          <nav id="mobile-nav" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                style={{ padding: "10px 0", fontSize: 16, borderBottom: "1px solid var(--line)" }}>
                {n.label}
              </Link>
            ))}
            <Link href={user ? "/account" : "/login"} onClick={() => setOpen(false)}
              style={{ padding: "10px 0", fontSize: 16, borderBottom: "1px solid var(--line)" }}>
              {user ? "Mening kabinetim" : "Kirish / Roʻyxatdan oʻtish"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
