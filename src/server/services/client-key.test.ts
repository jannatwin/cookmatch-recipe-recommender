import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp, guestClientKey } from "./client-key.ts";

test("clientIp takes the first forwarded address, then x-real-ip", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientIp(new Headers({ "x-real-ip": " 198.51.100.2 " })), "198.51.100.2");
  assert.equal(clientIp(new Headers()), "unknown");
});

test("guestClientKey hashes the address with a salt and never returns the raw IP", () => {
  const key = guestClientKey("203.0.113.7", "salt-a");
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.ok(!key.includes("203.0.113.7"));
  assert.equal(key, guestClientKey("203.0.113.7", "salt-a"));
  assert.notEqual(key, guestClientKey("203.0.113.7", "salt-b"));
  assert.notEqual(key, guestClientKey("203.0.113.8", "salt-a"));
});
