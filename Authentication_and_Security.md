# CookMatch: Authentication and Security

Security rules for the selected TypeScript / Next.js / Supabase implementation. Supabase Auth owns credential verification and sessions; PostgreSQL Row Level Security (RLS) protects records. Do not implement a second password table, custom JWT signing flow, or Express authentication middleware. See [implementation.md](implementation.md) for the complete architecture.

## 1. Security goals and assets

Protect account credentials and sessions, personal profile information, user pantry/expiry data, catalog integrity, provider API keys, Supabase secret keys and database availability. Important auth and admin events should be observable without logging secrets or unnecessary personal data.

## 2. Authentication with Supabase Auth

- Registration requires a display name, email and password. Supabase Auth stores and verifies credentials; CookMatch must never store a plaintext password or password hash in its own tables.
- New public registrations receive the `user` role only. Do not accept a role field from a registration form or client request.
- Use the current `@supabase/ssr` integration so sessions are carried in secure cookies across Server Components, Server Actions and Route Handlers.
- Validate the current user server-side before returning private data or performing mutations. Do not trust user IDs, roles or session claims supplied in request bodies.
- Configure secure cookie flags in production, safe auth callback URLs and explicit redirect allow-lists. Do not redirect to arbitrary user-provided URLs.
- Logout must clear/revoke the Supabase session using the supported Auth flow and clear the browser session state.
- Return non-enumerating login errors so users cannot determine whether an email exists.

## 3. Authorization and roles

Use a `profiles` table keyed by `auth.users.id` (UUID). Store a constrained `role` value (`user` or `admin`) with a default of `user`. Role changes must use a trusted administrative process; a user cannot update their own role/profile role field.

| Resource/action | Anonymous | User | Admin |
| --- | --- | --- | --- |
| Register/login | Allowed | Allowed | Allowed |
| Read published catalog | No or explicitly public fields only | Allowed | Allowed |
| Read/change pantry | Denied | Own rows only | Own rows only unless an explicit support workflow is approved |
| Create/update/delete catalog | Denied | Denied | Allowed |
| Provider import/sync | Denied | Denied | Trusted server task only |

Enable RLS for every exposed table. Enforce ownership with `auth.uid() = user_id`, catalog write access with a server-verified admin role, and least privilege in SQL grants. Hide admin controls in the UI for usability, but never treat that as authorization. Recheck permissions in sensitive server actions/Route Handlers.

Never expose a Supabase secret key to client code. It bypasses RLS; prefer user-scoped clients for ordinary requests. If a trusted import task needs elevated access, verify the task authority first. Prefer the current publishable/secret key pair over legacy `anon`/`service_role` keys.

## 4. Data protection

- Use HTTPS in production. Do not expose database ports publicly.
- Keep pantry data scoped to its owner. Minimize logs and analytics containing pantry contents.
- Keep secrets in environment configuration, not source, screenshots, build logs or client bundles.
- Never log passwords, auth tokens, refresh tokens, cookies, `SUPABASE_SECRET_KEY`, provider API keys or full database connection strings.
- Separate development, preview and production Supabase projects or credentials. Do not use production user data as test fixtures.

## 5. Input and application protections

- Validate all form input, URL parameters, server action arguments and provider responses at runtime (for example with Zod).
- Normalize ingredient strings for matching while preserving display text. Unknown ingredient names must not partially replace the pantry.
- Use Supabase query APIs or parameterized SQL/RPCs. Never concatenate user values into SQL.
- Render untrusted recipe/provider text as text. Avoid `dangerouslySetInnerHTML`; if rich text becomes necessary, sanitize with a maintained allow-list sanitizer.
- Apply request size limits and rate limits to sign-in, ingredient search and metered provider calls.
- Add secure response headers and a restrictive Content Security Policy compatible with the required image/font providers.
- Configure auth redirect URLs, CORS/origins and Supabase allowed URLs explicitly for local, preview and production environments.

## 6. Operational checks

Before launch, verify the following with separate anonymous, user A, user B and admin identities:

- User A cannot read or mutate user B's pantry by changing IDs or calling database APIs directly.
- A user cannot update their own role or create catalog records.
- Admin catalog changes are rejected for non-admins at both server and database policy layers.
- No Supabase secret/provider key appears in browser bundles, source maps, logs or public environment variables.
- Auth callbacks reject unsafe redirect destinations; logout invalidates the expected session.
- Provider quota/timeout failures do not expose keys or stack traces and do not break pantry access.

## 7. Requirements mapping

- FR-1 to FR-3: Supabase Auth sign-up/sign-in/sign-out and clear errors.
- NFR-6: Supabase-managed password hashing; no app-managed plaintext credentials.
- NFR-7: admin-only catalog mutation through RLS and server-side role checks.
- NFR-8: server-side validation, parameterized data access and safe rendering.

## 8. Official references

- [Supabase Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
