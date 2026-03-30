"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import { togglePostLikeAction } from "@/app/actions";

export function PostEngagement({ postSlug, postTitle, initialLikeCount, initialLikedByViewer, isSignedIn }) {
  const [shareMessage, setShareMessage] = useState("");
  const formRef = useRef(null);
  const [likeState, formAction, pending] = useActionState(togglePostLikeAction, {
    likeCount: initialLikeCount,
    likedByViewer: initialLikedByViewer,
    error: ""
  });
  const [desiredLiked, setDesiredLiked] = useState(initialLikedByViewer);
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

  useEffect(() => {
    if (!isSignedIn || pending) {
      return;
    }

    const serverLiked = likeState?.likedByViewer ?? initialLikedByViewer;
    if (serverLiked !== desiredLiked) {
      formRef.current?.requestSubmit();
    }
  }, [desiredLiked, initialLikedByViewer, isSignedIn, likeState?.likedByViewer, pending]);

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
      <form action={formAction} ref={formRef}>
        <input type="hidden" name="post-slug" value={postSlug} />
        <input type="hidden" name="desired-liked" value={desiredLiked ? "true" : "false"} />
        <button
          className={`buttonGhost engagement-button card-action-white ${liked ? "engagement-button-active" : ""}`}
          type="submit"
          disabled={!isSignedIn}
          onClick={() => {
            if (!isSignedIn) {
              return;
            }

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
      <button className="buttonGhost engagement-button card-action-white" type="button" onClick={handleShare}>
        Share
      </button>
      {!isSignedIn ? <span className="field-help">Sign in to like posts.</span> : null}
      {likeState?.error ? <span className="field-help">{likeState.error}</span> : null}
      {shareMessage ? <span className="field-help">{shareMessage}</span> : null}
    </div>
  );
}
