import type { Metadata } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import { connection } from "next/server";
import { LocaleProvider } from "@/components/locale-provider";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import "./globals.css";

// Bangla glyphs. next/font self-hosts the files (CSP font-src 'self'), and the Bengali
// unicode-range means English pages only fetch it when Bangla text is on screen.
const bangla = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bangla",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: "CookMatch", description: t("meta.description") };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The CSP in proxy.ts uses a per-request nonce, which Next.js can only apply to
  // dynamically rendered pages. A prerendered page's scripts would all be blocked.
  await connection();
  const locale = await getLocale();

  return (
    <html lang={locale} className={bangla.variable}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
