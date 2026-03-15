import { notFound } from "next/navigation";
import Link from "next/link";
import { MarkdownContent } from "@/components/markdown-content";
import { getLeagueData, getPostBySlug } from "@/lib/db";
import { SiteShell, TopNav } from "@/components/site-shell";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} | Fantasy Face-Off`,
    description: post.summary
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const data = await getLeagueData();
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const author = Object.values(data.players).find((player) => player.slug === post.authorSlug);

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
        <div style={{ marginTop: 28 }}>
          <div className="meta-row">
            <span className="meta-chip">{post.date}</span>
            <span className="meta-chip">{author?.name}</span>
            <span className="meta-chip">{post.result}</span>
          </div>
          <h2 className="headline" style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)", marginTop: 18 }}>
            {post.title}
          </h2>
          <p className="subhead">{post.summary}</p>
          <div className="tag-row">
            {post.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="stack">
        <article className="panel">
          <div className="section-header">
            <p className="eyebrow">Article</p>
            <h2 className="section-title">Rivalry notes</h2>
          </div>
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt={post.title}
              style={{
                width: "min(100%, 720px)",
                maxHeight: 420,
                objectFit: "contain",
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.08)",
                margin: "0 auto 20px",
                background: "rgba(255,255,255,0.03)",
                display: "block"
              }}
            />
          ) : null}
          <MarkdownContent content={post.content} />
          {author ? (
            <Link className="buttonGhost" href={`/history/${author.slug}`}>
              More from {author.name}
            </Link>
          ) : null}
        </article>
      </main>
    </SiteShell>
  );
}
