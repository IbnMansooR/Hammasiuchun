// Licence classes (Family.licenseClass) and whether Feekr may give a family away.
// Every font on the site is free; a family is only published/downloadable when
// its licence allows free redistribution — or the owner confirmed the rights
// ("Own" = Feekr's/the designer's own font, "Licensed" = written permission).
import type { Prisma } from "@prisma/client";
import type { Locale } from "@/i18n/config";

export const REDISTRIBUTABLE = ["OFL", "Apache", "Public Domain", "Freeware", "Own", "Licensed"] as const;
export const RESTRICTED = ["Adobe", "Monotype", "Linotype", "Bitstream", "All Rights Reserved", "Shareware", "Unknown"] as const;
export const LICENSE_CLASSES = [...REDISTRIBUTABLE, ...RESTRICTED] as const;

export function isRedistributable(licenseClass: string | null | undefined): boolean {
  return (REDISTRIBUTABLE as readonly string[]).includes(licenseClass ?? "");
}

/** Prisma filter for every public listing: published AND free to redistribute.
 * Enforced in code so restricted families stay off the site even if they are
 * still flagged isPublished in the DB. */
export const PUBLIC_FAMILY = {
  isPublished: true,
  licenseClass: { in: [...REDISTRIBUTABLE] },
} satisfies Prisma.FamilyWhereInput;

export function isPublicFamily(f: { isPublished: boolean; licenseClass: string }): boolean {
  return f.isPublished && isRedistributable(f.licenseClass);
}

/** Shown on the font page and in the ZIP's LITSENZIYA.txt. */
export const LICENSE_NOTE: Record<string, string> = {
  OFL: "SIL Open Font License — bepul, tijoriy loyihalarda ham ishlatish mumkin.",
  Apache: "Apache License 2.0 — bepul, tijoriy loyihalarda ham ishlatish mumkin.",
  "Public Domain": "Jamoat mulki — hech qanday cheklovsiz ishlatish mumkin.",
  Freeware: "Freeware — bepul tarqatiladi.",
  Own: "Muallif tomonidan bepul taqdim etilgan.",
  Licensed: "Muallif ruxsati bilan bepul tarqatiladi.",
};

const LICENSE_NOTE_RU: Record<string, string> = {
  OFL: "SIL Open Font License — бесплатно, можно использовать и в коммерческих проектах.",
  Apache: "Apache License 2.0 — бесплатно, можно использовать и в коммерческих проектах.",
  "Public Domain": "Общественное достояние — можно использовать без ограничений.",
  Freeware: "Freeware — распространяется бесплатно.",
  Own: "Предоставлен автором бесплатно.",
  Licensed: "Распространяется бесплатно с разрешения автора.",
};

export function licenseNote(licenseClass: string, locale: Locale = "uz"): string | undefined {
  return (locale === "ru" ? LICENSE_NOTE_RU : LICENSE_NOTE)[licenseClass];
}

/** Freeware is often "free for personal use" only — say so before people ship it in a product. */
export const FREEWARE_WARNING =
  "Diqqat: freeware shriftlar koʻpincha faqat shaxsiy foydalanish uchun bepul. Tijoriy loyihada ishlatishdan oldin muallif litsenziyasini tekshiring.";

export const FREEWARE_WARNING_RU =
  "Внимание: freeware-шрифты часто бесплатны только для личного использования. Перед коммерческим проектом проверьте лицензию автора.";

/** Admin dropdown labels. */
export const LICENSE_LABEL: Record<string, string> = {
  OFL: "OFL (ochiq)",
  Apache: "Apache (ochiq)",
  "Public Domain": "Public Domain (ochiq)",
  Freeware: "Freeware (bepul, shaxsiy foydalanish bo‘lishi mumkin)",
  Own: "Oʻz shriftimiz / muallif bepul bergan",
  Licensed: "Tarqatish huquqi tasdiqlangan (yozma ruxsat bor)",
  Adobe: "Adobe (tijoriy — chop etib boʻlmaydi)",
  Monotype: "Monotype (tijoriy — chop etib boʻlmaydi)",
  Linotype: "Linotype (tijoriy — chop etib boʻlmaydi)",
  Bitstream: "Bitstream (tijoriy — chop etib boʻlmaydi)",
  "All Rights Reserved": "All Rights Reserved (chop etib boʻlmaydi)",
  Shareware: "Shareware (pullik — chop etib boʻlmaydi)",
  Unknown: "Nomaʼlum (tekshirilmagan — chop etib boʻlmaydi)",
};
