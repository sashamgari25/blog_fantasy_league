import { renderArticleMarkdown } from "@/lib/posts";

export function MarkdownContent({ content }) {
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderArticleMarkdown(content) }} />;
}
