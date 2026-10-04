// Small stroke icon set (24px grid, inherits currentColor).
type P = { className?: string; style?: React.CSSProperties };
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconSearch = (p: P) => <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
export const IconHeart = (p: P) => <svg {...base} {...p}><path d="M12 20.2s-7.6-4.6-9.3-9.4C1.6 7.6 3.6 4.5 6.9 4.5c2 0 3.6 1.1 5.1 2.9 1.5-1.8 3.1-2.9 5.1-2.9 3.3 0 5.3 3.1 4.2 6.3-1.7 4.8-9.3 9.4-9.3 9.4Z" /></svg>;
export const IconUser = (p: P) => <svg {...base} {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.2c.9-3.8 3.9-5.7 7.5-5.7s6.6 1.9 7.5 5.7" /></svg>;
export const IconMenu = (p: P) => <svg {...base} {...p}><path d="M4 8h16M4 16h16" /></svg>;
export const IconClose = (p: P) => <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconArrow = (p: P) => <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const IconArrowUR = (p: P) => <svg {...base} {...p}><path d="M7 17 17 7M8 7h9v9" /></svg>;
export const IconChevron = (p: P) => <svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>;
export const IconSun = (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></svg>;
export const IconMoon = (p: P) => <svg {...base} {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>;
export const IconGrid = (p: P) => <svg {...base} {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></svg>;
export const IconList = (p: P) => <svg {...base} {...p}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>;
export const IconDownload = (p: P) => <svg {...base} {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></svg>;
export const IconCopy = (p: P) => <svg {...base} {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 5.5A2 2 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 1.5 2" /></svg>;
export const IconReset = (p: P) => <svg {...base} {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></svg>;
