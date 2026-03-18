import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata = {
  title: "IPL Fantasy Faceoff",
  description: "An IPL fantasy rivalry app tracking lineups, posts, and bragging rights."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
