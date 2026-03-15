"use client";

import { useActionState } from "react";
import { createPostAction, deletePostAction, updateOverviewAction, updatePostAction } from "@/app/actions";
import { InputField, TextareaField } from "@/components/forms";
import { PostEditor } from "@/components/post-editor";

export function CreatePostForm({ session, players }) {
  const [state, formAction, pending] = useActionState(createPostAction, {});
  const matchingPlayer = Object.values(players).find((player) => player.slug === session.slug);

  return (
    <form action={formAction} className="panel">
      <div className="section-header">
        <p className="eyebrow">New post</p>
        <h2 className="section-title">Publish as {session.author}</h2>
      </div>
      <p className="muted-copy">
        This writes a new article for {matchingPlayer?.teamName || session.author} and immediately makes it public.
      </p>
      <div className="form-grid">
        <InputField label="Title" name="title" placeholder="The captaincy call that changed everything" />
        <InputField label="Result" name="result" placeholder="Won by 12 pts" />
        <TextareaField label="Summary" name="summary" placeholder="One short paragraph for cards and SEO descriptions." />
        <label className="fieldBlock fieldBlockWide">
          <span>Tags</span>
          <input className="field" name="tags" placeholder="Captain punt, Differential, MI stack" />
        </label>
        <PostEditor name="content" />
      </div>
      {state?.error ? <p className="notice">{state.error}</p> : null}
      {state?.success ? <p className="notice success">{state.success}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Publishing..." : "Publish post"}
      </button>
    </form>
  );
}

export function OverviewForm({ data }) {
  const [state, formAction, pending] = useActionState(updateOverviewAction, {});

  return (
    <form action={formAction} className="panel">
      <div className="section-header">
        <p className="eyebrow">Dashboard controls</p>
        <h2 className="section-title">Update the live rivalry overview</h2>
      </div>
      <div className="form-grid">
        <InputField label="Fixture" name="fixture" defaultValue={data.fixture} />
        <InputField label="Journal date" name="journal-date" defaultValue={data.journal.date} />
        {Object.values(data.players).map((player) => (
          <div className="fieldBlock" key={player.slug}>
            <span>{player.name} overview</span>
            <input className="field" name={`${player.slug}-name`} defaultValue={player.name} />
            <input className="field" name={`${player.slug}-team-name`} defaultValue={player.teamName} />
            <input className="field" name={`${player.slug}-style`} defaultValue={player.style} />
            <input className="field" name={`${player.slug}-points`} type="number" defaultValue={player.totalPoints} />
            <input className="field" name={`${player.slug}-captain`} defaultValue={player.captain} />
            <textarea className="textarea" name={`${player.slug}-summary`} defaultValue={player.summary} />
            <textarea className="textarea" name={`${player.slug}-bio`} defaultValue={player.bio} />
            <textarea
              className="textarea"
              name={`${player.slug}-team`}
              defaultValue={player.team.map((member) => `${member.name} | ${member.role}`).join("\n")}
            />
            <p className="field-help">Use one player per line in the format `Player Name | Role`.</p>
          </div>
        ))}
      </div>
      {state?.error ? <p className="notice">{state.error}</p> : null}
      {state?.success ? <p className="notice success">{state.success}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save overview"}
      </button>
    </form>
  );
}

function PostEditorCard({ post }) {
  const [state, formAction, pending] = useActionState(updatePostAction, {});
  const [deleteState, deleteFormAction, deletePending] = useActionState(deletePostAction, {});

  return (
    <div className="timeline-card">
      <form action={formAction} className="fieldBlock">
        <input type="hidden" name="post-id" value={post.id} />
        <input type="hidden" name="original-slug" value={post.slug} />
        <div className="meta-row">
          <span className="meta-chip">{post.authorSlug}</span>
          <span className="meta-chip">{post.slug}</span>
        </div>
        <label className="fieldBlock">
          <span>Title</span>
          <input className="field" name="title" defaultValue={post.title} />
        </label>
        <label className="fieldBlock">
          <span>Date</span>
          <input className="field" name="date" type="date" defaultValue={post.date} />
        </label>
        <label className="fieldBlock">
          <span>Result</span>
          <input className="field" name="result" defaultValue={post.result} />
        </label>
        <label className="fieldBlock">
          <span>Image URL</span>
          <input className="field" name="image-url" defaultValue={post.imageUrl || ""} placeholder="https://example.com/image.jpg" />
        </label>
        <label className="fieldBlock">
          <span>Summary</span>
          <textarea className="textarea" name="summary" defaultValue={post.summary} />
        </label>
        <label className="fieldBlock">
          <span>Tags</span>
          <input className="field" name="tags" defaultValue={post.tags.join(", ")} />
        </label>
        <PostEditor name="content" defaultValue={post.content} />
        {state?.error ? <p className="notice">{state.error}</p> : null}
        {state?.success ? <p className="notice success">{state.success}</p> : null}
        <button className="buttonGhost" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save article"}
        </button>
      </form>
      <form action={deleteFormAction}>
        <input type="hidden" name="post-id" value={post.id} />
        {deleteState?.error ? <p className="notice">{deleteState.error}</p> : null}
        {deleteState?.success ? <p className="notice success">{deleteState.success}</p> : null}
        <button className="buttonGhost" type="submit" disabled={deletePending} style={{ borderColor: "rgba(255,95,109,0.35)", color: "#ffd6da" }}>
          {deletePending ? "Deleting..." : "Delete post"}
        </button>
      </form>
    </div>
  );
}

export function EditPostsSection({ posts }) {
  return (
    <section className="panel">
      <div className="section-header">
        <p className="eyebrow">Edit published posts</p>
        <h2 className="section-title">Update existing articles</h2>
      </div>
      <div className="timeline-grid">
        {posts.map((post) => (
          <PostEditorCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
