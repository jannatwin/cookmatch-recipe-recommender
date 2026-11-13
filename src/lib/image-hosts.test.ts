import assert from "node:assert/strict";
import { test } from "node:test";
import { isOptimizedImageUrl } from "./image-hosts.ts";

test("only https URLs on the allowed hosts are optimised", () => {
  assert.equal(
    isOptimizedImageUrl("https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/X.jpg/960px-X.jpg"),
    true,
  );
  assert.equal(isOptimizedImageUrl("http://thumb.wikimedia.org/x.jpg"), false);
  assert.equal(isOptimizedImageUrl("https://thumb.wikimedia.org.evil.test/x.jpg"), false);
  assert.equal(isOptimizedImageUrl("https://example.com/x.jpg"), false);
  assert.equal(isOptimizedImageUrl("not a url"), false);
});
