// Reading a news feed (RSS 2.0 or Atom): title, link, date and the publisher's own short summary.
// Only that summary, cut short, is ever used, always with the link to the original.

export type FeedItem = { title: string; link: string; date: Date | null; excerpt: string };

const MAX_BYTES = 3_000_000;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d{1,6});/g, (_, n) => String.fromCodePoint(Number(n) > 0x10ffff ? 0xfffd : Number(n)))
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Visible text of a fragment of HTML. */
export function plain(html: string): string {
  const unwrapped = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // The summary is often escaped HTML (&lt;p&gt;): decode once, then drop the tags.
  const once = /&lt;\w/.test(unwrapped) ? decode(unwrapped) : unwrapped;
  return decode(once.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** At most `max` characters, ending at a sentence or a word. */
export function shorten(t: string, max: number): string {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
}

const tag = (block: string, name: string): string | null => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? m[1] : null;
};

function linkOf(block: string): string | null {
  const text = tag(block, "link");
  const raw = text && decode(text).trim();
  if (raw && /^https?:\/\//i.test(raw)) return raw;
  // Atom: <link rel="alternate" href="…"/>
  for (const m of block.matchAll(/<link\s[^>]*>/gi)) {
    const href = /href="([^"]+)"/i.exec(m[0])?.[1];
    const rel = /rel="([^"]+)"/i.exec(m[0])?.[1];
    if (href && (!rel || rel === "alternate")) return decode(href);
  }
  return null;
}

export function parseFeed(xml: string): FeedItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].slice(0, 40).map((m) => m[2]);
  const out: FeedItem[] = [];
  for (const b of blocks) {
    const title = plain(tag(b, "title") ?? "");
    const link = linkOf(b);
    if (!title || !link) continue;
    const when = tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date");
    const d = when ? new Date(plain(when)) : null;
    const summary = tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content:encoded") ?? tag(b, "content") ?? "";
    out.push({ title: title.slice(0, 200), link: link.slice(0, 500), date: d && !Number.isNaN(d.getTime()) ? d : null, excerpt: plain(summary) });
  }
  return out;
}

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "FeekrBot/1.0 (+https://feekrfont.uz)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return [];
    return parseFeed(new TextDecoder().decode(buf));
  } catch {
    return [];
  }
}
