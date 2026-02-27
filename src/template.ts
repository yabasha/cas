import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import * as p from '@clack/prompts'
import pc from 'picocolors'

import type { CasOptions, ScaffoldResult, TemplateVars } from './types.js'
import { directoryExists, exec, isOnline, removeDirectory } from './utils.js'

const TEMPLATE_REPO = 'https://github.com/yabasha/composable-ai-stack.git'

// Directories to remove based on component selection
const COMPONENT_DIRS: Record<string, string> = {
  api: 'apps/api',
  worker: 'apps/worker',
  evals: 'packages/evals',
  config: 'packages/config',
}

// Files to process for template variable replacement
const TEMPLATE_FILES = [
  'package.json',
  'README.md',
  'apps/web/package.json',
  'apps/api/package.json',
  'apps/worker/package.json',
  'apps/convex/package.json',
  'packages/ai/package.json',
  'packages/config/package.json',
  'packages/evals/package.json',
  'packages/prompts/package.json',
  'packages/schemas/package.json',
  'packages/shared/package.json',
]

/**
 * Replace template variables in content
 */
function replaceTemplateVars(content: string, vars: TemplateVars): string {
  return content
    .replace(/\{\{projectName\}\}/g, vars.projectName)
    .replace(/\{\{author\}\}/g, vars.author)
    .replace(/\{\{license\}\}/g, vars.license)
    .replace(/\{\{year\}\}/g, vars.year)
    .replace(/composable-ai-stack/g, vars.projectName)
}

/**
 * Process a single file for template variables
 */
async function processTemplateFile(filePath: string, vars: TemplateVars): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const processed = replaceTemplateVars(content, vars)
    if (processed !== content) {
      await writeFile(filePath, processed, 'utf-8')
    }
  } catch {
    // File might not exist if component was removed, skip silently
  }
}

/**
 * Get install command for package manager
 */
function getInstallCommand(pm: CasOptions['packageManager']): { cmd: string; args: string[] } {
  switch (pm) {
    case 'bun':
      return { cmd: 'bun', args: ['install'] }
    case 'npm':
      return { cmd: 'npm', args: ['install'] }
    case 'yarn':
      return { cmd: 'yarn', args: ['install'] }
    case 'pnpm':
      return { cmd: 'pnpm', args: ['install'] }
  }
}

/**
 * Log dry-run action
 */
function dryRunLog(message: string): void {
  console.log(pc.yellow(`[dry-run] ${message}`))
}

/**
 * Scaffold RAG module with Qdrant support
 */
async function scaffoldRagModule(projectPath: string, vars: TemplateVars): Promise<void> {
  const ragDir = join(projectPath, 'packages', 'rag')
  const srcDir = join(ragDir, 'src')
  await mkdir(srcDir, { recursive: true })

  // package.json
  await writeFile(
    join(ragDir, 'package.json'),
    JSON.stringify(
      {
        name: `@${vars.projectName}/rag`,
        version: '0.0.1',
        private: true,
        type: 'module',
        main: './src/index.ts',
        types: './src/index.ts',
        scripts: {
          typecheck: 'tsc --noEmit',
        },
        dependencies: {
          '@qdrant/js-client-rest': '^1.13.0',
          ai: '^4.3.16',
        },
        devDependencies: {
          typescript: '^5.7.3',
        },
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  )

  // tsconfig.json
  await writeFile(
    join(ragDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          outDir: './dist',
          rootDir: './src',
          declaration: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  )

  // src/qdrant.ts
  await writeFile(
    join(srcDir, 'qdrant.ts'),
    `import { QdrantClient } from '@qdrant/js-client-rest'

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'
const QDRANT_API_KEY = process.env.QDRANT_API_KEY

/**
 * Shared Qdrant client instance.
 * Reads QDRANT_URL and QDRANT_API_KEY from environment variables.
 */
export const qdrant = new QdrantClient({
  url: QDRANT_URL,
  ...(QDRANT_API_KEY ? { apiKey: QDRANT_API_KEY } : {}),
})
`,
    'utf-8',
  )

  // src/embeddings.ts
  await writeFile(
    join(srcDir, 'embeddings.ts'),
    `import { embed, embedMany } from 'ai'
import type { EmbeddingModel } from 'ai'

/**
 * Generate a single embedding vector for the given text.
 */
export async function generateEmbedding(
  model: EmbeddingModel<string>,
  text: string,
): Promise<number[]> {
  const { embedding } = await embed({ model, value: text })
  return embedding
}

/**
 * Generate embedding vectors for multiple texts in a single batch.
 */
export async function generateEmbeddings(
  model: EmbeddingModel<string>,
  texts: string[],
): Promise<number[][]> {
  const { embeddings } = await embedMany({ model, values: texts })
  return embeddings
}
`,
    'utf-8',
  )

  // src/retriever.ts
  await writeFile(
    join(srcDir, 'retriever.ts'),
    `import type { EmbeddingModel } from 'ai'

import { generateEmbedding, generateEmbeddings } from './embeddings.js'
import { qdrant } from './qdrant.js'

export interface Document {
  id: string | number
  content: string
  metadata?: Record<string, unknown>
}

export interface SearchResult {
  id: string | number
  score: number
  content: string
  metadata?: Record<string, unknown>
}

/**
 * Ensure a collection exists with the given vector size.
 */
export async function ensureCollection(
  collectionName: string,
  vectorSize: number,
): Promise<void> {
  const collections = await qdrant.getCollections()
  const exists = collections.collections.some((c) => c.name === collectionName)
  if (!exists) {
    await qdrant.createCollection(collectionName, {
      vectors: { size: vectorSize, distance: 'Cosine' },
    })
  }
}

/**
 * Upsert documents into a Qdrant collection.
 */
export async function upsertDocuments(
  collectionName: string,
  model: EmbeddingModel<string>,
  documents: Document[],
): Promise<void> {
  const embeddings = await generateEmbeddings(
    model,
    documents.map((d) => d.content),
  )

  await qdrant.upsert(collectionName, {
    wait: true,
    points: documents.map((doc, i) => ({
      id: typeof doc.id === 'string' ? doc.id : doc.id,
      vector: embeddings[i],
      payload: {
        content: doc.content,
        ...(doc.metadata || {}),
      },
    })),
  })
}

/**
 * Search for similar documents by text query.
 */
export async function searchDocuments(
  collectionName: string,
  model: EmbeddingModel<string>,
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  const queryVector = await generateEmbedding(model, query)

  const results = await qdrant.search(collectionName, {
    vector: queryVector,
    limit,
    with_payload: true,
  })

  return results.map((r) => ({
    id: r.id,
    score: r.score,
    content: (r.payload?.content as string) || '',
    metadata: r.payload as Record<string, unknown>,
  }))
}

/**
 * Delete documents from a Qdrant collection by IDs.
 */
export async function deleteDocuments(
  collectionName: string,
  ids: (string | number)[],
): Promise<void> {
  await qdrant.delete(collectionName, {
    wait: true,
    points: ids,
  })
}
`,
    'utf-8',
  )

  // src/index.ts
  await writeFile(
    join(srcDir, 'index.ts'),
    `export { qdrant } from './qdrant.js'
export { generateEmbedding, generateEmbeddings } from './embeddings.js'
export {
  ensureCollection,
  upsertDocuments,
  searchDocuments,
  deleteDocuments,
} from './retriever.js'
export type { Document, SearchResult } from './retriever.js'
`,
    'utf-8',
  )

  // docker-compose.qdrant.yml at project root
  await writeFile(
    join(projectPath, 'docker-compose.qdrant.yml'),
    `services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      QDRANT__SERVICE__GRPC_PORT: 6334

volumes:
  qdrant_storage:
`,
    'utf-8',
  )

  // Append env vars to .env.example
  const envExamplePath = join(projectPath, '.env.example')
  let envContent = ''
  try {
    envContent = await readFile(envExamplePath, 'utf-8')
  } catch {
    // File may not exist
  }
  const ragEnvVars = `
# RAG / Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
`
  await writeFile(envExamplePath, envContent + ragEnvVars, 'utf-8')

  // Append RAG section to README.md
  const readmePath = join(projectPath, 'README.md')
  let readmeContent = ''
  try {
    readmeContent = await readFile(readmePath, 'utf-8')
  } catch {
    // File may not exist
  }
  const ragReadme = `
## RAG (Retrieval-Augmented Generation)

This project includes a RAG module powered by [Qdrant](https://qdrant.tech/) vector database and the Vercel AI SDK.

### Setup

1. **Start Qdrant** (Docker):
   \`\`\`bash
   docker compose -f docker-compose.qdrant.yml up -d
   \`\`\`

2. **Configure environment variables** in \`.env\`:
   \`\`\`
   QDRANT_URL=http://localhost:6333
   QDRANT_API_KEY=         # optional for local development
   \`\`\`

### Usage

#### Ingest documents

\`\`\`typescript
import { ensureCollection, upsertDocuments } from '@${vars.projectName}/rag'
import { openai } from '@ai-sdk/openai'

const model = openai.embedding('text-embedding-3-small')

// Create collection (1536 = dimensions for text-embedding-3-small)
await ensureCollection('docs', 1536)

// Upsert documents
await upsertDocuments('docs', model, [
  { id: '1', content: 'Qdrant is a vector database.' },
  { id: '2', content: 'RAG combines retrieval with generation.' },
])
\`\`\`

#### Query documents

\`\`\`typescript
import { searchDocuments } from '@${vars.projectName}/rag'
import { openai } from '@ai-sdk/openai'

const model = openai.embedding('text-embedding-3-small')

const results = await searchDocuments('docs', model, 'What is a vector database?', 5)
console.log(results)
\`\`\`
`
  await writeFile(readmePath, readmeContent + ragReadme, 'utf-8')
}

/**
 * Scaffold a new project from the template
 */
export async function scaffold(options: CasOptions): Promise<ScaffoldResult> {
  const projectPath = join(process.cwd(), options.dir)
  const errors: string[] = []

  // Check online status
  const spinner = p.spinner()
  spinner.start('Checking network connectivity...')

  if (!options.dryRun) {
    const online = await isOnline()
    if (!online) {
      spinner.stop('Network check failed')
      return {
        success: false,
        projectPath,
        errors: ['No network connectivity. Please check your internet connection and try again.'],
      }
    }
  }
  spinner.stop('Network connectivity verified')

  // Check target directory
  if (await directoryExists(projectPath)) {
    if (!options.force) {
      return {
        success: false,
        projectPath,
        errors: [`Directory "${options.dir}" already exists. Use --force to overwrite.`],
      }
    }

    if (options.dryRun) {
      dryRunLog(`Would remove existing directory: ${projectPath}`)
    } else {
      spinner.start('Removing existing directory...')
      await removeDirectory(projectPath)
      spinner.stop('Existing directory removed')
    }
  }

  // Clone template
  if (options.dryRun) {
    dryRunLog(`Would clone template from ${TEMPLATE_REPO} to ${projectPath}`)
  } else {
    spinner.start('Cloning template...')
    const cloneResult = await exec('git', ['clone', '--depth', '1', TEMPLATE_REPO, projectPath])

    if (cloneResult.exitCode !== 0) {
      spinner.stop('Clone failed')
      await removeDirectory(projectPath)
      return {
        success: false,
        projectPath,
        errors: [`Failed to clone template: ${cloneResult.stderr}`],
      }
    }
    spinner.stop('Template cloned')
  }

  // Remove .git directory
  if (options.dryRun) {
    dryRunLog(`Would remove .git directory`)
  } else {
    spinner.start('Cleaning up...')
    await removeDirectory(join(projectPath, '.git'))
    spinner.stop('Cleanup complete')
  }

  // Remove unselected components
  const componentsToRemove: string[] = []
  if (!options.withApi) componentsToRemove.push('api')
  if (!options.withWorker) componentsToRemove.push('worker')
  if (!options.withEvals) componentsToRemove.push('evals')
  if (!options.withConfig) componentsToRemove.push('config')

  if (componentsToRemove.length > 0) {
    if (options.dryRun) {
      for (const component of componentsToRemove) {
        dryRunLog(`Would remove component: ${COMPONENT_DIRS[component]}`)
      }
    } else {
      spinner.start('Removing unselected components...')
      for (const component of componentsToRemove) {
        const dirPath = join(projectPath, COMPONENT_DIRS[component])
        if (await directoryExists(dirPath)) {
          await removeDirectory(dirPath)
        }
      }
      spinner.stop('Components removed')
    }
  }

  // Process template variables
  const templateVars: TemplateVars = {
    projectName: options.projectName,
    author: options.author,
    license: options.license,
    year: new Date().getFullYear().toString(),
  }

  if (options.dryRun) {
    dryRunLog(`Would replace template variables:`)
    dryRunLog(`  projectName: ${templateVars.projectName}`)
    dryRunLog(`  author: ${templateVars.author}`)
    dryRunLog(`  license: ${templateVars.license}`)
    dryRunLog(`  year: ${templateVars.year}`)
  } else {
    spinner.start('Processing template variables...')
    for (const file of TEMPLATE_FILES) {
      const filePath = join(projectPath, file)
      await processTemplateFile(filePath, templateVars)
    }

    // Also process any additional package.json files we might have missed
    try {
      const appsDir = join(projectPath, 'apps')
      const packagesDir = join(projectPath, 'packages')

      for (const dir of [appsDir, packagesDir]) {
        if (await directoryExists(dir)) {
          const entries = await readdir(dir, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const pkgJson = join(dir, entry.name, 'package.json')
              await processTemplateFile(pkgJson, templateVars)
            }
          }
        }
      }
    } catch {
      // Ignore errors when scanning directories
    }

    spinner.stop('Template variables processed')
  }

  // Scaffold RAG module if requested
  if (options.withRag) {
    if (options.dryRun) {
      dryRunLog('Would scaffold RAG module in packages/rag')
      dryRunLog('Would create docker-compose.qdrant.yml')
      dryRunLog('Would add QDRANT_URL and QDRANT_API_KEY to .env.example')
      dryRunLog('Would append RAG documentation to README.md')
    } else {
      spinner.start('Scaffolding RAG module with Qdrant...')
      await scaffoldRagModule(projectPath, templateVars)
      spinner.stop('RAG module scaffolded')
    }
  }

  // Initialize git
  if (!options.noGit) {
    if (options.dryRun) {
      dryRunLog(`Would initialize git repository`)
    } else {
      spinner.start('Initializing git repository...')
      const gitInitResult = await exec('git', ['init'], { cwd: projectPath })
      if (gitInitResult.exitCode !== 0) {
        errors.push(`Warning: Failed to initialize git: ${gitInitResult.stderr}`)
      }
      spinner.stop('Git repository initialized')
    }
  }

  // Install dependencies
  if (!options.noInstall) {
    const { cmd, args } = getInstallCommand(options.packageManager)

    if (options.dryRun) {
      dryRunLog(`Would run: ${cmd} ${args.join(' ')}`)
    } else {
      spinner.start(`Installing dependencies with ${options.packageManager}...`)
      const installResult = await exec(cmd, args, {
        cwd: projectPath,
        timeout: 300000, // 5 minutes
      })

      if (installResult.exitCode !== 0) {
        spinner.stop('Dependency installation failed')
        errors.push(`Warning: Failed to install dependencies: ${installResult.stderr}`)
        errors.push(`You can manually run "${cmd} ${args.join(' ')}" in the project directory.`)
      } else {
        spinner.stop('Dependencies installed')
      }
    }
  }

  return {
    success: errors.length === 0,
    projectPath,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Print success message with next steps
 */
export function printSuccessMessage(options: CasOptions): void {
  console.log()
  p.outro(pc.green('Project created successfully!'))

  console.log()
  console.log(pc.bold('Next steps:'))
  console.log()
  console.log(`  ${pc.cyan('cd')} ${options.dir}`)

  if (options.noInstall) {
    console.log(`  ${pc.cyan(options.packageManager)} install`)
  }

  console.log(`  ${pc.cyan(options.packageManager)} dev`)
  console.log()

  // Show included components
  const includedComponents: string[] = []
  if (options.withApi) includedComponents.push('API (apps/api)')
  if (options.withWorker) includedComponents.push('Worker (apps/worker)')
  if (options.withEvals) includedComponents.push('Evals (packages/evals)')
  if (options.withConfig) includedComponents.push('Config (packages/config)')
  if (options.withRag) includedComponents.push('RAG / Qdrant (packages/rag)')

  if (includedComponents.length > 0) {
    console.log(pc.dim('Included components:'))
    for (const component of includedComponents) {
      console.log(pc.dim(`  - ${component}`))
    }
    console.log()
  }

  // Convex reminder
  console.log(
    pc.yellow('Note: Run `npx convex dev` to initialize Convex after setting up your account.'),
  )
  console.log()
}

/**
 * Print failure message
 */
export function printFailureMessage(errors: string[]): void {
  console.log()
  p.outro(pc.red('Project creation failed'))

  console.log()
  for (const error of errors) {
    console.log(pc.red(`  ${error}`))
  }
  console.log()
}
