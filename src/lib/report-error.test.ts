import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport } from "./report-error.ts";

test("reports carry the error name and message, capped in length", () => {
  const report = buildReport("error", new TypeError("x".repeat(600)), "/recipes/12");
  assert.equal(report.kind, "error");
  assert.ok(report.message.startsWith("TypeError: xxx"));
  assert.equal(report.message.length, 500);
  assert.ok((report.stack ?? "").length <= 2000);
});

test("reports never include the query string or hash", () => {
  assert.equal(buildReport("boundary", "boom", "/auth/callback?code=secret#frag").path, "/auth/callback");
  assert.equal(buildReport("unhandledrejection", null, "/").message, "Unknown error");
});
