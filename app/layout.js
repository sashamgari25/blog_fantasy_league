import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const siteUrl = getSiteUrl();
const siteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "IPL Fantasy Faceoff",
      url: siteUrl,
      description: "Track the IPL Fantasy Faceoff rivalry with daily posts, current XIs, reader comments, and matchday reactions."
    },
    {
      "@type": "Organization",
      name: "IPL Fantasy Faceoff",
      url: siteUrl,
      email: "iplfantasyfaceoff@gmail.com",
      sameAs: ["https://www.instagram.com/iplfantasyfaceoff/", "https://x.com/IPLFaceoff"]
    }
  ]
};

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IPL Fantasy Faceoff",
    template: "%s | IPL Fantasy Faceoff"
  },
  description: "Track the IPL Fantasy Faceoff rivalry with daily posts, current XIs, reader comments, and matchday reactions.",
  applicationName: "IPL Fantasy Faceoff",
  keywords: [
    "IPL fantasy",
    "fantasy cricket blog",
    "IPL Fantasy Faceoff",
    "fantasy league updates",
    "cricket fantasy rivalry"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "IPL Fantasy Faceoff",
    description: "Daily IPL fantasy updates from two friends chasing bragging rights one matchday at a time.",
    siteName: "IPL Fantasy Faceoff"
  },
  twitter: {
    card: "summary_large_image",
    title: "IPL Fantasy Faceoff",
    description: "Daily IPL fantasy updates from two friends chasing bragging rights one matchday at a time."
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }} />
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "vzp873npjd");
          `}
        </Script>
        <Analytics />
      </body>
    </html>
  );
}
