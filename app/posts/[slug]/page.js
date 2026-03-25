import { notFound } from "next/navigation";
import Link from "next/link";
import { CommentsSection } from "@/components/comments-section";
import { MarkdownContent } from "@/components/markdown-content";
import { getCommentsByPostSlug, getLeagueData, getPostBySlug } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildAbsoluteUrl } from "@/lib/site";
import { SiteShell, TopNav } from "@/components/site-shell";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: `/posts/${post.slug}`
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      url: buildAbsoluteUrl(`/posts/${post.slug}`),
      type: "article",
      images: post.imageUrl ? [{ url: post.imageUrl, alt: post.title }] : []
    },
    twitter: {
      title: post.title,
      description: post.summary,
      images: post.imageUrl ? [post.imageUrl] : []
    }
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const [data, post, comments, session] = await Promise.all([
    getLeagueData(),
    getPostBySlug(slug),
    getCommentsByPostSlug(slug),
    getSession()
  ]);

  if (!post) {
    notFound();
  }

  const author = Object.values(data.players).find((player) => player.slug === post.authorSlug);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: author?.name || "IPL Fantasy Faceoff"
    },
    publisher: {
      "@type": "Organization",
      name: "IPL Fantasy Faceoff"
    },
    mainEntityOfPage: buildAbsoluteUrl(`/posts/${post.slug}`),
    image: post.imageUrl ? [post.imageUrl] : undefined
  };

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
          <h2 className="headline" style={{ fontSize: "clamp(1.95rem, 4.2vw, 3.1rem)", marginTop: 18 }}>
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
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

        <CommentsSection comments={comments} postSlug={post.slug} session={session} />
      </main>
    </SiteShell>
  );
}
