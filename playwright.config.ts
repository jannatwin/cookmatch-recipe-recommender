import { defineConfig } from "@playwright/test";

// These specs create accounts and catalog rows, so they only ever run against local Supabase.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(supabaseUrl)) {
  throw new Error("E2E tests need NEXT_PUBLIC_SUPABASE_URL to point at the local Supabase stack (see README).");
}

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 740 } }, testMatch: /journey/ },
  ],
  webServer: {
    // A production build, so the nonce CSP and security headers are exercised too.
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100/api/v1/health",
    timeout: 180_000,
    reuseExistingServer: true,
  },
});
