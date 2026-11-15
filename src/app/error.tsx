"use client";

import { useEffect } from "react";
import { useI18n } from "@/components/locale-provider";
import { buttonPrimary, EmptyState } from "@/components/ui";
import { reportClientError } from "@/lib/report-error";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("Page error", error instanceof Error ? error.name : "unknown");
    reportClientError("boundary", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 py-10 text-cocoa">
      <div className="w-full max-w-lg">
        <EmptyState
          title={t("error.title")}
          description={t("error.description")}
          action={
            <button type="button" onClick={() => retry()} className={buttonPrimary}>
              {t("common.tryAgain")}
            </button>
          }
        />
      </div>
    </main>
  );
}
