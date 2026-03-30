"use client";

import { useActionState, useMemo, useState } from "react";
import { togglePostLikeAction } from "@/app/actions";

export function PostEngagement({ postSlug, postTitle, initialLikeCount, initialLikedByViewer, isSignedIn }) {
  const [shareMessage, setShareMessage] = useState("");
  const [likeState, formAction, pending] = useActionState(togglePostLikeAction, {
    likeCount: initialLikeCount,
    likedByViewer: initialLikedByViewer,
    error: ""
  });

  const count = useMemo(() => likeState?.likeCount ?? initialLikeCount, [initialLikeCount, likeState?.likeCount]);
  const liked = useMemo(() => likeState?.likedByViewer ?? initialLikedByViewer, [initialLikedByViewer, likeState?.likedByViewer]);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
          url
        });
        setShareMessage("Shared.");
        return;
      } catch {
        // Fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied.");
    } catch {
      setShareMessage("Couldn’t copy the link.");
    }
  }

  return (
    <div className="engagement-row">
      <form action={formAction}>
        <input type="hidden" name="post-slug" value={postSlug} />
        <button className={`buttonGhost engagement-button ${liked ? "engagement-button-active" : ""}`} type="submit" disabled={pending}>
          ♥ {count}
        </button>
      </form>
      <button className="buttonGhost engagement-button" type="button" onClick={handleShare}>
        Share
      </button>
      {!isSignedIn ? <span className="field-help">Sign in to like posts.</span> : null}
      {likeState?.error ? <span className="field-help">{likeState.error}</span> : null}
      {shareMessage ? <span className="field-help">{shareMessage}</span> : null}
    </div>
  );
}
