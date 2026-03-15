import Link from "next/link";
import { getSession } from "@/lib/auth";

export function SiteShell({ children }) {
  return <div className="shell">{children}</div>;
}

export async function TopNav() {
  const session = await getSession();

  return (
    <div className="nav">
      <div className="brand">
        <span className="brand-mark">FF</span>
        <div>
          <p className="eyebrow">IPL Fantasy League</p>
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
        {session ? (
          <Link className="buttonLink" href="/dashboard">
            Dashboard
          </Link>
        ) : (
          <Link className="buttonLink" href="/login">
            Author Login
          </Link>
        )}
      </div>
    </div>
  );
}
