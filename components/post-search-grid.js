"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import Link from "next/link";
import { togglePostLikeAction } from "@/app/actions";
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
                <div className="post-card-actions">
                  <Link className="buttonGhost card-action-white" href={postUrl}>
                    {ctaLabel}
                  </Link>
                  <LikeCardButton postSlug={post.slug} initialLikeCount={post.likeCount || 0} />
                  <ShareCardButton title={post.title} path={postUrl} />
                </div>
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

function LikeCardButton({ postSlug, initialLikeCount }) {
  const formRef = useRef(null);
  const [state, formAction, pending] = useActionState(togglePostLikeAction, {
    likeCount: initialLikeCount,
    likedByViewer: false,
    error: ""
  });
  const [desiredLiked, setDesiredLiked] = useState(false);
  const [optimisticLike, setOptimisticLike] = useOptimistic(
    { likeCount: initialLikeCount, likedByViewer: false },
    (_current, next) => next
  );

  useEffect(() => {
    if (typeof state?.likeCount === "number") {
      setOptimisticLike({
        likeCount: state.likeCount,
        likedByViewer: state.likedByViewer
      });
    }
  }, [setOptimisticLike, state?.likeCount, state?.likedByViewer]);

  useEffect(() => {
    if (pending) {
      return;
    }

    const serverLiked = state?.likedByViewer ?? false;
    if (serverLiked !== desiredLiked) {
      formRef.current?.requestSubmit();
    }
  }, [desiredLiked, pending, state?.likedByViewer]);

  const count = optimisticLike.likeCount;
  const liked = optimisticLike.likedByViewer;

  return (
    <form action={formAction} ref={formRef}>
      <input type="hidden" name="post-slug" value={postSlug} />
      <input type="hidden" name="desired-liked" value={desiredLiked ? "true" : "false"} />
      <button
        className={`buttonGhost share-card-button card-action-white ${liked ? "engagement-button-active" : ""}`}
        type="submit"
        onClick={() => {
          const nextLiked = !liked;
          setDesiredLiked(nextLiked);
          setOptimisticLike({
            likeCount: nextLiked ? count + 1 : Math.max(0, count - 1),
            likedByViewer: nextLiked
          });
        }}
      >
        ♥ {count}
      </button>
    </form>
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
      <button className="buttonGhost share-card-button card-action-white" type="button" onClick={handleShare}>
        Share
      </button>
      {message ? <span className="field-help">{message}</span> : null}
    </div>
  );
}
