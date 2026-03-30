"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useState } from "react";
import { togglePostLikeAction } from "@/app/actions";

export function PostEngagement({ postSlug, postTitle, initialLikeCount, initialLikedByViewer, isSignedIn }) {
  const [shareMessage, setShareMessage] = useState("");
  const [likeState, formAction, pending] = useActionState(togglePostLikeAction, {
    likeCount: initialLikeCount,
    likedByViewer: initialLikedByViewer,
    error: ""
  });
  const [optimisticLike, setOptimisticLike] = useOptimistic(
    { likeCount: initialLikeCount, likedByViewer: initialLikedByViewer },
    (current, next) => next
  );

  useEffect(() => {
    if (typeof likeState?.likeCount === "number") {
      setOptimisticLike({
        likeCount: likeState.likeCount,
        likedByViewer: likeState.likedByViewer
      });
    }
  }, [likeState?.likeCount, likeState?.likedByViewer, setOptimisticLike]);

  const count = useMemo(() => optimisticLike.likeCount, [optimisticLike.likeCount]);
  const liked = useMemo(() => optimisticLike.likedByViewer, [optimisticLike.likedByViewer]);

  async function handleShare() {
    const url = window.location.href;

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
        <button
          className={`buttonGhost engagement-button card-action-white ${liked ? "engagement-button-active" : ""}`}
          type="submit"
          disabled={pending}
          onClick={() => {
            if (!isSignedIn) {
              return;
            }

            setOptimisticLike({
              likeCount: liked ? Math.max(0, count - 1) : count + 1,
              likedByViewer: !liked
            });
          }}
        >
          ♥ {count}
        </button>
      </form>
      <button className="buttonGhost engagement-button card-action-white" type="button" onClick={handleShare}>
        Share
      </button>
      {!isSignedIn ? <span className="field-help">Sign in to like posts.</span> : null}
      {likeState?.error ? <span className="field-help">{likeState.error}</span> : null}
      {shareMessage ? <span className="field-help">{shareMessage}</span> : null}
    </div>
  );
}
