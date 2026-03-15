import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/db";

export function SiteShell({ children }) {
  return (
    <div className="shell">
      {children}
      <SiteFooter />
    </div>
  );
}

export async function TopNav() {
  const session = await getSession();
  const unreadCount = session ? await getUnreadNotificationCount(session.slug) : 0;

  return (
    <div className="nav">
      <div className="brand">
        <span className="brand-mark">XI</span>
        <div>
          <p className="eyebrow">IPL Fantasy Rivalry</p>
          <h1 style={{ margin: 0 }}>Fantasy Face-Off</h1>
        </div>
      </div>
      <div className="nav-links">
        <Link className="buttonLink" href="/">
          Home
        </Link>
        <Link className="buttonLink" href="/history/nischal">
          Nischal
        </Link>
        <Link className="buttonLink" href="/history/shreyas">
          Shreyas
        </Link>
        {session?.role === "author" ? (
          <>
            <Link className="buttonLink buttonLinkInbox" href="/inbox">
              Inbox
              {unreadCount ? <span className="nav-dot" aria-label={`${unreadCount} unread notifications`} /> : null}
            </Link>
            <Link className="buttonLink" href="/dashboard">
              Dashboard
            </Link>
          </>
        ) : session?.role === "reader" ? (
          <>
            <Link className="buttonLink buttonLinkInbox" href="/inbox">
              Inbox
              {unreadCount ? <span className="nav-dot" aria-label={`${unreadCount} unread notifications`} /> : null}
            </Link>
            <Link className="buttonLink" href="/login">
              {session.author}
            </Link>
          </>
        ) : (
          <Link className="buttonLink" href="/login">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="brand-mark">XI</span>
          <div>
            <h2 style={{ margin: 0 }}>Fantasy Face-Off</h2>
            <p className="body-copy" style={{ margin: "10px 0 0" }}>
              A running IPL fantasy story between two friends, with reader profiles, open article comments, and daily lineup drama.
            </p>
          </div>
        </div>
        <div>
          <p className="eyebrow">Navigate</p>
          <div className="footer-links">
            <Link href="/">Home</Link>
            <Link href="/history/nischal">Nischal archive</Link>
            <Link href="/history/shreyas">Shreyas archive</Link>
            <Link href="/inbox">Inbox</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow">Contact</p>
          <div className="footer-links">
            <a href="mailto:fantasyfaceoffipl@gmail.com">fantasyfaceoffipl@gmail.com</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer">
              X / Twitter
            </a>
          </div>
        </div>
      </div>
      <p className="footer-note">Built for the season, updated after every fantasy swing.</p>
    </footer>
  );
}
