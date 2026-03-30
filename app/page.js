import Link from "next/link";
import { getLeagueData, sortPosts } from "@/lib/db";
import { buildAbsoluteUrl } from "@/lib/site";
import { PostSearchGrid } from "@/components/post-search-grid";
import { SiteShell, TopNav } from "@/components/site-shell";

export const metadata = {
  description: "Follow both managers, track current XIs, join the private reader league, and read daily IPL fantasy updates.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "IPL Fantasy Faceoff",
    description: "Follow both managers, track current XIs, join the private reader league, and read daily IPL fantasy updates.",
    url: buildAbsoluteUrl("/")
  },
  twitter: {
    title: "IPL Fantasy Faceoff",
    description: "Follow both managers, track current XIs, join the private reader league, and read daily IPL fantasy updates."
  }
};

export default async function HomePage() {
  const data = await getLeagueData();
  const posts = sortPosts(data.posts);
  const user = data.players.user;
  const friend = data.players.friend;
  const lead = user.totalPoints - friend.totalPoints;
  const leader = lead === 0 ? "Level" : lead > 0 ? user.name : friend.name;

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Matchday journal</p>
            <h2 className="headline" style={{ fontSize: "clamp(1.65rem, 3.5vw, 2.6rem)", lineHeight: 1.08 }}>
              Two fantasy teams
              <br />
              One running story
            </h2>
            <div className="league-callout">
              <p className="eyebrow">Private league for blog readers</p>
              <div className="meta-row">
                <span className="meta-chip">League code</span>
                <strong>7B40KD0110@1</strong>
              </div>
            </div>
            <p className="subhead">
              Follow both managers, track the live race for bragging rights, and join the conversation with a reader profile or a
              guest comment on every article.
            </p>
          </div>
          <div className="player-card">
            <p className="eyebrow">Rivalry status</p>
            <div className="rivalry-status-grid">
              <div>
                <span className="meta-label">Leader</span>
                <h3 className="rivalry-stat-value">{leader}</h3>
              </div>
              <div>
                <span className="meta-label">Lead margin</span>
                <h3 className="rivalry-stat-value">{lead === 0 ? "0 pts" : `${Math.abs(lead)} pts`}</h3>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="stack">
        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Live scoreboard</p>
            <h2 className="section-title">Today&apos;s battle</h2>
          </div>
          <div className="battle-round-strip">
            <span className="meta-label">Current round</span>
            <strong className="battle-round-title">{data.fixture}</strong>
            <span className="card-copy">Matchday date: {data.journal.date}</span>
          </div>
          <div className="battle-grid">
            <article className="score-card accent">
              <p className="meta-label">{user.name}</p>
              <h3 className="score-value">{user.totalPoints}</h3>
              <p className="card-copy">{user.summary}</p>
            </article>
            <article className="score-card">
              <p className="meta-label">{friend.name}</p>
              <h3 className="score-value">{friend.totalPoints}</h3>
              <p className="card-copy">{friend.summary}</p>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Managers</p>
            <h2 className="section-title">Both sides of the rivalry</h2>
          </div>
          <div className="card-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {[user, friend].map((player) => (
              <article className="post-card" key={player.slug}>
                <div>
                  <p className="eyebrow">{player.teamName}</p>
                  <h3>{player.name}</h3>
                  <p className="card-copy">{player.bio}</p>
                </div>
                <div className="meta-row">
                  <span className="meta-chip">{player.style}</span>
                  <span className="meta-chip">Captain: {player.captain}</span>
                </div>
                <ul className="list">
                  {player.team.map((member) => (
                    <li key={`${player.slug}-${member.name}`}>
                      <span>{member.name}</span>
                      <span className="meta-label">{member.role}</span>
                    </li>
                  ))}
                </ul>
                <Link className="buttonGhost" href={`/history/${player.slug}`}>
                  View full history
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Community</p>
            <h2 className="section-title">Join the blog chat</h2>
          </div>
          <div className="score-grid">
            <article className="score-card">
              <p className="meta-label">Reader profiles</p>
              <h3 style={{ margin: "8px 0 10px" }}>Claim a username</h3>
              <p className="card-copy">Make a reader profile so your comments always show up under your own name and your mentions land in one place.</p>
              <Link className="buttonGhost" href="/login">
                Create profile
              </Link>
            </article>
            <article className="score-card">
              <p className="meta-label">Guest reactions</p>
              <h3 style={{ margin: "8px 0 10px" }}>Comment without signing up</h3>
              <p className="card-copy">Just here to react to a captain pick or a meltdown post? You can still jump into any thread as a guest.</p>
            </article>
            <article className="score-card">
              <p className="meta-label">Reply chain</p>
              <h3 style={{ margin: "8px 0 10px" }}>Reply and tag other readers</h3>
              <p className="card-copy">Tag other readers with `@username`, keep the banter going, and follow the conversation across every article.</p>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="section-header">
            <p className="eyebrow">Latest posts</p>
            <h2 className="section-title">Every update gets its own page</h2>
          </div>
          <PostSearchGrid posts={posts} players={data.players} showPreviewImages />
        </section>
      </main>
    </SiteShell>
  );
}
