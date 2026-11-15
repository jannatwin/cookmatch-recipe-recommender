import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "CookMatch",
  description: "Recipe recommendations from ingredients you already have.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The CSP in proxy.ts uses a per-request nonce, which Next.js can only apply to
  // dynamically rendered pages. A prerendered page's scripts would all be blocked.
  await connection();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
