"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export function LoginForm({ authors }) {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="auth-card" style={{ maxWidth: 560 }}>
      <div className="section-header">
        <p className="eyebrow">Owner access</p>
        <h2 className="section-title">Sign in to publish</h2>
      </div>
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
          <input className="field" name="password" type="password" placeholder="Your author password" required />
        </label>
      </div>
      <p className="field-help">Use your author name plus your private site password to open the publishing dashboard.</p>
      {state?.error ? <p className="notice">{state.error}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Open dashboard"}
      </button>
    </form>
  );
}
