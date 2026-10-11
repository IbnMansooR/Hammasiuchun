// schema.org data that helps Google and Yandex understand the site: who runs it, how to search it
// (sitelinks search box), and for each font a breadcrumb trail and what the font is.
import { SITE_URL } from "./site";
import { CATEGORY_LABEL } from "./fonts";
import { LICENSE_LABEL } from "./license";

const ORG_ID = `${SITE_URL}/#organization`;

export function siteJsonLd(sameAs: string[]) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Feekr",
      alternateName: ["Feekr shriftlari", "feekrfont.uz"],
      url: `${SITE_URL}/`,
      inLanguage: "uz",
      publisher: { "@id": ORG_ID },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/fonts?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Feekr",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/assets/logo-full.png`,
      ...(sameAs.length ? { sameAs } : {}),
    },
  ];
}

type FontForLd = {
  slug: string; name: string; category: string; styleCount: number; hasCyrillic: boolean;
  designer: string | null; licenseClass: string; licenseUrl: string | null; updatedAt: Date;
};

export function fontJsonLd(f: FontForLd, description: string) {
  const url = `${SITE_URL}/fonts/${f.slug}`;
  const cat = CATEGORY_LABEL[f.category] ?? f.category;
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Feekr", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Shriftlar", item: `${SITE_URL}/fonts` },
        { "@type": "ListItem", position: 3, name: cat, item: `${SITE_URL}/fonts?cat=${encodeURIComponent(f.category)}` },
        { "@type": "ListItem", position: 4, name: f.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": `${url}#font`,
      name: f.name,
      alternateName: `${f.name} shrifti`,
      description,
      url,
      image: `${SITE_URL}/api/tg-image/font/${encodeURIComponent(f.slug)}`,
      genre: `${cat} shrift`,
      keywords: ["shrift", "bepul shrift", "font", cat, f.hasCyrillic ? "kirill shrift" : null, `${f.styleCount} uslub`].filter(Boolean).join(", "),
      inLanguage: "uz",
      isAccessibleForFree: true,
      license: f.licenseUrl || `${SITE_URL}/license`,
      ...(f.designer ? { creator: { "@type": "Person", name: f.designer } } : {}),
      publisher: { "@id": ORG_ID },
      dateModified: f.updatedAt.toISOString(),
      additionalProperty: [{ "@type": "PropertyValue", name: "Litsenziya", value: LICENSE_LABEL[f.licenseClass] ?? f.licenseClass }],
    },
  ];
}

/** "Google HTML tag" / "Yandex meta tag" codes: accept the bare code or the whole pasted <meta> tag. */
export function cleanVerification(raw: string): string {
  const s = raw.trim();
  const fromTag = /content\s*=\s*["']([^"']+)["']/i.exec(s)?.[1] ?? s;
  return /^[A-Za-z0-9_-]{8,100}$/.test(fromTag) ? fromTag : "";
}
