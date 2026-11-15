import assert from "node:assert/strict";
import { test } from "node:test";
import { localized, resolveLocale } from "./config.ts";
import { bn } from "./messages/bn.ts";
import { en, type MessageKey } from "./messages/en.ts";
import { localizeDigits, translate, translatePlural } from "./translate.ts";

test("resolveLocale prefers the saved cookie, then the browser language, then English", () => {
  assert.equal(resolveLocale("bn", "en-US,en;q=0.9"), "bn");
  assert.equal(resolveLocale(undefined, "bn-BD,bn;q=0.9,en;q=0.8"), "bn");
  assert.equal(resolveLocale("fr", "fr-FR,de;q=0.5"), "en");
  assert.equal(resolveLocale(undefined, null), "en");
});

test("localized falls back to English when a Bangla translation is missing", () => {
  assert.equal(localized("bn", "Rice", "ভাত"), "ভাত");
  assert.equal(localized("bn", "Rice", null), "Rice");
  assert.equal(localized("bn", "Rice", ""), "Rice");
  assert.equal(localized("en", "Rice", "ভাত"), "Rice");
});

test("numbers are shown in Bangla digits only in Bangla", () => {
  assert.equal(localizeDigits("1/2 cup, 250 g", "bn"), "১/২ cup, ২৫০ g");
  assert.equal(localizeDigits(2026, "en"), "2026");
});

test("plural messages pick the right form and fill in the count", () => {
  assert.equal(translatePlural("en", "card.ingredients", 1), "1 ingredient");
  assert.match(translatePlural("en", "card.ingredients", 3), /^3 /);
  assert.match(translatePlural("bn", "card.ingredients", 3), /৩/);
});

test("every Bangla message keeps the same placeholders as the English one", () => {
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(en) as MessageKey[]) {
    assert.ok(bn[key]?.trim(), `missing Bangla text for ${key}`);
    assert.deepEqual(placeholders(bn[key]), placeholders(en[key]), `placeholders differ in ${key}`);
  }
  assert.equal(translate("bn", "card.ingredients.other", { count: 5 }).includes("{"), false);
});
