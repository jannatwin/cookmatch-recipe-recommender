# CookMatch Production Setup and Sign-In Handoff

This checklist is for the Codex agent that has access to the Vercel and Supabase accounts used by the live CookMatch deployment. Read this file after it is committed, then complete the tasks in order and report evidence for each gate.

## Handoff context

- Repository: `jannatwin/cookmatch-recipe-recommender`, production branch `main`.
- Live site: <https://cookmatch-recipe-recommender.vercel.app/>
- A prior production check reported the homepage and `/api/v1/health` returned 200, and unauthenticated `/api/v1/auth/me` returned the expected 401.
- The live response exposed Supabase project ref `xnopzlpjhihmuvdkutvh`. Treat it as a clue only; confirm the Vercel production URL and key point to this exact project before changing anything.
- Commit `26b78dc` fixes the production email-confirmation callback fallback. Verify it is deployed before testing signup.
- A prior report found Vercel had `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, but no `NEXT_PUBLIC_APP_URL`, `SPOONACULAR_API_KEY`, or `THEMEALDB_API_KEY`. Recheck current settings; do not assume they are unchanged.
- The Supabase MCP connection available to the previous agent did not have access to project `xnopzlpjhihmuvdkutvh`. This handoff is specifically for the agent/account that owns or has been granted access to that production project.
- TheMealDB is deferred. Do not enable, import, or configure it as part of this task.

## Security rules

- Never commit, print, paste into chat, or include in logs/screenshots the contents of `.env.local`, API keys, passwords, confirmation links, access/refresh tokens, or database connection strings.
- `.env.local` is intentionally ignored by Git. A GitHub repository, commit, or agent on another machine cannot read a copy that exists only in the user's local working directory. Repository access does not grant filesystem access to that file.
- If `.env.local` is available in the same local workspace, inspect it without displaying values. Compare the Supabase project ref and key formats, and transfer secret values directly into Vercel's encrypted environment-variable UI/tool without echoing them. If it is not available, ask the user to add the required values through Vercel's secure UI; do not ask them to commit or paste secrets.
- Use the Supabase publishable key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never put `SUPABASE_SECRET_KEY`, legacy `service_role`, or provider keys in a `NEXT_PUBLIC_*` variable or browser bundle. The current app does not require the Supabase secret key for normal operation.
- Confirm the selected Vercel team/project and Supabase organization/project before edits. Do not change similarly named projects or unrelated production data.
- Do not disable email confirmation, RLS, MFA, deployment protection, or security controls just to make a smoke test pass.
- Do not create, modify, or delete real user accounts/data during verification unless the user explicitly supplies a test account and authorizes the test. Never request their password in chat; have the user enter it directly in the app if a real-account check is needed.

## 1. Confirm project and deployment identity

- [ ] In Vercel, identify the project serving `cookmatch-recipe-recommender.vercel.app` and confirm its connected Git repository is `jannatwin/cookmatch-recipe-recommender`.
- [ ] Confirm the production branch is `main` and the current successful production deployment includes commit `26b78dc` or a later commit containing that fix.
- [ ] In Supabase, locate project ref `xnopzlpjhihmuvdkutvh`; confirm it is active and is the project used by Vercel production.
- [ ] If either project is missing, stop and identify the account/team access that is missing. Do not connect a different project as a guess.
- [ ] Record project names, refs, Git SHA, deployment URL, and status only. Do not record environment-variable values.

## 2. Reconcile production environment variables

Compare the current production variables against the repo's `.env.example` and `src/lib/env.ts`. Set or correct only what is missing or mismatched:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — URL for the confirmed production Supabase project.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — active publishable key for that same project.
- [ ] `NEXT_PUBLIC_APP_URL` — `https://cookmatch-recipe-recommender.vercel.app` (or the verified canonical production domain).
- [ ] `SPOONACULAR_API_KEY` — configure only if the user wants provider search enabled in production and the key is available from the secure local environment or user. Keep it server-only.
- [ ] Do not set `THEMEALDB_API_KEY`; TheMealDB is intentionally deferred.
- [ ] Do not add `SUPABASE_SECRET_KEY` unless code is changed to require trusted privileged operations and the need is reviewed. It is optional in the current code.
- [ ] Apply production variables to the Production environment. Keep Preview/Development separated; never copy production secrets into Preview or Development unless the owner explicitly approves the data-sharing risk.
- [ ] If any value changes, trigger a new production deployment so the runtime receives the updated values.
- [ ] Verify the deployment's runtime CSP `connect-src` uses the expected Supabase project origin, without printing any key.

## 3. Fix and verify Supabase Auth URL configuration

- [ ] Set Supabase Auth **Site URL** to the verified canonical production origin, normally `https://cookmatch-recipe-recommender.vercel.app`.
- [ ] Add the exact confirmation callback `https://cookmatch-recipe-recommender.vercel.app/auth/callback` to **Redirect URLs**.
- [ ] Add `http://localhost:3000/**` only if local signup/confirmation is required.
- [ ] Add narrowly scoped Vercel Preview patterns only if preview signups are required; do not use an unrestricted wildcard.
- [ ] Inspect the confirmation email template. If it hardcodes the Site URL and ignores the requested redirect, update it to honor Supabase's redirect target (for example `{{ .RedirectTo }}` where the template flow requires it).
- [ ] Confirm the deployed registration route contains commit `26b78dc` behavior: explicit `NEXT_PUBLIC_APP_URL`, then `VERCEL_PROJECT_PRODUCTION_URL`, then the known production URL in production; localhost only in development.
- [ ] Do not expose raw confirmation tokens while checking email delivery. Check Supabase Auth logs for rejected redirects or SMTP errors and report sanitized error codes/messages.

## 4. Check database readiness without changing user data

- [ ] Compare the checked-in migrations under `supabase/migrations/` with the production migration history.
- [ ] Confirm the initial schema and `202610300002_provider_request_limits.sql` are present/applied if the running app expects them. Review each missing migration before applying it; never reset the production database.
- [ ] Verify core tables exist: `profiles`, `ingredients`, `ingredient_aliases`, `pantry_items`, `recipes`, `recipe_ingredients`, `recipe_steps`, `dietary_tags`, `recipe_dietary_tags`, `substitutes`, and `provider_request_limits` if introduced by migration.
- [ ] Confirm RLS is enabled and policies remain in place on exposed tables. Run Supabase security/performance advisors and report findings; do not silence warnings by disabling RLS.
- [ ] Confirm the registration/profile trigger or service path creates a `profiles` row for a newly registered user with role `user`; public signup must never grant admin.
- [ ] Do not modify seeded catalog data or promote a real user to admin as part of this task.

## 5. Diagnose and verify sign-in

- [ ] Before testing, inspect Supabase Auth logs for recent sign-up, confirmation, and password sign-in failures. Correlate by timestamp and sanitized error code; never reveal email addresses or tokens in the report.
- [ ] Test production health: homepage returns 200; `/api/v1/health` returns 200; `/api/v1/auth/me` returns 401 without a session.
- [ ] Use a disposable test identity only if the user authorizes it and a suitable test mailbox is available. Otherwise have the user perform the credential entry and confirmation directly; do not ask them to send credentials.
- [ ] For a new test account, verify the confirmation email points to the production `/auth/callback`, the callback exchanges the code, a session cookie is established, and `/api/v1/auth/me` returns 200 with that test user.
- [ ] Verify sign-out clears the session and `/api/v1/auth/me` returns 401 again.
- [ ] If a test account is created, delete only that disposable test account after the test, after confirming it is the test identity; never delete an existing account to repair sign-in.
- [ ] If an existing account is still rejected after confirmation URLs are corrected, report the sanitized Supabase Auth error and next specific action. Do not claim the redirect fix repairs an incorrect password or an already-disabled account.

## 6. Final production checks and handoff report

- [ ] Confirm the final Vercel production deployment is Ready and its commit SHA is recorded.
- [ ] Recheck homepage and health endpoint after deployment; verify auth behavior from section 5.
- [ ] Verify no secret was committed, exposed in client bundles, or written to logs. Keep `.env.local` ignored and untracked.
- [ ] Report completed items, skipped items, project identity (names/refs only), deployment SHA/status, sanitized auth findings, and any manual action still needed from the user.
- [ ] If the user must perform a step, give the exact dashboard path and value to set, but never request that they post secret values into chat.

## Acceptance gate

Mark the production sign-in setup complete only when the deployed app points to the intended active Supabase project, the confirmation callback is allowlisted and production-hosted, and an authorized smoke test verifies a confirmed user can sign in, access `/api/v1/auth/me`, and sign out. If no authorized test identity is available, report configuration as ready but sign-in as unverified.
