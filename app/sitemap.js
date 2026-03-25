import { getLeagueData } from "@/lib/db";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const data = await getLeagueData();
  const posts = data.posts || [];
  const histories = Object.values(data.players || {});

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date()
    },
    ...histories.map((player) => ({
      url: `${siteUrl}/history/${player.slug}`,
      lastModified: new Date()
    })),
    ...posts.map((post) => ({
      url: `${siteUrl}/posts/${post.slug}`,
      lastModified: new Date(post.date || Date.now())
    }))
  ];
}
