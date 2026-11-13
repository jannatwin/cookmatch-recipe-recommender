import { createHash } from "node:crypto";

export function clientIp(headers: Headers) {
  // Vercel puts the client address first in x-forwarded-for; fall back for local runs.
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown"
  );
}

// Raw IPs are never stored: the limiter keys on a salted hash.
export function guestClientKey(ip: string, salt: string) {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
