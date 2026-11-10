"use client";

import "./globals.css";
import ErrorPage from "./error";

// Replaces the root layout when it fails. Next.js's built-in 500 page uses inline styles,
// which the CSP in proxy.ts blocks.
export default function GlobalError(props: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong · CookMatch</title>
        <ErrorPage {...props} />
      </body>
    </html>
  );
}
