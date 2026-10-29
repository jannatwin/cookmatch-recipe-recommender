# CookMatch Implementation Guide

This guide turns the project requirements into a buildable plan for AI coding agents and developers. Read it together with the [Software Requirements Specification](CookMatch%20Software%20Requirements%20Specification.md). The SRS defines the product behavior; this guide defines the selected implementation stack and the recommended build sequence.

## 1. Product goal

Build a responsive web application that lets a registered user maintain a pantry and receive recipes ranked by how many required ingredients they already have. The app must show missing ingredients, highlight recipes missing one or two ingredients, suggest known substitutes, prioritize recipes that use ingredients close to expiry, support cuisine/time/diet filters, and provide complete cooking instructions. Administrators manage recipe and ingredient catalog data.

This is a browser-based web app that works on mobile and desktop. A native Android application is not part of the first release.

## 2. Chosen stack

| Area | Choice |
| --- | --- |
| Language | TypeScript, strict mode, in frontend and server code |
| Full-stack framework | Next.js App Router (React) |
| Styling | Tailwind CSS; follow `Design.md` for CookMatch's claymorphism visual direction while preserving accessibility |
| Database | Supabase-hosted PostgreSQL |
| Authentication | Supabase Auth, using cookie-based SSR integration with `@supabase/ssr` |
| Database client | `@supabase/supabase-js`; use generated TypeScript database types |
| Hosting | Vercel for the Next.js app; Supabase hosts database, Auth, and optionally image storage |
| External recipe sources | TheMealDB and Spoonacular, integrated behind server-only adapters |

Use current stable package versions at implementation time. Do not copy obsolete Supabase Auth Helpers examples; use the current `@supabase/ssr` pattern. Keep recipe provider keys server-side. Never expose a Supabase secret key in browser code.

## 3. Requirement interpretation and priority

Implement all high-priority SRS requirements for the first usable release, then medium-priority features, then the low-priority cooking-mode enhancement. The requirements map to these areas:

| Requirement IDs | User-visible capability |
| --- | --- |
| FR-1–FR-3 | Registration, login, logout, helpful credential errors |
| FR-4–FR-7 | Ingredient suggestions, pantry CRUD, expiry dates, aliases and validation |
| FR-8–FR-12 | Recipe matching, percentage scores, ranking, expiring ingredient boost, have/missing display |
| FR-13–FR-14 | Almost-achievable flag and substitute suggestions |
| FR-15–FR-16 | Cuisine, maximum-time and diet filters, combined without losing ranking |
| FR-17–FR-19 | Recipe details and a clear start-cooking experience |
| FR-20–FR-21 | Admin catalog management for recipes, ingredients, aliases and substitutes |
| NFR-1–NFR-11 | Performance, usability, security, portability, maintainability and deterministic results |

Do not change product behavior just because a chosen data provider has a different score or missing field. Normalize source data into the CookMatch model and calculate the CookMatch score in application/database logic.

## 4. Architecture

Use one Next.js application with server-first data access:

```text
Browser
  └─ Next.js App Router pages and interactive client components
       ├─ Server Components / Server Actions / Route Handlers
       ├─ Supabase SSR client (user session and RLS-scoped queries)
       ├─ Domain services (normalizer, matcher, recipe catalog, admin)
       └─ Server-only source adapters ── TheMealDB / Spoonacular
Supabase
  ├─ PostgreSQL (migrations, constraints, indexes, RLS)
  ├─ Auth
  └─ Storage (optional app-owned images only)
Vercel
  └─ Deploys Next.js; environment variables configured per environment
```

Keep business logic independent of UI and provider payloads. UI components must not call recipe providers directly. Prefer Server Components for initial page data and Route Handlers or Server Actions for mutations. Add Route Handlers when a stable JSON API is useful (including provider webhooks or a future mobile client); do not build a separate Express server for the initial release.

Suggested source layout:

```text
src/
  app/
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (app)/pantry/page.tsx
    (app)/recipes/page.tsx
    (app)/recipes/[id]/page.tsx
    (app)/provider-recipes/[source]/[id]/page.tsx
    (app)/admin/page.tsx
    auth/callback/route.ts
    api/v1/.../route.ts
  components/                 # shared accessible UI and feature components
  features/
    auth/
    pantry/
    recommendations/
    recipes/
    admin/
  lib/
    supabase/client.ts
    supabase/server.ts
  proxy.ts                    # refresh Supabase SSR cookies (Next.js 16; beside src/app)
    env.ts
    validation/                # Zod schemas
  server/
    services/                  # matching, normalizing, catalog, authorization
    providers/
      contracts.ts
      themealdb.ts
      spoonacular.ts
      normalize.ts
  types/
supabase/
  migrations/
  seed.sql
```

The names are a starting point, not a reason to create empty abstractions. Keep modules small and introduce interfaces where there are genuinely multiple providers or consumers.

## 5. Data source strategy: TheMealDB and Spoonacular

Treat both sources as external providers, not as interchangeable, unrestricted public datasets. Build an internal catalog so the matching feature, user pantry, aliases, expiry dates and admin corrections remain under CookMatch's control.

### 5.1 Provider rules

- Use official APIs and current provider documentation. Do not scrape provider websites.
- Keep provider credentials in server-only environment variables. Never send them to a client component or include them in a public URL generated by the browser.
- Check provider terms, attribution rules, rate limits, caching/storage permissions and commercial-use requirements before loading or redistributing data. Recheck these before public launch; do not assume API access grants unrestricted rights to copy recipe text or images into the app database.
- TheMealDB's current terms say official API content may be copied/modified subject to preserving copyright/trademark notices; its free key is for development/testing and public app use requires the appropriate paid/supporter access and attribution. Confirm the exact current tier and attribution requirement before launch.
- Spoonacular is a metered commercial API. Do not assume a free quota, durable storage rights, or permission to bulk-import its catalog. Review the current plan and API terms before enabling it for production. Use it as an on-demand provider unless the plan explicitly permits persistent storage of the fields being cached.
- Add source attribution near recipe details when required by the provider. Store attribution/source metadata with each recipe so UI rendering cannot accidentally omit it.

### 5.2 Provider adapter contract

Each provider adapter should implement a shared, typed contract, for example:

```ts
export interface RecipeProvider {
  readonly name: "themealdb" | "spoonacular";
  searchByIngredients(input: ProviderIngredientSearch): Promise<ProviderRecipeSummary[]>;
  getRecipe(sourceId: string): Promise<ProviderRecipeDetail | null>;
}
```

Provider DTOs must be distinct from CookMatch database/domain types. Validate remote JSON at runtime (for example with Zod), handle timeouts, non-2xx responses, quota/rate-limit errors and malformed payloads, and return a safe user-facing fallback. Never make recommendation correctness depend on a live third-party API request completing successfully.

### 5.3 Ingestion and durable catalog

1. Add an admin-only import/sync command or protected server task; do not import a large catalog during a user's page request.
2. Import only fields allowed by the source terms and selected plan. Track the source name, source recipe ID, source URL, attribution text and last-sync time.
3. Normalize ingredient names and link them to canonical CookMatch ingredient records. Preserve the provider's original ingredient text for display when permitted.
4. Make imports idempotent using a unique `(source, source_recipe_id)` key. Record rejected records and reasons; never silently drop invalid recipe data.
5. Keep native CookMatch recipes and provider-sourced recipes distinguishable. Admin edits to canonical ingredient mapping should not be overwritten by routine sync.
6. If storage rights are unclear or do not permit persistent storage, do not save the restricted content. Fetch through the server adapter under the API plan's rules, and provide graceful degraded behavior when the provider is unavailable.

### 5.4 Important source coverage limitation

TheMealDB's standard free API does not provide the same multi-ingredient pantry-search behavior as paid API tiers; Spoonacular has ingredient-oriented search but consumes its quota/plan allowance. The CookMatch recommendation algorithm should run against the normalized local catalog when that catalog is legally populated. If it is not, the product must clearly operate in provider-search mode with explicit limitations; do not imply it has exhaustively matched all recipes.

## 6. Database model

Create schema changes only through checked-in SQL migrations under `supabase/migrations/`. Generate TypeScript types after migrations and keep generated output in sync. Use `timestamptz` for timestamps and `date` for expiry dates. Add appropriate foreign keys, uniqueness and check constraints.

Recommended tables:

| Table | Key fields and purpose |
| --- | --- |
| `profiles` | `id uuid PK references auth.users`, display name, role (`user`/`admin`), created timestamp. Do not duplicate password data. |
| `ingredients` | canonical name, normalized name, created timestamp; normalized name unique |
| `ingredient_aliases` | ingredient FK, alias, normalized alias unique; supports regional names |
| `pantry_items` | user FK, ingredient FK, optional expiry date, created/updated timestamps; unique `(user_id, ingredient_id)` |
| `recipes` | title, description, cuisine, cooking time, image URL, source metadata/attribution, publication state, created/updated timestamps |
| `recipe_ingredients` | recipe FK, ingredient FK, original display text and optional amount/unit if source rights/data permit; unique `(recipe_id, ingredient_id)` where suitable |
| `recipe_steps` | recipe FK, step number, instruction; unique `(recipe_id, step_number)` |
| `dietary_tags` | unique tag name |
| `recipe_dietary_tags` | recipe/tag join table, composite primary key |
| `substitutes` | original ingredient FK, replacement ingredient FK, note; prohibit self-substitution |
| `recipe_sources` (or equivalent columns on `recipes`) | provider, provider ID, source URL, attribution, last synced timestamp; unique provider/provider ID |

The original architecture SQL uses integer IDs and a local users table. For Supabase Auth, use UUID `auth.users.id` for user-owned rows and a `profiles` table instead. Preserve the original product entities and constraints while adapting the identity model. Decide whether provider identity lives in a separate table or on `recipes`; avoid duplicate competing source-of-truth fields.

### 6.1 RLS and roles

Enable Row Level Security on every exposed table. Apply least privilege:

- Users can select/insert/update/delete only their own `pantry_items` (`auth.uid() = user_id`).
- Authenticated users can read published recipes, ingredients, aliases, cuisines/tags and substitutes.
- Only admins can create/update/delete catalog data.
- Users must never set their own role. The role is provisioned through trusted server/admin tooling and protected from user updates.
- Do not rely on hidden admin buttons or middleware alone. Enforce authorization in RLS and again in sensitive server actions/routes.
- Keep any Supabase secret key server-only. It bypasses RLS; avoid it for normal user requests. If a trusted import task needs it, validate that task's authority before use.

Write RLS policies and migrations together. Test policies with anonymous, user A, user B and admin identities before launch.

### 6.2 Indexes and data integrity

At minimum, index pantry lookups by `user_id`, recipe ingredient joins by `ingredient_id`, cuisine and cooking time filters, and normalized ingredient/alias names. Add constraints to reject non-positive cooking times, invalid role values, duplicate aliases, duplicate links and substitute self-links. Use transactions for pantry replacement and multi-table recipe creation/update.

## 7. Matching and ranking rules

Implement the rules in a pure domain module with deterministic inputs and outputs. Quantities are ignored in the first version, consistent with the SRS.

For each published recipe:

```text
required = distinct canonical ingredients required by the recipe
have = required ingredients present in the current user's pantry
missing = required minus have
matchScore = required is empty ? 0 : (have count / required count) * 100
almostAchievable = missing count is 1 or 2
expiringCount = matched ingredients whose expiry date is in [today, today + warningWindow]
```

Use a documented default expiry warning window of 3 days, configurable in one place. Ignore expired dates for the “expiring soon” boost unless the product team explicitly decides otherwise. Avoid multiplying or adding a hidden arbitrary score bonus. Sort lexicographically by:

1. `matchScore` descending.
2. `expiringCount` descending.
3. `cookingTimeMin` ascending.
4. stable recipe ID ascending as a deterministic tie-breaker.

Apply filters before pagination and preserve this order in the filtered result set. Supported filters: cuisine, max cooking time, dietary tag, optional `almostOnly`, optional minimum score. An empty pantry returns an empty result and a prompt to add pantry items. Return have/missing ingredient names and substitute choices needed by the UI.

Clarify internally that “recipes with ingredients” can mean partial matches; do not filter out every recipe with a missing ingredient. Return useful partial matches, including zero-score recipes only if the product deliberately chooses to show them. The baseline API design excludes recipes with no pantry overlap; align implementation with that behavior unless a product decision changes it.

## 8. Authentication, validation and security

- Use Supabase Auth email/password flows. New public signups always get the `user` role.
- Use Supabase's cookie-based SSR setup for Next.js. On protected server-rendered pages/actions, validate the authenticated user with the supported server auth method; do not trust user data read from an unverified cookie.
- Validate every server action, route parameter, query string and provider response with shared schemas. Normalize ingredient text (trim, Unicode normalization, case-fold for matching) without changing the display spelling.
- Unknown pantry ingredients must produce a clear validation response and must not partially replace the pantry.
- Use parameterized Supabase queries/RPCs; do not concatenate user input into SQL.
- Rate-limit login and expensive provider-backed requests where practical. Never log passwords, access/refresh tokens, API keys, session cookies or full sensitive pantry data.
- Use HTTPS in production, secure cookie settings, safe redirect allow-lists for auth callbacks, and security headers appropriate to the app.
- Do not put secrets in `NEXT_PUBLIC_*` variables. Only the Supabase URL and publishable key are public by design.
- Provide non-enumerating login errors and useful, accessible form validation.

## 9. UX and accessibility

Implement these primary screens:

1. Landing / welcome page with clear sign-in and sign-up actions.
2. Register and login forms.
3. Pantry editor with searchable ingredient autocomplete, selected ingredient chips, optional expiry editor, remove/edit controls and empty/loading/error states.
4. Recommendations list with match percentage, present/missing ingredients, expiry indication, almost-achievable badge, substitutes and filter controls.
5. Recipe detail page with complete permitted recipe details, ingredients marked in-pantry/missing, substitutes and ordered instructions.
6. Admin screens for recipe, ingredient, alias and substitute management.

Design mobile-first and verify keyboard use, visible focus, labels, semantic headings, contrast, reduced motion and screen reader announcements for autocomplete/results. Claymorphism must not make text low-contrast or controls hard to identify. Keep loading, empty, provider error and unauthorized states explicit.

## 10. Build phases and completion gates

Do the phases in order. Keep each phase reviewable and update this guide if a deliberate requirement change is approved.

### Phase 0 — Repository and product setup

- Inspect the repository and all project Markdown first; follow existing decisions unless this guide explicitly supersedes a proposal.
- Create a Next.js App Router project with TypeScript strict mode, Tailwind CSS, linting and formatting. Confirm Node/npm versions and scripts in README.
- Add `.env.example` containing variable names only, plus setup instructions. Never commit real credentials.
- Create Supabase development and production projects or document how to create them.

**Gate:** fresh checkout can install dependencies and run the empty app; setup steps are documented.

### Phase 1 — Database and auth foundation

- Add initial migrations for profiles, catalog, pantry, joins and constraints.
- Add RLS policies and seed only clearly labeled development/demo records.
- Configure Supabase SSR clients, auth callback, registration, login, logout and protected routes.
- Add role provisioning instructions for the first admin without allowing client role escalation.

**Gate:** user A cannot view or alter user B's pantry; non-admin cannot mutate catalog tables.

### Phase 2 — Ingredient catalog and pantry

- Implement ingredient search by canonical name and alias.
- Implement atomic pantry add/update/remove/replace operations with optional expiry date.
- Normalize and validate all input; return every unknown name and preserve data on failed replace.
- Build responsive pantry UI and states.

**Gate:** a user can manage their pantry on mobile and desktop, and data remains after sign-out/sign-in.

### Phase 3 — Recipe catalog and provider adapters

- Define domain types and provider DTOs, then implement TheMealDB and Spoonacular adapters behind server-only code.
- Confirm provider terms and keys before any persistent imports. Store attribution/source metadata for allowed records.
- Build an idempotent import/sync flow if rights permit; otherwise use request-time provider access with caching only where terms allow.
- Add admin CRUD for CookMatch-owned recipes and ingredient mappings.

**Gate:** source failures and quota errors degrade gracefully; source data is not presented as verified or exhaustive.

### Phase 4 — Recommendations and recipe details

- Implement pure scoring/ranking logic and use canonical ingredient IDs for comparisons.
- Add cuisine, time, diet, almost-only and minimum-score filters; apply before pagination.
- Return missing ingredients, available substitutes, expiring count and stable ordering.
- Build recommendation cards, details and cooking view.

**Gate:** same pantry/catalog/filter input yields same ranking; score and missing counts are explainable in the UI.

### Phase 5 — Admin, hardening and deployment

- Complete admin catalog tools and authorization checks.
- Review RLS policies, environment separation, logging, rate limits, error boundaries and auth redirects.
- Configure Vercel preview/production deployments and Supabase redirect URLs, allowed origins and secrets.
- Add a release checklist and verify requirements on a clean environment.

**Gate:** deployment uses production secrets only, no Supabase secret key reaches client bundles, and all high-priority SRS features have acceptance evidence.

## 11. Verification expectations

The project includes a QA plan in `Testing & QA.md`; implement its linked checks. At minimum, verify:

- Registration, login, logout and role enforcement.
- User-to-user pantry isolation through RLS.
- Ingredient alias lookup, duplicate prevention, unknown-name handling and atomic pantry replacement.
- Score calculation, 1/2 missing thresholds, expiry ordering, stable tie-breaks and combined filters.
- Provider mapping, malformed payload handling, timeout/quota behavior and attribution display.
- Responsive layouts, keyboard-only pantry entry and recipe browsing.
- Recommendation latency target from the SRS against a documented demo catalog.
- Clean setup and deployment from README instructions.

Do not mark a requirement complete from code inspection alone when its behavior can be verified end-to-end. Keep test data deterministic and avoid calling paid providers in automated tests; mock provider responses.

## 12. Environment variables

Use a schema-validated environment module and fail fast on missing required server values. Names can be adjusted to the current Supabase/Vercel conventions, but keep public and secret values separate:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=                    # optional server-only elevated key; current app uses user-scoped RLS clients
SPOONACULAR_API_KEY=                    # server-only
THEMEALDB_API_KEY=                      # server-only production key; development test key may be used locally
NEXT_PUBLIC_APP_URL=
```

Do not place secrets in `.env.example`. Configure separate values for local development, Vercel preview and production. Supabase callback/redirect URLs must include the correct localhost and deployed app URLs. Prefer the current publishable/secret key pair; Supabase is deprecating legacy `anon` and `service_role` keys by the end of 2026.

## 13. Decisions and risks to keep visible

- **Source rights and quota:** Provider API access does not automatically permit bulk storage or redistribution. Verify current terms and plan before ingesting data or launching publicly.
- **Coverage:** Provider catalogs and ingredient parsing differ. CookMatch scores must use normalized canonical ingredients; missing mappings reduce recommendation quality.
- **Expiry ranking:** SRS specifies prioritization but leaves exact weighting open. This guide uses expiry count only as the second sort key after score.
- **Identity model:** Supabase Auth UUIDs replace the local integer user table shown in the older architecture draft.
- **Dietary correctness:** Provider dietary labels can be incomplete. Do not claim allergy safety or certified nutrition accuracy.
- **Image hosting:** Prefer provider image URLs only when permitted. Use Supabase Storage for images the project owns or is allowed to host.
- **API route compatibility:** Existing `API.md` documents REST conventions. The initial app can use Server Actions and Route Handlers; if a public REST API is required, implement and document compatible Route Handlers instead of creating a second backend.

## 14. Documentation maintenance

When implementation choices change, update this guide and the relevant architecture/API/README docs in the same change. Keep the SRS as the product baseline; record approved scope changes in the SRS. Treat old examples that conflict with this stack (Express, integer user IDs, local JWT handling) as legacy proposals, not implementation instructions.

## 15. Official references

Check current official documentation before coding provider/auth/deployment details:

- [Supabase Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side)
- [TheMealDB API guide](https://www.themealdb.com/docs_api_guide.php)
- [TheMealDB terms of use](https://www.themealdb.com/terms_of_use.php)
- [Spoonacular Food API](https://spoonacular.com/food-api)
- [Next.js deployment on Vercel](https://vercel.com/docs/frameworks/nextjs)
