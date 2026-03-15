import "./globals.css";

export const metadata = {
  title: "Fantasy Face-Off",
  description: "An IPL fantasy rivalry app tracking lineups, posts, and bragging rights."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
