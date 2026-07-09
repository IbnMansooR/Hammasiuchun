// Minimal, safe markdown → HTML (headings, bold, italic, links, lists, paragraphs).
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMarkdown(src: string): string {
  const lines = esc(src ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;
  const inline = (t: string) =>
    t
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      // URL excludes whitespace and ")"; combined with esc() escaping quotes,
      // a link can never break out of the href attribute (query "&" survives as
      // the already-escaped "&amp;").
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>',
      );

  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) { closeList(); out.push(`<h3>${inline(line.replace(/^###\s+/, ""))}</h3>`); }
    else if (/^##\s+/.test(line)) { closeList(); out.push(`<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`); }
    else if (/^#\s+/.test(line)) { closeList(); out.push(`<h2>${inline(line.replace(/^#\s+/, ""))}</h2>`); }
    else if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
    }
    else if (line === "") { closeList(); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  return out.join("\n");
}
