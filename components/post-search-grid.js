"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { extractFirstImageUrl } from "@/lib/posts";

export function PostSearchGrid({ posts, players, emptyMessage = "No posts matched your search yet.", ctaLabel = "Read post", showPreviewImages = false }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return posts;
    }

    return posts.filter((post) => {
      const author = players ? Object.values(players).find((player) => player.slug === post.authorSlug)?.name || "" : "";
      return [post.title, post.summary, post.result, author, ...(post.tags || [])].join(" ").toLowerCase().includes(normalized);
    });
  }, [players, posts, query]);

  return (
    <div className="post-search-stack">
      <label className="fieldBlock" style={{ maxWidth: 460 }}>
        <span>Search posts</span>
        <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, tag, result, or author" />
      </label>
      <div className="timeline-grid">
        {filtered.length ? (
          filtered.map((post) => {
            const author = players ? Object.values(players).find((player) => player.slug === post.authorSlug) : null;

            return (
              <article className="timeline-card" key={post.id}>
                <div className="meta-row">
                  <span className="meta-chip">{post.date}</span>
                  {author ? <span className="meta-chip">{author.name}</span> : null}
                  <span className="meta-chip">{post.result}</span>
                </div>
                <div>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                </div>
                {showPreviewImages && extractFirstImageUrl(post.content, post.imageUrl || "") ? (
                  <img
                    src={extractFirstImageUrl(post.content, post.imageUrl || "")}
                    alt={post.title}
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 9",
                      objectFit: "cover",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.08)"
                    }}
                  />
                ) : null}
                <div className="tag-row">
                  {post.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <Link className="buttonGhost" href={`/posts/${post.slug}`}>
                  {ctaLabel}
                </Link>
              </article>
            );
          })
        ) : (
          <div className="empty">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
