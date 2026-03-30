"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import { addCommentAction, deleteCommentAction, toggleCommentLikeAction } from "@/app/actions";

export function CommentsSection({ comments, postSlug, session }) {
  const [replyTarget, setReplyTarget] = useState(null);
  const [state, formAction, pending] = useActionState(addCommentAction, {});
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  return (
    <section className="panel">
      <div className="section-header">
        <p className="eyebrow">Comments</p>
        <h2 className="section-title">Join the match chat</h2>
      </div>

      <form action={formAction} className="comment-form">
        <input type="hidden" name="post-slug" value={postSlug} />
        <input type="hidden" name="parent-comment-id" value={replyTarget?.id || ""} />
        {session ? (
          <p className="field-help">
            Commenting as {session.author}
            {session.username ? ` (@${session.username})` : ""}.
          </p>
        ) : (
          <p className="field-help">Commenting as Guest. Sign in if you want your own username and inbox notifications.</p>
        )}
        {replyTarget ? (
          <div className="reply-banner">
            <span>Replying to {replyTarget.authorName}{replyTarget.authorUsername ? ` (@${replyTarget.authorUsername})` : ""}</span>
            <button className="buttonGhost card-action-white" type="button" onClick={() => setReplyTarget(null)}>
              Cancel reply
            </button>
          </div>
        ) : null}
        <label className="fieldBlock fieldBlockWide">
          <span>Your comment</span>
          <textarea
            className="textarea"
            name="body"
            placeholder={replyTarget ? "Write your reply. Use @username if you want them notified in their inbox." : "Back your captain, call out a transfer, or tag another reader with @username."}
            required
          />
        </label>
        {state?.error ? <p className="notice">{state.error}</p> : null}
        {state?.success ? <p className="notice success">{state.success}</p> : null}
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Posting..." : replyTarget ? "Post reply" : "Post comment"}
        </button>
      </form>

      <div className="comments-list">
        {commentTree.length ? (
          commentTree.map((comment) => (
            <CommentThread key={comment.id} comment={comment} level={0} onReply={setReplyTarget} postSlug={postSlug} canModerate={session?.role === "author"} />
          ))
        ) : (
          <div className="empty">No comments yet. Be the first to react to this article.</div>
        )}
      </div>
    </section>
  );
}

function CommentThread({ comment, level, onReply, postSlug, canModerate }) {
  const formRef = useRef(null);
  const [likeState, likeFormAction, likePending] = useActionState(toggleCommentLikeAction, {
    commentId: comment.id,
    likeCount: comment.likeCount || 0,
    likedByViewer: comment.likedByViewer || false,
    error: ""
  });
  const [desiredLiked, setDesiredLiked] = useState(comment.likedByViewer || false);
  const [optimisticLike, setOptimisticLike] = useOptimistic(
    { likeCount: comment.likeCount || 0, likedByViewer: comment.likedByViewer || false },
    (_current, next) => next
  );

  useEffect(() => {
    if (likeState?.commentId === comment.id && typeof likeState?.likeCount === "number") {
      setOptimisticLike({
        likeCount: likeState.likeCount,
        likedByViewer: likeState.likedByViewer
      });
    }
  }, [comment.id, likeState?.commentId, likeState?.likeCount, likeState?.likedByViewer, setOptimisticLike]);

  useEffect(() => {
    if (likePending) {
      return;
    }

    const serverLiked = likeState?.commentId === comment.id ? likeState.likedByViewer : comment.likedByViewer || false;
    if (serverLiked !== desiredLiked) {
      formRef.current?.requestSubmit();
    }
  }, [comment.id, comment.likedByViewer, desiredLiked, likePending, likeState?.commentId, likeState?.likedByViewer]);

  const likeCount = optimisticLike.likeCount;
  const likedByViewer = optimisticLike.likedByViewer;

  return (
    <article className="comment-card" style={{ marginLeft: level ? Math.min(level * 20, 40) : 0 }}>
      <div className="meta-row">
        <span className={comment.authorRole === "author" ? "meta-chip meta-chip-author" : comment.authorRole === "reader" ? "meta-chip meta-chip-reader" : "meta-chip"}>
          {comment.authorName}
          {comment.authorUsername ? ` @${comment.authorUsername}` : ""}
        </span>
        <span className="meta-chip">{new Date(comment.createdAt).toLocaleString()}</span>
      </div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{comment.body}</p>
      <div className="meta-row">
        <button className="buttonGhost card-action-white" type="button" onClick={() => onReply(comment)}>
          Reply
        </button>
        <form action={likeFormAction} ref={formRef}>
          <input type="hidden" name="comment-id" value={comment.id} />
          <input type="hidden" name="post-slug" value={postSlug} />
          <input type="hidden" name="desired-liked" value={desiredLiked ? "true" : "false"} />
          <button
            className={`buttonGhost engagement-button card-action-white ${likedByViewer ? "engagement-button-active" : ""}`}
            type="submit"
            onClick={() => {
              const nextLiked = !likedByViewer;
              setDesiredLiked(nextLiked);
              setOptimisticLike({
                likeCount: nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1),
                likedByViewer: nextLiked
              });
            }}
          >
            ♥ {likeCount}
          </button>
        </form>
        {canModerate ? (
          <form action={deleteCommentAction}>
            <input type="hidden" name="comment-id" value={comment.id} />
            <input type="hidden" name="post-slug" value={postSlug} />
            <button className="buttonGhost buttonGhostDanger" type="submit">
              Delete
            </button>
          </form>
        ) : null}
      </div>
      {comment.replies?.length
        ? comment.replies.map((reply) => (
            <CommentThread key={reply.id} comment={reply} level={level + 1} onReply={onReply} postSlug={postSlug} canModerate={canModerate} />
          ))
        : null}
      {likeState?.error ? <p className="field-help" style={{ margin: 0 }}>{likeState.error}</p> : null}
    </article>
  );
}

function buildCommentTree(comments) {
  const map = new Map(
    comments.map((comment) => [
      comment.id,
      {
        ...comment,
        replies: []
      }
    ])
  );

  const roots = [];
  map.forEach((comment) => {
    if (comment.parentCommentId && map.has(comment.parentCommentId)) {
      map.get(comment.parentCommentId).replies.push(comment);
      return;
    }

    roots.push(comment);
  });

  return roots;
}
