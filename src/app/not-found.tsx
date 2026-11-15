import type { Metadata } from "next";
import Link from "next/link";
import { buttonPrimary, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found · CookMatch" };

// Replaces Next.js's built-in 404 page, whose inline styles are blocked by the CSP in proxy.ts.
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 py-10 text-cocoa">
      <div className="w-full max-w-lg">
        <EmptyState
          title="We couldn’t find that page"
          description="It may have moved, or the link may be wrong."
          action={
            <Link href="/" className={buttonPrimary}>
              Back to CookMatch
            </Link>
          }
        />
      </div>
    </main>
  );
}
