import { notFound } from "next/navigation";
import { getLeagueData, getPlayerBySlug, sortPosts } from "@/lib/db";
import { buildAbsoluteUrl } from "@/lib/site";
import { PostSearchGrid } from "@/components/post-search-grid";
import { SiteShell, TopNav } from "@/components/site-shell";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);

  if (!player) {
    return {};
  }

  return {
    title: `${player.name} History`,
    description: `Read ${player.name}'s IPL fantasy history, lineup choices, and rivalry posts.`,
    alternates: {
      canonical: `/history/${player.slug}`
    },
    openGraph: {
      title: `${player.name} History`,
      description: `Read ${player.name}'s IPL fantasy history, lineup choices, and rivalry posts.`,
      url: buildAbsoluteUrl(`/history/${player.slug}`)
    },
    twitter: {
      title: `${player.name} History`,
      description: `Read ${player.name}'s IPL fantasy history, lineup choices, and rivalry posts.`
    }
  };
}

export default async function HistoryPage({ params }) {
  const { slug } = await params;
  const data = await getLeagueData();
  const player = await getPlayerBySlug(slug);

  if (!player) {
    notFound();
  }

  const posts = sortPosts(data.posts.filter((post) => post.authorSlug === slug));

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
        <div className="history-hero" style={{ marginTop: 28 }}>
          <div>
            <p className="eyebrow">Manager archive</p>
            <h2 className="headline" style={{ fontSize: "clamp(2rem, 4.6vw, 3.2rem)" }}>
              {player.name}
            </h2>
            <p className="subhead">{player.bio}</p>
          </div>
          <div className={`detail-card rivalry-card ${player.slug === "nischal" ? "rivalry-card-nischal" : "rivalry-card-shreyas"}`}>
            <p className="meta-label">Current profile</p>
            <div className="meta-row" style={{ marginTop: 16 }}>
              <span className="meta-chip">{player.style}</span>
              <span className="meta-chip">{player.totalPoints} pts</span>
              <span className="meta-chip">Captain: {player.captain}</span>
            </div>
            <p className="body-copy">{player.summary}</p>
          </div>
        </div>
      </header>

      <main className="stack">
        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Current XI</p>
            <h2 className="section-title">{player.teamName}</h2>
          </div>
          <ul className="list">
            {player.team.map((member) => (
              <li key={`${player.slug}-${member.name}`}>
                <span>{member.name}</span>
                <span className="meta-label">{member.role}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Posts</p>
            <h2 className="section-title">Every article from {player.name}</h2>
          </div>
          <PostSearchGrid
            posts={posts}
            players={data.players}
            pageSize={6}
            prioritizePinned
            emptyMessage={`No posts matched ${player.name}'s archive yet.`}
            ctaLabel="Open article"
          />
        </section>
      </main>
    </SiteShell>
  );
}
