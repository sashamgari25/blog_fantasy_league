function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(text) {
  let output = escapeHtml(text);

  output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="markdown-image" />`;
  });
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
  });
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");

  return output;
}

export function renderArticleMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (line.startsWith("> ")) {
      const quotes = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quotes.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(`<blockquote>${quotes.map((item) => renderInline(item)).join("<br />")}</blockquote>`);
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level + 1}>${renderInline(headingMatch[2])}</h${level + 1}>`);
      index += 1;
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim()) {
      paragraph.push(lines[index]);
      index += 1;
    }

    blocks.push(`<p>${renderInline(paragraph.join("<br />"))}</p>`);
  }

  return blocks.join("");
}

export function extractFirstImageUrl(markdown, fallback = "") {
  const imageMatch = markdown.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return imageMatch?.[1] || fallback;
}
