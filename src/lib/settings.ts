import { db, isBuildPhase } from "./db";

export type SocialLink = { key: string; label: string; url: string; enabled: boolean };
export type SiteSettings = {
  socials: SocialLink[];
  contactEmail: string;
  contactTelegram: string;
};

// Defaults (used until an admin saves overrides).
export const DEFAULT_SETTINGS: SiteSettings = {
  socials: [
    { key: "instagram", label: "Instagram", url: "https://www.instagram.com/ibnmansoor_portfolio/", enabled: true },
    { key: "telegram", label: "Telegram", url: "https://t.me/IbnMansoor_portfolio", enabled: true },
    { key: "twitter", label: "Twitter (X)", url: "", enabled: false },
    { key: "youtube", label: "YouTube", url: "", enabled: false },
  ],
  contactEmail: "jamaibnmansoor@gmail.com",
  contactTelegram: "https://t.me/Feekr_admin",
};

const KEY = "site";

export async function getSiteSettings(): Promise<SiteSettings> {
  let saved: Partial<SiteSettings> = {};
  if (isBuildPhase) return DEFAULT_SETTINGS;
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    if (row) saved = JSON.parse(row.value);
  } catch {
    /* missing table / bad JSON → use defaults */
  }
  // Merge saved values onto defaults so new social keys always appear.
  const socials = DEFAULT_SETTINGS.socials.map((d) => {
    const s = saved.socials?.find((x) => x.key === d.key);
    return s ? { ...d, url: typeof s.url === "string" ? s.url : d.url, enabled: !!s.enabled } : d;
  });
  return {
    socials,
    contactEmail: saved.contactEmail || DEFAULT_SETTINGS.contactEmail,
    contactTelegram: saved.contactTelegram || DEFAULT_SETTINGS.contactTelegram,
  };
}

export async function saveSiteSettings(s: SiteSettings): Promise<void> {
  await db.setting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(s) },
    create: { key: KEY, value: JSON.stringify(s) },
  });
}
