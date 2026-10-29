# CookMatch: Debugging Guide

Troubleshooting guide for the selected TypeScript, Next.js App Router, Tailwind CSS and Supabase/PostgreSQL stack. Use browser DevTools, Next.js/Vercel logs and Supabase logs; there is no separate Express backend or custom CookMatch JWT service.

## 1. Debug systematically

1. Reproduce the issue with exact steps and a non-production account.
2. Identify whether it is UI, server action/Route Handler, domain logic, Supabase Auth/RLS, database, or external provider behavior.
3. Inspect the smallest relevant error and trace its request without exposing secrets.
4. Change one cause at a time and verify the original behavior.
5. Record a regression check for the failure.

| Symptom | First place to inspect |
| --- | --- |
| Blank page or hydration error | Browser console and Next.js server output |
| Button/form appears inert | Browser console, form action, pending state and network panel |
| 401 / redirect loop | Supabase SSR cookie flow, auth callback and session validation |
| 403 or empty data | RLS policy, authenticated identity and role provisioning |
| 5xx on Vercel only | Function logs, environment variables, runtime/timeout limits |
| Incorrect score/order | Canonical ingredient links and pure matcher input/output |
| Provider data missing | Adapter logs, quota/status, source mapping and attribution metadata |
| Slow recommendations | Query plan, indexes, catalog size, duplicate provider calls |

## 2. Useful tools

- Browser DevTools Console and Network panel.
- React/Next.js development overlays and TypeScript compiler output.
- Vercel deployment and function logs.
- Supabase Auth, API and Postgres logs; SQL Editor for read-only diagnostics.
- Supabase CLI/local stack where configured.
- Playwright or the project's chosen browser verification tool.

Use `npm run dev` for local development and `npm run build` to reproduce production-build issues. Check actual scripts in `package.json` before running commands. Do not add or run tests unless the task asks for verification; follow `Testing & QA.md` when tests are requested.

## 3. Logging and secrets

Log request/action identifiers, operation name, status, duration and a non-sensitive user UUID when necessary. Do not log passwords, access/refresh tokens, cookies, Supabase secret keys, provider API keys, full database URLs or full pantry contents. Avoid dumping entire provider payloads if they contain licensed or personal data.

Vercel environment variables are scoped to local/preview/production. After changing one, redeploy the relevant environment. Never put a Supabase secret key or provider key in `NEXT_PUBLIC_*` variables or client components.

## 4. Supabase Auth and RLS troubleshooting

1. Confirm server code creates a Supabase server client with the request cookies.
2. Confirm the request has a valid session and server code validates the user.
3. Run the same query as the affected user, not as the dashboard owner/service role.
4. Inspect RLS enablement, grants, policy predicates and the UUID being compared to `auth.uid()`.
5. Check that public sign-up cannot set a role and that the profile trigger/policy is correct.

Never “fix” an RLS error by disabling RLS or switching all user requests to a Supabase secret key.

## 5. Matching troubleshooting

For one recipe, manually count the distinct required canonical ingredients and pantry overlap. Expected score is `haveCount / requiredCount * 100`. Then inspect:

- Whether provider ingredient text maps to the intended canonical ID.
- Whether aliases are normalized consistently (trim, Unicode normalization, case-insensitive comparison).
- Whether duplicate ingredient links inflate counts.
- Whether filters run before pagination.
- Whether ordering uses score descending, expiry count descending, cooking time ascending and a stable final ID tie-breaker.
- Whether the empty-pantry policy and zero-overlap behavior match the documented decision.

Use a deterministic demo dataset; do not rely on a live provider response to debug ranking.

## 6. Provider troubleshooting

For TheMealDB/Spoonacular, check the server-side adapter name, source ID, response status, timeout, quota/rate-limit state and runtime validation result. Do not print credentials in logs. Confirm the current provider plan permits the call, caching/storage, image use and attribution shown by the feature. Mock provider responses for deterministic local checks.

## 7. Common errors

| Error | Likely cause | Action |
| --- | --- | --- |
| `Invalid API key` / 401 from Supabase | Wrong project URL/key pairing or environment | Verify environment-specific URL and publishable key |
| Permission denied / empty RLS result | Policy does not match authenticated UUID | Inspect policies with a normal test user |
| Redirect URL not allowed | Callback URL absent from Supabase allow-list | Add exact local/preview/production callback URL |
| Supabase connection exhaustion | Excess direct DB connections or per-request clients mishandled | Use Supabase-supported connection approach and avoid global session sharing |
| Provider 429 | Quota or rate limit reached | Reduce calls, use permitted cache, review plan |
| Build error for server-only module | Secret/provider module imported into client bundle | Move import behind a server-only module boundary |
| Tailwind style missing in production | Dynamic class construction not discoverable by Tailwind | Use complete static class names or safelist supported tokens |

## 8. Incident hygiene

If a secret may have leaked, rotate it in the owning service, update Vercel environments, redeploy, and review logs/access. Do not paste secrets into issue descriptions or chat. For data exposure, preserve relevant audit evidence and investigate RLS before resuming deployment.
