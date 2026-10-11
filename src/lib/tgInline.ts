// Inline mode: in any chat, "@feekrfont_bot mont" lists matching fonts; picking one sends a card
// with the font's preview (the page's link preview) and a button to the site.
import { db } from "./db";
import { CATEGORY_LABEL } from "./fonts";
import { PUBLIC_FAMILY } from "./license";
import { SITE_URL } from "./site";
import { esc, siteLink, tg } from "./telegram";

type InlineQuery = { id: string; query: string; from: { id: number } };

export async function handleInlineQuery(q: InlineQuery): Promise<void> {
  const term = q.query.replace(/\s+/g, " ").trim().slice(0, 40);
  const fams = await db.family.findMany({
    where: { ...PUBLIC_FAMILY, ...(term ? { name: { contains: term, mode: "insensitive" as const } } : {}) },
    orderBy: [{ downloads: "desc" }, { name: "asc" }],
    take: 20,
    select: { slug: true, name: true, category: true, styleCount: true, hasCyrillic: true, tagline: true },
  });
  const results = fams.map((f) => {
    const url = siteLink(`/fonts/${f.slug}`, "inline");
    const about = [CATEGORY_LABEL[f.category] ?? f.category, `${f.styleCount} uslub`, f.hasCyrillic ? "Lotin + Kirill" : null, "bepul"].filter(Boolean).join(" · ");
    return {
      type: "article",
      id: f.slug.slice(0, 64),
      title: f.name,
      description: about,
      thumbnail_url: `${SITE_URL}/api/tg-image/font/${encodeURIComponent(f.slug)}`,
      input_message_content: {
        message_text: `<b>${esc(f.name)}</b>: bepul shrift\n${esc(f.tagline?.trim() || about)}\n\n${url}`,
        parse_mode: "HTML",
        link_preview_options: { url, prefer_large_media: true, show_above_text: true },
      },
      reply_markup: { inline_keyboard: [[{ text: "Koʻrish va yuklab olish", url }]] },
    };
  });
  await tg("answerInlineQuery", {
    inline_query_id: q.id,
    results,
    cache_time: 300,
    ...(results.length === 0 ? { button: { text: "Topilmadi: botda matn yozib koʻring", start_parameter: "search" } } : {}),
  });
}
