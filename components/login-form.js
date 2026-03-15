"use client";

import { useActionState, useState } from "react";
import { loginAction, readerLoginAction, readerSignupAction } from "@/app/actions";

const MODES = [
  { id: "reader-login", label: "Sign in", eyebrow: "Reader access", title: "Join the comment thread" },
  { id: "reader-signup", label: "Create profile", eyebrow: "New here?", title: "Claim your username" },
  { id: "author-login", label: "Author access", eyebrow: "Writers only", title: "Open the publishing desk" }
];

export function LoginPageForms({ authors }) {
  const [mode, setMode] = useState("reader-login");
  const [readerState, readerAction, readerPending] = useActionState(readerLoginAction, {});
  const [signupState, signupAction, signupPending] = useActionState(readerSignupAction, {});
  const [authorState, authorAction, authorPending] = useActionState(loginAction, {});
  const currentMode = MODES.find((item) => item.id === mode);

  return (
    <section className="panel auth-panel">
      <div className="section-header">
        <p className="eyebrow">{currentMode?.eyebrow}</p>
        <h2 className="section-title">{currentMode?.title}</h2>
      </div>

      <div className="auth-switcher" role="tablist" aria-label="Sign in options">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === mode ? "button" : "buttonGhost"}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === "reader-login" ? (
        <form action={readerAction} className="comment-form">
          <div className="form-grid">
            <label className="fieldBlock">
              <span>Username</span>
              <input className="field" name="username" placeholder="Your username" required />
            </label>
            <label className="fieldBlock">
              <span>Password</span>
              <input className="field" name="password" type="password" placeholder="Your password" required />
            </label>
          </div>
          <p className="field-help">Sign in once and your comments, replies, and inbox mentions will stay tied to your profile.</p>
          {readerState?.error ? <p className="notice">{readerState.error}</p> : null}
          <button className="button" type="submit" disabled={readerPending}>
            {readerPending ? "Signing in..." : "Enter"}
          </button>
        </form>
      ) : null}

      {mode === "reader-signup" ? (
        <form action={signupAction} className="comment-form">
          <div className="form-grid">
            <label className="fieldBlock">
              <span>Display name</span>
              <input className="field" name="name" placeholder="How people will see you" required />
            </label>
            <label className="fieldBlock">
              <span>Username</span>
              <input className="field" name="username" placeholder="Pick a unique username" required />
            </label>
            <label className="fieldBlock">
              <span>Email</span>
              <input className="field" name="email" type="email" placeholder="Optional" />
            </label>
            <label className="fieldBlock">
              <span>Password</span>
              <input className="field" name="password" type="password" placeholder="Create a password" required />
            </label>
          </div>
          <p className="field-help">A profile gives you a stable username, threaded replies, and an inbox when someone tags you with `@username`.</p>
          {signupState?.error ? <p className="notice">{signupState.error}</p> : null}
          <button className="button" type="submit" disabled={signupPending}>
            {signupPending ? "Creating profile..." : "Create profile"}
          </button>
        </form>
      ) : null}

      {mode === "author-login" ? (
        <form action={authorAction} className="comment-form">
          <div className="form-grid">
            <label className="fieldBlock">
              <span>Author</span>
              <select className="select" name="author" defaultValue={authors[0]?.slug}>
                {authors.map((author) => (
                  <option key={author.slug} value={author.slug}>
                    {author.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="fieldBlock">
              <span>Password</span>
              <input className="field" name="password" type="password" placeholder="Author password" required />
            </label>
          </div>
          <p className="field-help">This path is only for Nischal and Shreyas to publish posts, edit lineups, and run the site.</p>
          {authorState?.error ? <p className="notice">{authorState.error}</p> : null}
          <button className="button" type="submit" disabled={authorPending}>
            {authorPending ? "Opening dashboard..." : "Open dashboard"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
