import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { getAllowedAuthors, getSession } from "@/lib/auth";
import { SiteShell, TopNav } from "@/components/site-shell";
import { LoginPageForms } from "@/components/login-form";

export const metadata = {
  title: "Sign in",
  description: "Sign in as a reader or author to join the IPL Fantasy Faceoff conversation.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function LoginPage() {
  const session = await getSession();
  if (session?.role === "author") {
    redirect("/dashboard");
  }

  const authors = await getAllowedAuthors();

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
        <div style={{ marginTop: 28 }}>
          <p className="eyebrow">Sign in</p>
          <h2 className="headline" style={{ fontSize: "clamp(1.85rem, 4vw, 3rem)", marginTop: 12 }}>
            One place for readers and authors
          </h2>
          <p className="subhead">
            Readers can sign in, claim a username, reply to comments, and receive inbox alerts when someone tags them with
            `@username`. Authors still keep the publishing dashboard private.
          </p>
        </div>
      </header>
      <main className="stack">
        {session?.role === "reader" ? (
          <form action={logoutAction} className="auth-card" style={{ maxWidth: 560 }}>
            <div className="section-header">
              <p className="eyebrow">Signed in</p>
              <h2 className="section-title">You&apos;re in as {session.author}</h2>
            </div>
            <p className="body-copy">Head back to the articles to comment under your saved username, or open your inbox to catch mentions and replies.</p>
            <div className="meta-row">
              <Link className="buttonGhost" href="/inbox">
                Open inbox
              </Link>
              <button className="buttonGhost" type="submit">
                Sign out
              </button>
            </div>
          </form>
        ) : null}
        <LoginPageForms authors={authors} />
      </main>
    </SiteShell>
  );
}
