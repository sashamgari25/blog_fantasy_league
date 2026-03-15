import { logoutAction } from "@/app/actions";
import { CreatePostForm, EditPostsSection, OverviewForm } from "@/components/dashboard-forms";
import { SiteShell, TopNav } from "@/components/site-shell";
import { requireSession } from "@/lib/auth";
import { getLeagueData, sortPosts } from "@/lib/db";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = getLeagueData();
  const posts = sortPosts(data.posts).slice(0, 6);

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
        <div className="detail-grid" style={{ marginTop: 28 }}>
          <div>
            <p className="eyebrow">Author dashboard</p>
            <h2 className="headline" style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}>
              Welcome back, {session.author}.
            </h2>
            <p className="subhead">
              Keep the rivalry site current from here while the public pages stay readable and search-friendly.
            </p>
          </div>
          <form action={logoutAction} className="detail-card">
            <p className="meta-label">Session</p>
            <p className="body-copy">Signed in as {session.author}. You can publish posts and update the live scoreboard from here.</p>
            <button className="buttonGhost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="stack">
        <CreatePostForm session={session} players={data.players} />
        <OverviewForm data={data} />
        <EditPostsSection posts={posts} />
        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Recent content</p>
            <h2 className="section-title">Latest published posts</h2>
          </div>
          <div className="timeline-grid">
            {posts.map((post) => (
              <article className="timeline-card" key={post.id}>
                <div className="meta-row">
                  <span className="meta-chip">{post.date}</span>
                  <span className="meta-chip">{post.result}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
