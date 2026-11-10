"use client";

import { useEffect } from "react";
import { buttonPrimary, EmptyState } from "@/components/ui";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("Page error", error instanceof Error ? error.name : "unknown");
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 py-10 text-cocoa">
      <div className="w-full max-w-lg">
        <EmptyState
          title="Something went wrong"
          description="This page could not be shown. Your pantry and recipes are safe."
          action={<button type="button" onClick={() => retry()} className={buttonPrimary}>Try again</button>}
        />
      </div>
    </main>
  );
}
