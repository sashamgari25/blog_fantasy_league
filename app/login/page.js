import { redirect } from "next/navigation";
import { getAllowedAuthors, getSession } from "@/lib/auth";
import { SiteShell, TopNav } from "@/components/site-shell";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const authors = await getAllowedAuthors();

  return (
    <SiteShell>
      <header className="hero">
        <TopNav />
      </header>
      <main className="stack">
        <LoginForm authors={authors} />
      </main>
    </SiteShell>
  );
}
