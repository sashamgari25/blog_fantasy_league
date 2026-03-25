import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { SiteShell, TopNav } from "@/components/site-shell";
import { requireSignedInSession } from "@/lib/auth";
import { getAllCommentActivity, getInboxNotifications, markAllNotificationsRead } from "@/lib/db";

export const metadata = {
  title: "Inbox",
  description: "Follow reader mentions or, if you're an author, the full site comment activity feed.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function InboxPage() {
  const session = await requireSignedInSession();
  await markAllNotificationsRead(session.slug);
  const isAuthor = session.role === "author";
  const [notifications, allComments] = await Promise.all([
    getInboxNotifications(session.slug),
    isAuthor ? getAllCommentActivity() : Promise.resolve([])
  ]);
  const items = isAuthor ? allComments : notifications;

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
        <div style={{ marginTop: 28 }}>
          <p className="eyebrow">Inbox</p>
          <h2 className="headline" style={{ fontSize: "clamp(1.85rem, 4vw, 3rem)", marginTop: 12 }}>
            {isAuthor ? "Comment activity" : "Mentions"}
          </h2>
          <p className="subhead">
            {isAuthor
              ? "As an author you see every new comment across the site, so moderation and reader reactions never get buried."
              : `Every time someone tags @${session.username || session.slug} in the comments, it shows up here.`}
          </p>
        </div>
      </header>

      <main className="stack">
        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Activity</p>
            <h2 className="section-title">{isAuthor ? "Latest comment feed" : "Your latest mentions"}</h2>
          </div>
          <div className="comments-list">
            {items.length ? (
              items.map((item) => (
                <article className="comment-card" key={item.id}>
                  <div className="meta-row">
                    <span className="meta-chip">
                      {isAuthor ? "Comment" : item.type === "mention" ? "Mention" : item.type === "reply" ? "Reply" : "Comment"}
                    </span>
                    <span className="meta-chip">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 8px" }}>{isAuthor ? `${item.authorName}: "${item.body}"` : item.message}</h3>
                    <p className="card-copy" style={{ margin: 0 }}>
                      {isAuthor
                        ? `On ${item.postTitle || item.postSlug}.`
                        : item.type === "mention"
                          ? "Someone tagged you in the comments."
                          : "Fresh comment activity on the article thread."}
                    </p>
                  </div>
                  <div className="meta-row">
                    <Link className="buttonGhost" href={`/posts/${item.postSlug}`}>
                      Open article
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">
                {isAuthor
                  ? "No comment activity yet. New reader reactions and author replies will appear here."
                  : "No alerts yet. Once someone tags your username, it’ll appear here."}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Account</p>
            <h2 className="section-title">{isAuthor ? "Author session" : "Reader session"}</h2>
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
