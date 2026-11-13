# CookMatch

CookMatch is a responsive recipe recommendation web application. Users enter ingredients they have at home and receive recipes ranked by ingredient match, with missing ingredients, substitutes, expiry prioritization and cooking instructions.

## Product requirements

See [CookMatch Software Requirements Specification](CookMatch%20Software%20Requirements%20Specification.md) for the authoritative behavior. The first release includes account management, pantry management, recommendations and filters, recipe details, and admin catalog management. Matching is based on ingredient presence; quantities are not considered.

## Technology stack

| Area | Selected technology |
| --- | --- |
| Language | TypeScript (strict mode) |
| Framework | Next.js App Router (React) |
| Styling | Tailwind CSS, using the design tokens and accessible claymorphism guidance in `Design.md` |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth with cookie-based SSR via `@supabase/ssr` |
| Hosting | Vercel for the Next.js app; Supabase for database/Auth and optional Storage |
| Recipe sources | TheMealDB and Spoonacular through server-only provider adapters |

The current implementation instructions are in [implementation.md](implementation.md). That file supersedes older Express, plain CSS styling, local JWT, and local PostgreSQL setup examples elsewhere in the original planning docs. AI coding agents should first read [AGENTS.md](AGENTS.md).

## Repository structure

```text
src/app/(auth)/           # Sign-in and registration
src/app/(app)/            # Pantry, recipes, provider detail and admin screens
src/app/api/v1/           # Authenticated JSON API Route Handlers
src/components/           # Responsive app shell and feature workspaces
src/lib/                  # Environment, auth clients, validation and API helpers
src/proxy.ts              # Supabase cookie refresh and request security headers
src/server/               # Domain services and server-only provider adapters
supabase/migrations/      # Versioned PostgreSQL schema and RLS policies
supabase/seed.sql         # Local/demo seed data only
supabase/seeds/           # Optional catalog data, loaded separately
```

Follow the existing repository layout if implementation has already established one; do not create duplicate `client/` and `server/` applications.

## Local setup

Prerequisites: Node.js 20.9 or later, npm, Docker Desktop/Engine for local Supabase, and a Supabase project for deployment.

1. Install dependencies with `npm install`.
2. Start the local Supabase stack with `npm run supabase:start`; copy its Project URL and publishable key into `.env.local` based on `.env.example`.
3. Apply migrations and development seed data with `npm run db:reset`.
4. Start Next.js with `npm run dev` and open `http://localhost:3000`.
5. Check `http://localhost:3000/api/v1/health` for the backend health route.

## Tests

| Suite | Command |
| --- | --- |
| Unit tests for the matching rules | `npm test` |
| Database tests (ranking, filters, access rules, in `supabase/tests/`) | `npx supabase test db` |
| End-to-end browser tests (in `e2e/`) | see below |

The database and end-to-end tests need the local Supabase stack running. The end-to-end tests create accounts and catalog rows, so they refuse to run against anything but local Supabase. Run `npx playwright install chromium` once, then pass the local values from `npx supabase status` on the command line (they override `.env.local` for that run only):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key> \
SUPABASE_SECRET_KEY=<local secret key> \
NEXT_PUBLIC_APP_URL=http://localhost:3100 \
npm run test:e2e
```

This builds the app with the local settings; run `npm run build` again afterwards before using `npm run start` with your normal environment. GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, build and the database tests on every push to `main` and every pull request.

Stop the local stack with `npm run supabase:stop`. Never commit `.env.local`, Supabase secret keys, or provider API keys.

`supabase/seeds/leftover_recipes.sql` adds 100 CookMatch-owned recipes built around food that often goes to waste. It is not part of `npm run db:reset`, so the fixed test fixture in `Testing & QA.md` stays unchanged. To load it, run the file in the Supabase SQL editor after the migrations; it is safe to run more than once.

`supabase/seeds/world_recipes.sql` adds another 100 CookMatch-owned recipes, 20 each for Bangladeshi, Indian, Chinese, Mexican and Thai cooking, plus the ingredients and aliases they need. It loads the same way and does not depend on the leftover seed.

`supabase/seeds/recipe_images.sql` gives every seed recipe a freely licensed photo from Wikimedia Commons and puts the photographer and licence in the recipe's attribution line. Run it after the recipe seeds.

To regenerate Supabase TypeScript types after changing the schema, run `npm run db:types`. To make a local account an admin, sign up through the app and update that account's `profiles.role` with the local Supabase SQL editor; public registration never grants admin access.

## Environment configuration

Expected variable names are listed in `.env.example`. Public Supabase URL/publishable key may use `NEXT_PUBLIC_`; any Supabase secret and recipe provider keys must remain server-only. Configure separate values for local development, Vercel preview and production. Add auth callback URLs for each environment in Supabase.

## Recipe data and attribution

TheMealDB and Spoonacular are external API providers, not unrestricted datasets. Use official APIs only. Before importing or caching provider data, check the current API terms, plan, quota, attribution and storage rights. Keep provider calls on the server. Persist source IDs and required attribution wherever permitted, and never imply the catalog is exhaustive if a provider or quota is unavailable. Details are in `implementation.md`.

## Documentation

| File | Purpose |
| --- | --- |
| `implementation.md` | Selected stack, architecture, database, integrations, security, build phases and acceptance gates |
| `CookMatch Software Requirements Specification.md` | Product scope and functional/non-functional requirements |
| `Design.md` | Tailwind-oriented visual system and responsive UI requirements |
| `API.md` | JSON API contract for Route Handlers where implemented |
| `Authentication_and_Security.md` | Supabase Auth, RLS and application security |
| `cookmatch_architecture_and_database.md` | System architecture and data model |
| `Integration.md` | App, Supabase, providers and Vercel integration |
| `Testing & QA.md` | Requirement-linked verification plan |
| `Debugging.md` | Troubleshooting guide for the selected stack |
