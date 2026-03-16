import { logoutAction } from "@/app/actions";
import { DashboardPanels } from "@/components/dashboard-forms";
import { PostSearchGrid } from "@/components/post-search-grid";
import { SiteShell, TopNav } from "@/components/site-shell";
import { requireAuthorSession } from "@/lib/auth";
import { getLeagueData, sortPosts } from "@/lib/db";

export default async function DashboardPage() {
  const session = await requireAuthorSession();
  const data = await getLeagueData();
  const posts = sortPosts(data.posts);

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
        <div className="detail-grid" style={{ marginTop: 28 }}>
          <div>
            <p className="eyebrow">Author dashboard</p>
            <h2 className="headline" style={{ fontSize: "clamp(1.95rem, 4vw, 3.1rem)" }}>
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
        <DashboardPanels session={session} data={data} posts={posts} />
        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Recent content</p>
            <h2 className="section-title">Latest published posts</h2>
          </div>
          <PostSearchGrid posts={posts.slice(0, 6)} players={data.players} emptyMessage="No recent posts matched that search." ctaLabel="Open post" />
        </section>
      </main>
    </SiteShell>
  );
}
