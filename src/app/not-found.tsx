import Link from "next/link";
import { buttonPrimary, EmptyState } from "@/components/ui";
import { getTranslator, pageMetadata } from "@/lib/i18n/server";

export const generateMetadata = () => pageMetadata("meta.notFound");

// Replaces Next.js's built-in 404 page, whose inline styles are blocked by the CSP in proxy.ts.
export default async function NotFound() {
  const { t } = await getTranslator();
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4 py-10 text-cocoa">
      <div className="w-full max-w-lg">
        <EmptyState
          title={t("notFound.title")}
          description={t("notFound.description")}
          action={
            <Link href="/" className={buttonPrimary}>
              {t("notFound.back")}
            </Link>
          }
        />
      </div>
    </main>
  );
}
