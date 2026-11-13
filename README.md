# CookMatch

**Cook with what you already have.** CookMatch is a recipe recommender: add the ingredients in your kitchen and it ranks recipes by how much of each one you can already make, shows what is missing, suggests substitutes and pushes ingredients that are about to expire to the top.

**Live demo:** <https://cookmatch-recipe-recommender.vercel.app>

[![CI](https://github.com/jannatwin/cookmatch-recipe-recommender/actions/workflows/ci.yml/badge.svg)](https://github.com/jannatwin/cookmatch-recipe-recommender/actions/workflows/ci.yml)

## Features

- **Pantry**: add ingredients by name or alias (for example "piyaj" for onion), with suggestions as you type, an ingredient picker and optional expiry dates.
- **Ranked recommendations**: every recipe gets a match score, a list of missing ingredients and possible substitutes. Recipes that use expiring ingredients rank higher.
- **Filters**: cuisine, cooking time, dietary preference, minimum match and "almost achievable" (one or two ingredients missing).
- **Recipe details**: photo, ingredient quantities, step-by-step cooking mode and photo credits.
- **Guest browsing**: the recipe collection is open without an account; pantry matching and saved recipes need one.
- **Saved recipes and recently viewed**.
- **Admin tools**: manage recipes, ingredients, aliases and substitutes.

## Tech stack

| Area | Technology |
| --- | --- |
| Language | TypeScript (strict) |
| Framework | Next.js App Router, React |
| Styling | Tailwind CSS with theme tokens (`src/app/globals.css`) |
| Database and auth | Supabase PostgreSQL with row-level security, Supabase Auth via `@supabase/ssr` |
| Hosting | Vercel |
| Tests | Node test runner, pgTAP, Playwright |
| External recipe sources | Spoonacular and TheMealDB through server-only adapters |

## Getting started

Prerequisites: Node.js 20.9 or later, npm, and Docker for the local Supabase stack.

```bash
npm install
npm run supabase:start     # prints the local URL and keys
cp .env.example .env.local # then fill in the values printed above
npm run db:reset           # apply migrations and the demo seed
npm run dev                # http://localhost:3000
```

`http://localhost:3000/api/v1/health` confirms the backend is up. Stop the local stack with `npm run supabase:stop`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (safe for the browser) |
| `SUPABASE_SECRET_KEY` | Server-only key, used for the guest request limit and the end-to-end tests |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app, used for auth redirects |
| `SPOONACULAR_API_KEY`, `THEMEALDB_API_KEY` | Optional recipe provider keys, server-only |

Never commit `.env.local` or any secret key. Use separate values for local development, Vercel previews and production, and add each environment's auth callback URL in Supabase.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build and serve the app |
| `npm run lint` / `typecheck` | ESLint and TypeScript checks |
| `npm run format` / `format:check` | Prettier: rewrite files, or check only (CI) |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright end-to-end tests (local Supabase only) |
| `npm run db:reset` / `db:push` / `db:types` | Reset the local database, push migrations to the linked project, regenerate types |

## Testing

| Suite | Command | Covers |
| --- | --- | --- |
| Unit | `npm test` | Matching rules and small helpers |
| Database (pgTAP) | `npx supabase test db` | Ranking, filters, row-level security, saved recipes, guest limit |
| End-to-end | `npm run test:e2e` | Register, pantry, recommendations, cooking, guest browsing, saved recipes, admin |

The database and end-to-end tests need the local Supabase stack. The end-to-end tests create accounts and catalog rows, so they refuse to run against anything but local Supabase. Run `npx playwright install chromium` once, then pass the local values from `npx supabase status`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key> \
SUPABASE_SECRET_KEY=<local secret key> \
NEXT_PUBLIC_APP_URL=http://localhost:3100 \
npm run test:e2e
```

This builds the app with the local settings, so run `npm run build` again before `npm run start` with your normal environment. GitHub Actions runs the format check, lint, typecheck, unit tests, build and database tests on every push to `main` and every pull request.

## Database

### Migrations

Schema changes go through `supabase/migrations`, never the SQL editor, so the repository always matches production:

```bash
npx supabase link --project-ref <your project ref>   # once
npx supabase migration list                          # compare local and remote
npm run db:push                                      # apply new migrations
```

If a migration was ever pasted into the SQL editor by hand, mark it as applied first, otherwise `db:push` tries to run it again: `npx supabase migration repair --status applied <version>`.

To make an account an admin, sign up through the app and set that account's `profiles.role` to `admin` in the database. Public registration never grants admin access.

### Seed data

Seed files are optional content, not schema. Each one is safe to run more than once. Run them in this order in the Supabase SQL editor, or with `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f <file>`:

| Order | File | Contents |
| --- | --- | --- |
| 1 | `supabase/seed.sql` | Five demo recipes: the fixed fixture the tests rely on (loaded by `npm run db:reset`) |
| 2 | `supabase/seeds/leftover_recipes.sql` | 99 recipes built around food that often goes to waste |
| 3 | `supabase/seeds/world_recipes.sql` | 100 recipes: 20 each for Bangladeshi, Indian, Chinese, Mexican and Thai cooking |
| 4 | `supabase/seeds/recipe_images.sql` | A photo and photo credit for every seed recipe |
| 5 | `supabase/seeds/recipe_quantities.sql` | Ingredient quantities for every seed recipe |

The seed catalog contains no pork, bacon, ham or sausage. A database seeded before that change needs `supabase/seeds/remove_pork.sql` run once, then files 2 to 5 again.

## Project structure

```text
src/app/(auth)/        Sign-in and registration pages
src/app/(app)/         Pantry, recipes, saved recipes and admin pages
src/app/api/v1/        JSON API route handlers
src/components/        UI components
src/lib/               Environment, Supabase clients, validation and helpers
src/server/            Domain services and server-only recipe provider adapters
src/proxy.ts           Session refresh, route guard and security headers
supabase/migrations/   Schema, row-level security policies and SQL functions
supabase/seeds/        Optional catalog data
supabase/tests/        Database tests
e2e/                   End-to-end tests
docs/                  Requirements, design and reference documents
```

## Documentation

| Document | Purpose |
| --- | --- |
| [Requirements (SRS)](docs/srs.md) | Product scope, functional and non-functional requirements |
| [Implementation guide](docs/implementation.md) | Selected stack, architecture, build phases and acceptance gates |
| [API reference](docs/api.md) | JSON API contract |
| [Security](docs/security.md) | Authentication, row-level security and application security |
| [Architecture and database](docs/architecture-and-database.md) | System architecture and data model |
| [Design](docs/design.md) | Visual system and responsive UI requirements |
| [Integration](docs/integration.md) | App, Supabase, recipe providers and Vercel |
| [Testing and QA](docs/testing-and-qa.md) | Requirement-linked test plan |
| [Debugging](docs/debugging.md) | Troubleshooting guide |

AI coding agents should read [AGENTS.md](AGENTS.md) first.

## Recipe data and credits

- **Seed recipes** are written for CookMatch. Quantities are home-cooking estimates, not tested measurements, and dietary tags follow the ingredient list; they are not allergy or certification claims.
- **Photos** come from Wikimedia Commons under Creative Commons or public-domain licences. Each recipe page credits the photographer and licence.
- **Spoonacular and TheMealDB** are external API providers, not open datasets. They are called only from the server through their official APIs, with attribution, and their data is not stored or redistributed. Check each provider's current terms before caching or importing anything.
