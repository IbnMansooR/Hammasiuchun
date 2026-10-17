// Designer profiles from open data: the facts come from Wikidata (CC0), the portrait from
// Wikimedia Commons, and only when its licence lets us show it with credit (CC BY, CC BY-SA, CC0,
// public domain). The text is our own, built from the facts; nothing is copied from Wikipedia
// articles. The API addresses can be pointed at a stand-in for tests.
import { putUpload } from "./storage";
import { slugify } from "./fontmeta";

const UA = "FeekrBot/1.0 (https://feekrfont.uz; admin@feekrfont.uz) design-profiles";
const WD_API = process.env.WIKIDATA_API || "https://www.wikidata.org/w/api.php";
const COMMONS_API = process.env.COMMONS_API || "https://commons.wikimedia.org/w/api.php";
const MAX_IMAGE = 3_000_000;

/** Wikidata couldn't be asked right now (network, or it asked us to slow down for good). Not "no such person". */
export class WikiUnavailable extends Error {}

/** GET JSON, politely: a proper user agent, a short wait and retry when Wikimedia says "slow down". */
async function getJson<T>(base: string, params: Record<string, string>): Promise<T | null> {
  const url = `${base}${base.includes("?") ? "&" : "?"}${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
      if (res.status === 429 || res.status === 503) {
        const wait = Math.min(4000, (Number(res.headers.get("retry-after")) || 1) * 1000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }
  return null;
}

/* ---------------- words in Uzbek ---------------- */

/** English Wikidata labels of design-related occupations → Uzbek. Only these make a person a "designer" here. */
const ROLE_UZ: Record<string, string> = {
  "graphic designer": "grafik dizayner",
  "graphic artist": "grafik rassom",
  "typographer": "tipograf",
  "type designer": "shrift dizayneri",
  "typeface designer": "shrift dizayneri",
  "type founder": "shrift quyuvchi",
  "punchcutter": "harf kesuvchi (punchcutter)",
  "printer": "bosmachi",
  "letterer": "harf rassomi",
  "lettering artist": "harf rassomi",
  "calligrapher": "xattot",
  "designer": "dizayner",
  "industrial designer": "sanoat dizayneri",
  "art director": "art-direktor",
  "illustrator": "illyustrator",
  "poster artist": "plakat rassomi",
  "logo designer": "logotip dizayneri",
  "book designer": "kitob dizayneri",
  "interior designer": "interyer dizayneri",
  "web designer": "veb-dizayner",
  "product designer": "mahsulot dizayneri",
};

const COUNTRY_UZ: Record<string, string> = {
  "United States of America": "AQSh", "United States": "AQSh", Germany: "Germaniya", Switzerland: "Shveytsariya", "United Kingdom": "Buyuk Britaniya",
  France: "Fransiya", Italy: "Italiya", Netherlands: "Niderlandiya", Poland: "Polsha", Japan: "Yaponiya", Russia: "Rossiya", "Soviet Union": "SSSR",
  "Russian Empire": "Rossiya imperiyasi", Austria: "Avstriya", "Czech Republic": "Chexiya", Czechoslovakia: "Chexoslovakiya", Hungary: "Vengriya",
  Denmark: "Daniya", Sweden: "Shvetsiya", Finland: "Finlyandiya", Norway: "Norvegiya", Canada: "Kanada", Brazil: "Braziliya", Argentina: "Argentina",
  Mexico: "Meksika", Spain: "Ispaniya", India: "Hindiston", Turkey: "Turkiya", Uzbekistan: "Oʻzbekiston", Kazakhstan: "Qozogʻiston", Ukraine: "Ukraina",
  Belgium: "Belgiya", Australia: "Avstraliya", Israel: "Isroil", China: "Xitoy", "South Korea": "Janubiy Koreya", Iran: "Eron", Egypt: "Misr",
  Greece: "Gretsiya", Portugal: "Portugaliya", Ireland: "Irlandiya", Lithuania: "Litva", Latvia: "Latviya", Estonia: "Estoniya", Croatia: "Xorvatiya",
  Serbia: "Serbiya", Yugoslavia: "Yugoslaviya", Romania: "Ruminiya", Bulgaria: "Bolgariya", Slovenia: "Sloveniya", "Republic of Venice": "Venetsiya respublikasi",
  "Kingdom of Italy": "Italiya", "German Empire": "Germaniya", "Weimar Republic": "Germaniya", "Nazi Germany": "Germaniya", "West Germany": "Germaniya",
  "East Germany": "Germaniya", "Austria-Hungary": "Avstriya-Vengriya", "Kingdom of France": "Fransiya", "Kingdom of Great Britain": "Buyuk Britaniya",
};

/* ---------------- Wikidata ---------------- */

type Claim = { mainsnak?: { datavalue?: { value?: unknown } } };
type Entity = {
  id: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, { title: string }>;
};

const idsOf = (e: Entity, p: string): string[] =>
  (e.claims?.[p] ?? []).flatMap((c) => {
    const v = c.mainsnak?.datavalue?.value as { id?: string } | undefined;
    return v?.id ? [v.id] : [];
  });
const strOf = (e: Entity, p: string): string | null => {
  const v = e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
  return typeof v === "string" ? v : null;
};
const yearOf = (e: Entity, p: string): number | null => {
  const v = e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined;
  const m = /^([+-])(\d{4})/.exec(v?.time ?? "");
  return m ? (m[1] === "-" ? -1 : 1) * Number(m[2]) : null;
};

export type Candidate = { id: string; label: string; description: string };

/** Wikidata entries matching a name (most relevant first). Throws WikiUnavailable. */
export async function searchPeople(name: string): Promise<Candidate[]> {
  const r = await getJson<{ search?: { id: string; label?: string; description?: string }[] }>(WD_API, {
    action: "wbsearchentities", search: name.slice(0, 80), language: "en", uselang: "en", type: "item", limit: "6",
  });
  if (!r) throw new WikiUnavailable("search");
  return (r.search ?? []).map((s) => ({ id: s.id, label: s.label ?? s.id, description: s.description ?? "" }));
}

export type DesignerFacts = {
  wikidataId: string;
  name: string;
  slug: string;
  born: number | null;
  died: number | null;
  country: string | null;
  roles: string[];
  knownFor: string[];
  wikiUrl: string | null;
  website: string | null;
  imageFile: string | null;
};

/** The facts of one person, or null when it isn't a person or isn't a designer of some kind.
 * Throws WikiUnavailable when Wikidata couldn't be asked. */
export async function designerFacts(qid: string): Promise<DesignerFacts | null> {
  if (!/^Q\d{1,12}$/.test(qid)) return null;
  const r = await getJson<{ entities?: Record<string, Entity> }>(WD_API, {
    action: "wbgetentities", ids: qid, props: "claims|labels|sitelinks", languages: "en|uz|ru", sitefilter: "uzwiki|ruwiki|enwiki",
  });
  if (!r) throw new WikiUnavailable("entity");
  const e = r.entities?.[qid];
  if (!e || !idsOf(e, "P31").includes("Q5")) return null; // a human being
  const related = [...new Set([...idsOf(e, "P106"), ...idsOf(e, "P27").slice(0, 1), ...idsOf(e, "P800").slice(0, 8)])];
  const lab = related.length
    ? await getJson<{ entities?: Record<string, Entity> }>(WD_API, { action: "wbgetentities", ids: related.join("|"), props: "labels", languages: "en|uz" })
    : null;
  if (related.length && !lab) throw new WikiUnavailable("labels");
  const en = (id: string) => lab?.entities?.[id]?.labels?.en?.value ?? null;
  const uz = (id: string) => lab?.entities?.[id]?.labels?.uz?.value ?? null;
  const roles = [...new Set(idsOf(e, "P106").flatMap((id) => {
    const l = en(id)?.toLowerCase();
    return l && ROLE_UZ[l] ? [ROLE_UZ[l]] : [];
  }))].slice(0, 4);
  if (roles.length === 0) return null;
  const countryId = idsOf(e, "P27")[0];
  const countryEn = countryId ? en(countryId) : null;
  const country = countryEn ? COUNTRY_UZ[countryEn] ?? uz(countryId!) ?? countryEn : null;
  const name = e.labels?.en?.value ?? e.labels?.uz?.value ?? Object.values(e.labels ?? {})[0]?.value;
  if (!name) return null;
  const site = (lang: string) => e.sitelinks?.[`${lang}wiki`]?.title;
  const wikiLang = site("uz") ? "uz" : site("ru") ? "ru" : site("en") ? "en" : null;
  const website = strOf(e, "P856");
  return {
    wikidataId: qid,
    name,
    slug: slugify(name),
    born: yearOf(e, "P569"),
    died: yearOf(e, "P570"),
    country,
    roles,
    knownFor: idsOf(e, "P800").flatMap((id) => (en(id) ? [en(id)!] : [])).slice(0, 6),
    wikiUrl: wikiLang ? `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(site(wikiLang)!.replace(/ /g, "_"))}` : null,
    website: website && /^https:\/\//.test(website) ? website.slice(0, 300) : null,
    imageFile: strOf(e, "P18"),
  };
}

/** The profile text, from the facts only. The admin can rewrite it. */
export function designerSummary(f: Pick<DesignerFacts, "name" | "born" | "died" | "country" | "roles" | "knownFor">): string {
  const years = f.born ? `${f.born}–${f.died ?? ""}`.replace(/–$/, "") : "";
  const lived = f.born && !f.died ? ` (${f.born} yilda tugʻilgan)` : years ? ` (${years})` : "";
  return [
    `${f.name}${lived} — ${f.roles.join(", ")}.`,
    f.country ? `Mamlakati: ${f.country}.` : null,
    f.knownFor.length ? `Mashhur ishlari: ${f.knownFor.join(", ")}.` : null,
  ].filter(Boolean).join(" ");
}

/* ---------------- Wikimedia Commons ---------------- */

export type Portrait = { thumb: string; credit: string; source: string };

const FREE_LICENCE = /^(cc[ -]by(?![ -](nc|nd))|cc[ -]by-sa(?![ -](nc|nd))|cc0|public domain|pd\b|attribution)/i;

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&(amp|lt|gt|quot|#39);/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }[m] ?? m)).replace(/\s+/g, " ").trim();

/** The picture's address, author and licence, if its licence lets us show it with credit. */
export async function portraitInfo(file: string): Promise<Portrait | null> {
  const r = await getJson<{ query?: { pages?: { imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string; mime?: string; extmetadata?: Record<string, { value?: string }> }[] }[] } }>(COMMONS_API, {
    action: "query", titles: `File:${file}`, prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "900", iiextmetadatafilter: "LicenseShortName|Artist|NonFree|Credit",
  });
  const info = r?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) return null;
  const meta = info.extmetadata ?? {};
  const licence = text(meta.LicenseShortName?.value ?? "");
  if (!licence || meta.NonFree?.value === "true" || !FREE_LICENCE.test(licence)) return null;
  const artist = text(meta.Artist?.value ?? "").slice(0, 120);
  const thumb = info.thumburl ?? info.url;
  // https only (a stand-in server for tests may use http)
  if (!thumb || !(/^https:\/\//.test(thumb) || (process.env.COMMONS_API && /^http:\/\/127\.0\.0\.1[:/]/.test(thumb)))) return null;
  return { thumb, credit: `${artist || "Muallif nomaʼlum"}, ${licence}`, source: info.descriptionurl ?? "" };
}

/** Download the portrait and keep it on our storage; null when it isn't an acceptable picture. */
export async function savePortrait(p: Portrait, slug: string): Promise<string | null> {
  try {
    const res = await fetch(p.thumb, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/jpeg" ? "jpg" : null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!ext || buf.length === 0 || buf.length > MAX_IMAGE) return null;
    return await putUpload(`designer-${slug}-${Date.now().toString(36)}.${ext}`, buf, type);
  } catch {
    return null;
  }
}

/* ---------------- picking ---------------- */

/** Well-known designers and type designers. Each is looked up and verified on Wikidata when it is its turn. */
export const SEED_NAMES = [
  "Paul Rand", "Saul Bass", "Milton Glaser", "Massimo Vignelli", "Paula Scher", "Stefan Sagmeister", "Neville Brody", "David Carson",
  "Alan Fletcher", "Josef Müller-Brockmann", "Armin Hofmann", "Adrian Frutiger", "Max Miedinger", "Hermann Zapf", "Matthew Carter", "Eric Gill",
  "Jan Tschichold", "Herb Lubalin", "Paul Renner", "Giambattista Bodoni", "Claude Garamond", "Aldus Manutius", "John Baskerville", "Erik Spiekermann",
  "Zuzana Licko", "Susan Kare", "Ellen Lupton", "Ivan Chermayeff", "Tom Geismar", "Chip Kidd", "Jessica Hische", "Dieter Rams", "Karl Gerstner",
  "Wim Crouwel", "Piet Zwart", "El Lissitzky", "Alexander Rodchenko", "László Moholy-Nagy", "Herbert Bayer", "Lucian Bernhard", "Alphonse Mucha",
  "Ikko Tanaka", "Shigeo Fukuda", "Yusaku Kamekura", "Kenya Hara", "Tadanori Yokoo", "Roman Cieślewicz", "Henryk Tomaszewski", "Otl Aicher",
  "Bruno Munari", "Michael Bierut", "Sean Adams", "Gerard Unger", "Robert Slimbach", "Carol Twombly", "Jonathan Hoefler", "Tobias Frere-Jones",
  "Sumner Stone", "Hermann Eidenbenz", "Emil Ruder", "Anton Stankowski", "Lester Beall", "Alvin Lustig", "Cipe Pineles", "Bob Gill",
].filter((v, i, a) => a.indexOf(v) === i);

/** A person worth a profile for this name: the first search hit that is a designer (null: none;
 * throws WikiUnavailable when Wikidata couldn't be asked). */
export async function findDesigner(name: string): Promise<DesignerFacts | null> {
  const hits = await searchPeople(name);
  const wanted = name.toLowerCase();
  // The hit whose label is the name itself first, so a namesake doesn't win.
  const ordered = [...hits.filter((h) => h.label.toLowerCase() === wanted), ...hits.filter((h) => h.label.toLowerCase() !== wanted)].slice(0, 3);
  for (const h of ordered) {
    const f = await designerFacts(h.id);
    if (f) return f;
  }
  return null;
}
