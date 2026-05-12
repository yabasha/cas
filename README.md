# @yabasha/cas

A CLI scaffolding tool for the **[Composable AI Stack](https://github.com/yabasha/composable-ai-stack)** — quickly bootstrap a Bun + Turborepo + Convex monorepo for AI-powered applications, with optional components you can opt into.

## What you get

The template the CLI clones is a hardened, production-ready monorepo for AI-integrated SaaS apps. Highlights from the latest cut:

- **Env validation** via `@acme/config` — a Zod schema with `NODE_ENV`-conditional required fields and a frozen `env` export.
- **Convex Auth** (`@convex-dev/auth` with Password provider) plus `requireUser` / `requireUserDoc` guards.
- **Stripe webhook handler** at `POST /stripe/webhook` with async signature verification (Web Crypto), idempotency markers written *after* successful processing, and Stripe-friendly retries on failure.
- **Hardened Elysia gateway** with `pino` structured logging (header redaction), CORS, `timingSafeEqual` bearer guard, in-memory rate limiter with periodic sweep, and SIGINT/SIGTERM graceful shutdown.
- **CSP middleware** with per-request nonces, `'strict-dynamic'`, dev-only `'unsafe-eval'`, and `upgrade-insecure-requests` gated to production.
- **`@acme/ai` guardrail pattern** (`runWithGuardrails`) — Vercel AI SDK + Zod input/output schemas + moderation hook + automatic Langfuse tracing.
- **BullMQ worker** with Convex scheduled functions for cron-like jobs.
- **Eval harness** (`@acme/evals`) with Langfuse scoring and non-zero exit on regression.

### Layout

- `apps/web` — Next.js 16 (App Router) + Tailwind 4 + shadcn/ui, CSP middleware
- `apps/convex` *(always)* — Convex backend, Convex Auth, Stripe webhook, idempotency table
- `apps/api` *(optional)* — Hardened ElysiaJS API gateway on Bun
- `apps/worker` *(optional)* — BullMQ background worker & eval runner (Bun)
- `packages/ai` *(always)* — Vercel AI SDK + Langfuse tracing + guardrail pattern
- `packages/config` *(always)* — Zod env schema + dotenv loader
- `packages/prompts` *(always)* — versioned prompt templates
- `packages/schemas` *(always)* — Zod schema definitions
- `packages/shared` *(always)* — shared utilities
- `packages/evals` *(optional)* — eval harness with Langfuse scoring
- `tooling/scripts/check-versions.ts` — fails CI if pinned versions drift

> **Why `packages/config` and `packages/ai` are always included:** they are workspace dependencies of `apps/convex` (env validation) and `apps/worker` (LLM calls). Removing them would produce a broken scaffold.

### Pinned tech stack (template defaults)

| Tool | Version |
|---|---|
| Bun | 1.3.7 |
| Turborepo | 2.7.6 |
| TypeScript | 5.9.3 |
| Next.js | 16.1.6 (App Router) |
| React | 19.2.4 |
| Tailwind CSS | 4.1.18 |
| ElysiaJS | 1.4.22 |
| Convex | 1.31.6 |
| ESLint | 9.39.2 |
| Prettier | 3.8.1 |

The template ships with `bun run check:versions` so CI can fail if any pinned dependency drifts.

## Features

- **Interactive & non-interactive modes** — guided prompts or CLI flags
- **Component selection** — opt into:
  - API Service (`apps/api`, hardened ElysiaJS on Bun)
  - Background Worker (`apps/worker`, BullMQ + Convex scheduled functions)
  - AI Evaluations (`packages/evals`, Langfuse-scored)
- **Template customization** — replaces project name, author, license, and year across all `package.json` files
- **Multi-package-manager support** — `bun` (default), `npm`, `yarn`, `pnpm`
- **Dry-run mode** — preview the plan without writing anything
- **Git initialization** — fresh repo by default (`--no-git` to skip)
- **Update notifications** — checks npm for newer versions of `@yabasha/cas`

## Installation

```bash
# Global installation with bun (recommended)
bun add -g @yabasha/cas

# Or with npm (Node.js fallback)
npm install -g @yabasha/cas
```

## Usage

### Interactive Mode

Run without arguments to use the interactive prompt:

```bash
cas init
```

This will guide you through:
1. Project name
2. Author name
3. License selection
4. Component selection
5. Package manager choice

### Non-interactive Mode

Provide all options via CLI flags:

```bash
# Create with all optional components
cas init my-project --all

# Create minimal project (no optional components)
cas init my-project --minimal

# Select specific components
cas init my-project --with-api --with-worker

# Full customization
cas init my-project \
  --author "Your Name" \
  --license MIT \
  --package-manager bun \
  --with-api \
  --with-evals
```

### Using bunx/npx

```bash
# With bun (recommended)
bunx @yabasha/cas init my-project

# With npm (Node.js fallback)
npx @yabasha/cas init my-project
```

## CLI Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--dir <path>` | `-d` | Target directory (defaults to project name) |
| `--author <name>` | `-a` | Author name for package.json |
| `--license <license>` | `-l` | License type |
| `--with-api` | | Include hardened ElysiaJS API service (`apps/api`) |
| `--with-worker` | | Include BullMQ background worker (`apps/worker`) |
| `--with-evals` | | Include AI evaluations (`packages/evals`) |
| `--with-config` | | *Deprecated:* `packages/config` is always included (required by `apps/convex`) |
| `--all` | | Include all optional components |
| `--minimal` | | Exclude all optional components (`packages/config` and `packages/ai` are always included) |
| `--force` | `-f` | Overwrite existing directory |
| `--no-install` | | Skip dependency installation |
| `--no-git` | | Skip git repository initialization |
| `--package-manager <pm>` | `-p` | Package manager: `bun` (default), `npm`, `yarn`, `pnpm` |
| `--dry-run` | | Preview changes without creating files |

### Supported Licenses

- `MIT` (default)
- `Apache-2.0`
- `ISC`
- `GPL-3.0`
- `BSD-3-Clause`
- `UNLICENSED`

## Examples

### Create a full-stack AI project

```bash
cas init my-ai-app --all --author "Jane Doe" --license MIT
```

### Create API-only project

```bash
cas init my-api --with-api --minimal
```

### Preview what would be created

```bash
cas init my-project --all --dry-run
```

### Force recreate existing project

```bash
cas init my-project --force --all
```

### Skip automatic dependency installation

```bash
cas init my-project --all --no-install
```

## Project Structure

After scaffolding with `--all`, you'll get:

```
my-project/
├── apps/
│   ├── web/          # Next.js 16 + Tailwind 4 + shadcn/ui + CSP middleware
│   ├── convex/       # Convex + Convex Auth + Stripe webhooks (primary backend)
│   ├── api/          # Hardened Elysia gateway (optional)
│   └── worker/       # BullMQ + Convex scheduled functions (optional)
├── packages/
│   ├── ai/           # Vercel AI SDK + Langfuse tracing + runWithGuardrails
│   ├── config/       # Zod env schema + dotenv loader
│   ├── prompts/      # Versioned prompt templates
│   ├── schemas/      # Zod schema definitions
│   ├── shared/       # Shared utilities
│   └── evals/        # Eval harness with Langfuse scoring (optional)
├── tooling/
│   └── scripts/      # check-versions and other repo tooling
├── .env.example      # Required env surface (Convex, Stripe, LLM, Langfuse, Redis)
├── turbo.json
├── package.json
├── CLAUDE.md         # Guidance for Claude / Claude Code
├── AGENTS.md
└── README.md
```

## Environment variables

After scaffolding, copy `.env.example` to `.env` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` | yes | From `bunx convex dev` output |
| `NEXT_PUBLIC_APP_URL`, `SITE_URL` | yes | Web origin (CORS + CSP + Auth) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | yes (if billing) | Required by the Convex webhook handler |
| `API_BEARER_TOKEN`, `API_PORT` | if `apps/api` | Elysia bearer guard + listen port |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | yes (LLM) | Consumed by `@acme/ai` |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` | yes (tracing) | Default base URL is `https://cloud.langfuse.com` |
| `REDIS_URL` | if `apps/worker` | BullMQ connection string |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | optional | External OAuth provider |
| `WEBHOOK_TOLERANCE_SECONDS`, `LOG_LEVEL` | optional | Hardening tunables |

> Convex secrets live in the Convex dashboard, not `.env`. Use `bunx convex env set <NAME> <VALUE>` from `apps/convex`.

## Scaling the rate limiter (apps/api)

`apps/api` ships an in-memory rate limiter (`src/middleware/rate-limit.ts`) that's fine for single-instance deployments. For multi-worker/multi-region deployments, swap the backing store for Upstash or Redis:

1. `bun add --filter=api @upstash/ratelimit @upstash/redis`
2. Replace the `Map` in `rate-limit.ts` with an Upstash `Ratelimit` instance.
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

The middleware exposes `X-RateLimit-Backend: memory` so you can verify which store is in use at runtime.

## Programmatic API

You can also use the scaffolding functionality programmatically:

```typescript
import { scaffold, validateProjectName, slugify } from '@yabasha/cas'

// Scaffold a new project
const result = await scaffold({
  projectName: 'my-project',
  dir: './my-project',
  author: 'Your Name',
  license: 'MIT',
  withApi: true,
  withWorker: true,
  withEvals: false,
  withConfig: true, // ignored — packages/config is always scaffolded
  all: false,
  minimal: false,
  force: false,
  noInstall: false,
  noGit: false,
  packageManager: 'bun',
  dryRun: false,
})

if (result.success) {
  console.log('Project created at:', result.dir)
}

// Validate project name (npm conventions)
const validation = validateProjectName('my-project')
if (!validation.valid) {
  console.error(validation.message)
}

// Convert name to slug
const slug = slugify('My Project Name') // 'my-project-name'
```

### Exported Functions

| Function | Description |
|----------|-------------|
| `scaffold(options)` | Main scaffolding function |
| `validateProjectName(name)` | Validates project name against npm conventions |
| `slugify(name)` | Converts a string to a valid package name |
| `printSuccessMessage(options)` | Displays success message with next steps |

## Development

### Prerequisites

- Bun (recommended)
- Node.js 20+ (fallback)

### Setup

```bash
# Clone the repository
git clone https://github.com/yabasha/cas.git
cd cas

# Install dependencies
bun install

# Build the project
bun run build

# Run in development mode
bun run dev
```

### Scripts

| Script | Description |
|--------|-------------|
| `bun run build` | Build the CLI |
| `bun run dev` | Watch mode with auto-rebuild |
| `bun run lint` | Run ESLint |
| `bun run format` | Format code with Prettier |
| `bun test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |

### Testing

```bash
# Run all tests
bun test

# Watch mode
bun run test:watch
```

### Project Structure

```
src/
├── __tests__/        # Unit tests
├── args.ts           # CLI argument parsing
├── banner.ts         # ASCII banner display
├── cli.ts            # Main CLI entry point
├── index.ts          # Public API exports
├── prompts.ts        # Interactive prompts
├── template.ts       # Template processing logic
├── types.ts          # TypeScript type definitions
└── utils.ts          # Utility functions
```

## Requirements

- Bun (recommended) or Node.js 20+ (fallback)
- Internet connection (for cloning the template repository)
- Git (for repository initialization)

> **Note:** This CLI is built with full Bun support. Node.js is supported as a fallback runtime and will be automatically detected.

## Related

- [Composable AI Stack](https://github.com/yabasha/composable-ai-stack) - The template repository

## License

MIT
