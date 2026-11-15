import "server-only";

import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";
import { createTranslator, type MessageKey } from "./translate";

/** The language of the current request, for Server Components and Route Handlers. */
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get("accept-language"));
}

export async function getTranslator() {
  return createTranslator(await getLocale());
}

/** Page metadata with the browser-tab title in the visitor's language. */
export async function pageMetadata(titleKey: MessageKey): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: `${t(titleKey)} · CookMatch` };
}
