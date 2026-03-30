"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { extractFirstImageUrl } from "@/lib/posts";

export function PostSearchGrid({
  posts,
  players,
  emptyMessage = "No posts matched your search yet.",
  ctaLabel = "Read post",
  showPreviewImages = false,
  pageSize = null,
  prioritizePinned = false
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [query]);

  const ordered = useMemo(() => {
    if (!prioritizePinned) {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      if (Boolean(left.pinned) !== Boolean(right.pinned)) {
        return left.pinned ? -1 : 1;
      }

      return new Date(right.date) - new Date(left.date);
    });
  }, [filtered, prioritizePinned]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(ordered.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visiblePosts = pageSize ? ordered.slice((currentPage - 1) * pageSize, currentPage * pageSize) : ordered;

  return (
    <div className="post-search-stack">
      <label className="fieldBlock" style={{ maxWidth: 460 }}>
        <span>Search posts</span>
        <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, tag, result, or author" />
      </label>
      <div className="timeline-grid">
        {visiblePosts.length ? (
          visiblePosts.map((post) => {
            const author = players ? Object.values(players).find((player) => player.slug === post.authorSlug) : null;
            const postUrl = `/posts/${post.slug}`;

            return (
              <article
                className={`timeline-card ${author?.slug === "nischal" ? "rivalry-card rivalry-card-nischal" : author?.slug === "shreyas" ? "rivalry-card rivalry-card-shreyas" : ""}`}
                key={post.id}
              >
                <div className="meta-row">
                  <span className="meta-chip">{post.date}</span>
                  {author ? <span className="meta-chip">{author.name}</span> : null}
                  <span className="meta-chip">{post.result}</span>
                  {post.pinned ? <span className="meta-chip meta-chip-pinned">📌 Pinned pick</span> : null}
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
                <Link className="buttonGhost" href={postUrl}>
                  {ctaLabel}
                </Link>
                <ShareCardButton title={post.title} path={postUrl} />
              </article>
            );
          })
        ) : (
          <div className="empty">{emptyMessage}</div>
        )}
      </div>
      {pageSize && ordered.length > pageSize ? (
        <div className="pagination-row">
          <button className="buttonGhost pagination-button" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            ← Previous
          </button>
          <span className="meta-chip">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="buttonGhost pagination-button"
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ShareCardButton({ title, path }) {
  const [message, setMessage] = useState("");

  async function handleShare() {
    const url = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      setMessage("Couldn’t copy the link.");
    }
  }

  return (
    <div className="share-card-stack">
      <button className="buttonGhost share-card-button" type="button" onClick={handleShare}>
        Share
      </button>
      {message ? <span className="field-help">{message}</span> : null}
    </div>
  );
}
