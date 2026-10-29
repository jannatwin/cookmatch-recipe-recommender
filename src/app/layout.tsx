import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CookMatch",
  description: "Recipe recommendations from ingredients you already have.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
