import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { SiteShell, TopNav } from "@/components/site-shell";
import { requireSignedInSession } from "@/lib/auth";
import { getInboxNotifications, markAllNotificationsRead } from "@/lib/db";

export default async function InboxPage() {
  const session = await requireSignedInSession();
  await markAllNotificationsRead(session.slug);
  const notifications = await getInboxNotifications(session.slug);

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
        <div style={{ marginTop: 28 }}>
          <p className="eyebrow">Inbox</p>
          <h2 className="headline" style={{ fontSize: "clamp(1.85rem, 4vw, 3rem)", marginTop: 12 }}>
            Mentions and replies
          </h2>
          <p className="subhead">
            Every time someone tags `@{session.username || session.slug}` or replies to one of your comments, it shows up here.
          </p>
        </div>
      </header>

      <main className="stack">
        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Activity</p>
            <h2 className="section-title">Your latest alerts</h2>
          </div>
          <div className="comments-list">
            {notifications.length ? (
              notifications.map((notification) => (
                <article className="comment-card" key={notification.id}>
                  <div className="meta-row">
                    <span className="meta-chip">{notification.type === "mention" ? "Mention" : "Reply"}</span>
                    <span className="meta-chip">{new Date(notification.createdAt).toLocaleString()}</span>
                    {notification.readAt ? <span className="meta-chip">Read</span> : <span className="tag">Unread</span>}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 8px" }}>{notification.message}</h3>
                    <p className="card-copy" style={{ margin: 0 }}>
                      {notification.type === "reply" ? "New reply on your thread." : "Someone tagged you in the comments."}
                    </p>
                  </div>
                  <div className="meta-row">
                    <Link className="buttonGhost" href={`/posts/${notification.postSlug}`}>
                      Open article
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">No alerts yet. Once people reply to you or tag your username, they’ll appear here.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Account</p>
            <h2 className="section-title">Reader session</h2>
          </div>
          <div className="meta-row">
            <span className="meta-chip">{session.author}</span>
            <span className="meta-chip">@{session.username || session.slug}</span>
          </div>
          <form action={logoutAction} style={{ marginTop: 18 }}>
            <button className="buttonGhost" type="submit">
              Sign out
            </button>
          </form>
        </section>
      </main>
    </SiteShell>
  );
}
