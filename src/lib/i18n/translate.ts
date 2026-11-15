import type { Locale } from "./config.ts";
import { apiMessagesBn, bn } from "./messages/bn.ts";
import { en, type MessageKey } from "./messages/en.ts";

export type { MessageKey };
export type MessageParams = Record<string, string | number>;

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, bn };
const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Shows the digits of a number or quantity ("1/2", "250") in the locale's numerals. */
export function localizeDigits(value: string | number, locale: Locale) {
  const text = String(value);
  return locale === "bn" ? text.replace(/[0-9]/g, (digit) => BANGLA_DIGITS[Number(digit)]) : text;
}

export function translate(locale: Locale, key: MessageKey, params?: MessageParams) {
  return dictionaries[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params?.[name];
    if (value === undefined) return placeholder;
    return typeof value === "number" ? localizeDigits(value, locale) : value;
  });
}

type PluralBase = {
  [Key in MessageKey]: Key extends `${infer Base}.one` ? Base : never;
}[MessageKey];

/** Picks the ".one" or ".other" form of a message for a count, and fills in {count}. */
export function translatePlural(locale: Locale, base: PluralBase, count: number, params?: MessageParams) {
  return translate(locale, `${base}.${count === 1 ? "one" : "other"}`, { ...params, count });
}

const UNKNOWN_INGREDIENT = /^Ingredient '(.+)' was not recognized$/;

/** The JSON API answers in English; show its known messages in the reader's language. */
export function translateApiMessage(locale: Locale, message: string) {
  if (locale !== "bn") return message;
  const unknown = UNKNOWN_INGREDIENT.exec(message);
  if (unknown) return `‘${unknown[1]}’ নামের উপকরণটি চেনা যায়নি`;
  return apiMessagesBn[message] ?? message;
}

export function createTranslator(locale: Locale) {
  return {
    locale,
    t: (key: MessageKey, params?: MessageParams) => translate(locale, key, params),
    plural: (base: PluralBase, count: number, params?: MessageParams) =>
      translatePlural(locale, base, count, params),
    digits: (value: string | number) => localizeDigits(value, locale),
    /** Text for a caught error: the API's message when there is one, otherwise the fallback. */
    errorText: (cause: unknown, fallback: MessageKey) =>
      cause instanceof Error && cause.message
        ? translateApiMessage(locale, cause.message)
        : translate(locale, fallback),
    apiMessage: (message: string) => translateApiMessage(locale, message),
  };
}

export type Translator = ReturnType<typeof createTranslator>;
