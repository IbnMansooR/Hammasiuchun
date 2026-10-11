"use client";
import { IconMoon, IconSun } from "./Icons";
import { useT } from "@/i18n/client";

export const THEME_KEY = "feekr_theme";

/** Flips between light and dark. The first paint is handled by the inline
 * script in the root layout; both icons render and CSS shows the right one,
 * so server and client markup always match. */
export default function ThemeToggle({ className = "icon-btn" }: { className?: string }) {
  const label = useT().theme;
  function toggle() {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
  }
  return (
    <button type="button" className={className} onClick={toggle} aria-label={label} title={label}>
      <IconMoon className="theme-ico-moon" />
      <IconSun className="theme-ico-sun" />
    </button>
  );
}
