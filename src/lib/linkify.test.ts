import assert from "node:assert/strict";
import { test } from "node:test";
import { linkify } from "./linkify.ts";

test("linkify turns https URLs into link parts and keeps surrounding text", () => {
  assert.deepEqual(linkify("Photo: A, CC BY 2.0 (https://commons.wikimedia.org/wiki/File:X.jpg)"), [
    { text: "Photo: A, CC BY 2.0 (" },
    {
      text: "https://commons.wikimedia.org/wiki/File:X.jpg",
      href: "https://commons.wikimedia.org/wiki/File:X.jpg",
    },
    { text: ")" },
  ]);
  assert.deepEqual(linkify("No link here"), [{ text: "No link here" }]);
});

test("linkify ignores non-https schemes", () => {
  assert.deepEqual(linkify("javascript:alert(1) http://x.test"), [
    { text: "javascript:alert(1) http://x.test" },
  ]);
});
