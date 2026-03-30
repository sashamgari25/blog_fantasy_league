"use client";

import { useActionState, useMemo, useState } from "react";
import { createPostAction, deletePostAction, updateAuthorOverviewAction, updatePostAction, updateSharedOverviewAction } from "@/app/actions";
import { InputField, TextareaField } from "@/components/forms";
import { PostEditor } from "@/components/post-editor";

function CreatePostForm({ session, players }) {
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

function SharedOverviewForm({ data }) {
  const [state, formAction, pending] = useActionState(updateSharedOverviewAction, {});

  return (
    <form action={formAction} className="panel">
      <div className="section-header">
        <p className="eyebrow">Shared match info</p>
        <h2 className="section-title">Update fixture and date</h2>
      </div>
      <div className="form-grid">
        <InputField label="Fixture" name="fixture" defaultValue={data.fixture} />
        <InputField label="Journal date" name="journal-date" defaultValue={data.journal.date} />
      </div>
      {state?.error ? <p className="notice">{state.error}</p> : null}
      {state?.success ? <p className="notice success">{state.success}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save shared info"}
      </button>
    </form>
  );
}

function AuthorOverviewForm({ session, players }) {
  const [state, formAction, pending] = useActionState(updateAuthorOverviewAction, {});
  const player = Object.values(players).find((entry) => entry.slug === session.slug);

  if (!player) {
    return null;
  }

  return (
    <form action={formAction} className="panel">
      <div className="section-header">
        <p className="eyebrow">Your side</p>
        <h2 className="section-title">Update {player.teamName}</h2>
      </div>
      <div className="form-grid">
        <InputField label="Name" name="name" defaultValue={player.name} />
        <InputField label="Team name" name="team-name" defaultValue={player.teamName} />
        <InputField label="Style" name="style" defaultValue={player.style} />
        <InputField label="Points" name="points" type="number" defaultValue={player.totalPoints} />
        <InputField label="Captain" name="captain" defaultValue={player.captain} />
        <TextareaField label="Summary" name="summary" defaultValue={player.summary} placeholder="Quick summary for the live scoreboard." />
        <TextareaField label="Bio" name="bio" defaultValue={player.bio} placeholder="Your manager bio on the public page." />
        <label className="fieldBlock fieldBlockWide">
          <span>Current XI</span>
          <textarea className="textarea" name="team" defaultValue={player.team.map((member) => `${member.name} | ${member.role}`).join("\n")} />
          <p className="field-help">Use one player per line in the format `Player Name | Role`.</p>
        </label>
      </div>
      {state?.error ? <p className="notice">{state.error}</p> : null}
      {state?.success ? <p className="notice success">{state.success}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save my side"}
      </button>
    </form>
  );
}

function PostEditorCard({ post, session }) {
  const [state, formAction, pending] = useActionState(updatePostAction, {});
  const [deleteState, deleteFormAction, deletePending] = useActionState(deletePostAction, {});
  const canPin = session.slug === post.authorSlug;

  return (
    <div className="timeline-card">
      <form action={formAction} className="fieldBlock">
        <input type="hidden" name="post-id" value={post.id} />
        <input type="hidden" name="original-slug" value={post.slug} />
        <div className="meta-row">
          <span className="meta-chip">{post.authorSlug}</span>
          <span className="meta-chip">{post.slug}</span>
          {post.pinned ? <span className="meta-chip meta-chip-pinned">📌 Pinned</span> : null}
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
          <span>Summary</span>
          <textarea className="textarea" name="summary" defaultValue={post.summary} />
        </label>
        <label className="fieldBlock">
          <span>Tags</span>
          <input className="field" name="tags" defaultValue={post.tags.join(", ")} />
        </label>
        {canPin ? (
          <label className="fieldBlock fieldCheckbox">
            <span className="fieldCheckboxRow">
              <input type="checkbox" name="pinned" defaultChecked={post.pinned} />
              <span>Pin this post to the top-left slot on your archive</span>
            </span>
            <p className="field-help">Only one of your posts can stay pinned at a time.</p>
          </label>
        ) : null}
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

function EditPostsPanel({ posts, session }) {
  const [query, setQuery] = useState("");
  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return posts;
    }

    return posts.filter((post) =>
      [post.title, post.summary, post.result, post.authorSlug, ...(post.tags || [])].join(" ").toLowerCase().includes(normalized)
    );
  }, [posts, query]);

  return (
    <section className="panel">
      <div className="section-header">
        <p className="eyebrow">Edit published posts</p>
        <h2 className="section-title">Update existing articles</h2>
      </div>
      <label className="fieldBlock" style={{ maxWidth: 460, marginBottom: 20 }}>
        <span>Search posts</span>
        <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, tag, slug, or result" />
      </label>
      <div className="timeline-grid">
        {filteredPosts.length ? filteredPosts.map((post) => <PostEditorCard key={post.id} post={post} session={session} />) : <div className="empty">No posts matched that search.</div>}
      </div>
    </section>
  );
}

function SearchLibraryPanel({ posts }) {
  const [query, setQuery] = useState("");
  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return posts;
    }

    return posts.filter((post) =>
      [post.title, post.summary, post.result, post.authorSlug, ...(post.tags || [])].join(" ").toLowerCase().includes(normalized)
    );
  }, [posts, query]);

  return (
    <section className="panel">
      <div className="section-header">
        <p className="eyebrow">Search library</p>
        <h2 className="section-title">Find any post fast</h2>
      </div>
      <label className="fieldBlock" style={{ maxWidth: 460, marginBottom: 20 }}>
        <span>Search posts</span>
        <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, tag, slug, or result" />
      </label>
      <div className="timeline-grid">
        {filteredPosts.length ? (
          filteredPosts.map((post) => (
            <article className="timeline-card" key={post.id}>
              <div className="meta-row">
                <span className="meta-chip">{post.date}</span>
                <span className="meta-chip">{post.authorSlug}</span>
                <span className="meta-chip">{post.result}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.summary}</p>
            </article>
          ))
        ) : (
          <div className="empty">No posts matched that search.</div>
        )}
      </div>
    </section>
  );
}

const PANEL_META = {
  compose: { eyebrow: "New post", title: "Write today’s update" },
  overview: { eyebrow: "Overview", title: "Edit your side without overwriting the other one" },
  edit: { eyebrow: "Edit posts", title: "Update or delete published articles" },
  search: { eyebrow: "Search library", title: "Find old posts without endless scrolling" }
};

export function DashboardPanels({ session, data, posts }) {
  const [panel, setPanel] = useState(null);

  return (
    <>
      <section className="panel">
        <div className="section-header">
          <p className="eyebrow">Sections</p>
          <h2 className="section-title">Open what you need</h2>
        </div>
        <div className="dashboard-launcher-grid">
          <button className="dashboard-launcher" type="button" onClick={() => setPanel("compose")}>
            <p className="eyebrow">Compose</p>
            <h3>New post</h3>
            <p className="card-copy">Jump straight into today&apos;s article editor.</p>
          </button>
          <button className="dashboard-launcher" type="button" onClick={() => setPanel("overview")}>
            <p className="eyebrow">Overview</p>
            <h3>Update live state</h3>
            <p className="card-copy">Change fixture, points, bios, captains, and both XIs.</p>
          </button>
          <button className="dashboard-launcher" type="button" onClick={() => setPanel("edit")}>
            <p className="eyebrow">Posts</p>
            <h3>Edit published posts</h3>
            <p className="card-copy">Search, edit, and delete older posts without scrolling forever.</p>
          </button>
          <button className="dashboard-launcher" type="button" onClick={() => setPanel("search")}>
            <p className="eyebrow">Library</p>
            <h3>Search archive</h3>
            <p className="card-copy">Quickly look up results, titles, tags, and older matchdays.</p>
          </button>
        </div>
      </section>

      {panel ? (
        <div className="dashboard-modal-shell" onClick={() => setPanel(null)}>
          <div className="dashboard-modal" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-modal-header">
              <div>
                <p className="eyebrow">{PANEL_META[panel].eyebrow}</p>
                <h2 className="section-title">{PANEL_META[panel].title}</h2>
              </div>
              <button className="buttonGhost" type="button" onClick={() => setPanel(null)}>
                Close
              </button>
            </div>

            <div className="dashboard-modal-body">
              {panel === "compose" ? <CreatePostForm session={session} players={data.players} /> : null}
              {panel === "overview" ? (
                <div className="stack">
                  <SharedOverviewForm data={data} />
                  <AuthorOverviewForm session={session} players={data.players} />
                </div>
              ) : null}
              {panel === "edit" ? <EditPostsPanel posts={posts} session={session} /> : null}
              {panel === "search" ? <SearchLibraryPanel posts={posts} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
