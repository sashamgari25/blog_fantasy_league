import { getSiteUrl } from "@/lib/site";

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/inbox", "/login"]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
