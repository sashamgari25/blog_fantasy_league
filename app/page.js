import Link from "next/link";
import { getLeagueData, sortPosts } from "@/lib/db";
import { PostSearchGrid } from "@/components/post-search-grid";
import { SiteShell, TopNav } from "@/components/site-shell";

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
            <div className="score-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <span className="meta-label">Leader</span>
                <h3 style={{ margin: "8px 0" }}>{leader}</h3>
              </div>
              <div>
                <span className="meta-label">Lead margin</span>
                <h3 style={{ margin: "8px 0" }}>{lead === 0 ? "0 pts" : `${Math.abs(lead)} pts`}</h3>
              </div>
              <div>
                <span className="meta-label">Next fixture</span>
                <strong>{data.fixture}</strong>
              </div>
              <div>
                <span className="meta-label">Owners</span>
                <strong>{data.publishing.owners.join(" and ")}</strong>
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
          <div className="score-grid">
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
            <article className="score-card">
              <p className="meta-label">Current round</p>
              <h3 style={{ margin: "8px 0 10px" }}>{data.fixture}</h3>
              <p className="card-copy">Matchday date: {data.journal.date}</p>
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
            <h2 className="section-title">Read, react, and pick a side</h2>
          </div>
          <div className="score-grid">
            <article className="score-card">
              <p className="meta-label">Reader profiles</p>
              <h3 style={{ margin: "8px 0 10px" }}>Claim a username</h3>
              <p className="card-copy">Create a fan profile to keep your own name across comments and follow the rivalry day by day.</p>
              <Link className="buttonGhost" href="/login">
                Create profile
              </Link>
            </article>
            <article className="score-card">
              <p className="meta-label">Guest reactions</p>
              <h3 style={{ margin: "8px 0 10px" }}>Comment without signing up</h3>
              <p className="card-copy">Every post now has an open comment thread, so readers can react even if they just drop in.</p>
            </article>
            <article className="score-card">
              <p className="meta-label">Reply chain</p>
              <h3 style={{ margin: "8px 0 10px" }}>Reply and tag other readers</h3>
              <p className="card-copy">Replies stay threaded, and `@username` mentions land in a reader inbox so conversations don&apos;t get lost.</p>
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
