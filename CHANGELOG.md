# @yabasha/cas

## 0.2.0

Sync CLI with the Composable AI Stack `v0.1.0` foundation cut (env validation,
Convex Auth, Stripe webhook verification, BullMQ worker, AI/evals packages,
hardened Elysia, Langfuse observability).

### Breaking

- `packages/config` is no longer removable. It is now imported by `apps/convex`
  (always scaffolded) for Zod-validated env loading, so removing it would
  produce a broken workspace. The `--with-config` flag is preserved as a
  deprecated no-op so existing scripts keep working; `packages/config` is
  always written to disk.

### Changed

- Component hints now describe what's actually inside each app:
  - `apps/api` — *Hardened Elysia gateway (pino, CORS, bearer, rate limit, Stripe webhooks)*.
  - `apps/worker` — *BullMQ + Convex scheduled functions (Bun)*.
  - `packages/evals` — *Eval harness with Langfuse scoring*.
- "Next steps" output now prompts the user to copy `.env.example` to `.env`
  before running `dev`, since the template gained a Zod env schema with
  required fields (Convex deployment URL, Stripe secrets, LLM keys,
  Langfuse keys, Redis URL).
- README rewritten to document the new foundation: Convex Auth, Stripe
  webhook idempotency, CSP middleware, guardrail pattern, BullMQ, Langfuse,
  env surface, and the in-memory rate limiter swap path.

## 0.1.2

Sync CLI with the latest Composable AI Stack template.

### Changed

- API service description corrected from "Hono" to **ElysiaJS** (matches `apps/api` in the template, which uses Elysia 1.4.22 on Bun).
- Background worker hint updated to mention the eval runner.
- Convex setup hint now uses `bunx convex dev` when the package manager is Bun (the recommended default).
- `--version` flag now reports the package version correctly (was stuck at `0.1.0`).
- README expanded with the current pinned tech stack (Bun 1.3.7, Turborepo 2.7.6, Next.js 16, React 19, Tailwind 4, Convex 1.31, Elysia 1.4, TypeScript 5.9) and a pointer to the template's `CLAUDE.md` / `AGENTS.md`.

## 0.1.1

Release/publish workflow fixes (npm auth, lockfile flag). No functional changes.

## 0.1.0

Initial release of the Composable AI Stack CLI scaffolding tool.

### Features

- Interactive and non-interactive project scaffolding
- Template cloning from composable-ai-stack repository
- Optional component selection (API, Worker, Evals, Config)
- Template variable replacement
- Multiple package manager support (bun, npm, yarn, pnpm)
- Dry-run mode for preview
