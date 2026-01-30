# @yabasha/cas

A CLI scaffolding tool for the **Composable AI Stack** - quickly bootstrap monorepo-based AI-powered applications with customizable components.

## Features

- **Interactive & Non-interactive modes** - Use guided prompts or CLI flags
- **Component selection** - Choose which optional components to include:
  - API Service (Hono-based REST API)
  - Background Worker (job processor)
  - AI Evaluations (evaluation framework)
  - Shared Config (utilities)
- **Template customization** - Automatically replaces project name, author, license, and year
- **Multi-package manager support** - bun, npm, yarn, pnpm
- **Dry-run mode** - Preview changes without executing
- **Git initialization** - Optionally set up a fresh git repository
- **Update notifications** - Get notified when a new version is available

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
| `--with-api` | | Include API service (`apps/api`) |
| `--with-worker` | | Include background worker (`apps/worker`) |
| `--with-evals` | | Include AI evaluations (`packages/evals`) |
| `--with-config` | | Include shared config (`packages/config`) |
| `--all` | | Include all optional components |
| `--minimal` | | Exclude all optional components |
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
│   ├── web/          # Next.js frontend
│   ├── api/          # Hono REST API (optional)
│   ├── worker/       # Background job processor (optional)
│   └── convex/       # Convex backend
├── packages/
│   ├── ai/           # AI utilities
│   ├── config/       # Shared configuration (optional)
│   ├── evals/        # AI evaluation framework (optional)
│   ├── prompts/      # Prompt templates
│   ├── schemas/      # Shared schemas
│   └── shared/       # Shared utilities
├── package.json
└── README.md
```

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
  withConfig: false,
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
