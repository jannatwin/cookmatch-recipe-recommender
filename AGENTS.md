# Instructions for AI coding agents

Before changing code, read:

1. `implementation.md` for the selected stack, architecture, data-source constraints and build sequence.
2. `CookMatch Software Requirements Specification.md` for product requirements and acceptance intent.
3. The relevant supporting documents (`API.md`, `Authentication_and_Security.md`, `cookmatch_architecture_and_database.md`, `Design.md`, `Integration.md`, and `Testing & QA.md`) for detailed behavior and rationale.

## Source of truth

- The SRS is the baseline for what CookMatch does.
- `implementation.md` selects TypeScript, Next.js App Router, Tailwind CSS, Supabase/PostgreSQL and Vercel. It supersedes older stack proposals such as Express, integer user IDs and app-managed JWTs.
- Supporting documents may contain proposed defaults or older examples. If they conflict with the SRS or `implementation.md`, follow the SRS for product behavior and `implementation.md` for the stack, then update stale docs when the change is in scope.
- Do not silently change scope or redefine ranking behavior. Call out a real ambiguity and make the smallest compatible choice.

## Implementation rules

- Use strict TypeScript and validate untrusted input at runtime.
- Keep provider credentials and any Supabase secret key server-side. Prefer the current publishable/secret API key pair.
- Use migrations for schema changes and RLS for all user/catalog access control.
- Keep recipe provider payloads behind server-only adapters; do not scrape provider sites or assume storage/redistribution rights.
- Keep recommendation scoring deterministic and in a domain module, separate from UI and provider code.
- Preserve accessibility, responsive behavior and the project's documented visual design.
- Follow the build phases and completion gates in `implementation.md`. Report which requirements are complete, how behavior was verified, and any unresolved provider terms or scope decisions.
- Update relevant documentation when implementation changes a documented behavior or setup step.


<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
