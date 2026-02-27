import * as p from '@clack/prompts'
import pc from 'picocolors'

import type { CasOptions, License, PackageManager } from './types.js'
import { getGitUserName, slugify, validateProjectName } from './utils.js'

const LICENSE_OPTIONS: { value: License; label: string }[] = [
  { value: 'MIT', label: 'MIT' },
  { value: 'Apache-2.0', label: 'Apache 2.0' },
  { value: 'ISC', label: 'ISC' },
  { value: 'GPL-3.0', label: 'GPL 3.0' },
  { value: 'BSD-3-Clause', label: 'BSD 3-Clause' },
  { value: 'UNLICENSED', label: 'Unlicensed (Proprietary)' },
]

const PACKAGE_MANAGER_OPTIONS: { value: PackageManager; label: string; hint?: string }[] = [
  { value: 'bun', label: 'bun', hint: 'Recommended' },
  { value: 'npm', label: 'npm' },
  { value: 'yarn', label: 'yarn' },
  { value: 'pnpm', label: 'pnpm' },
]

const COMPONENT_OPTIONS = [
  {
    value: 'api',
    label: 'API Service',
    hint: 'apps/api - Hono-based REST API',
  },
  {
    value: 'worker',
    label: 'Background Worker',
    hint: 'apps/worker - Background job processor',
  },
  {
    value: 'evals',
    label: 'AI Evaluations',
    hint: 'packages/evals - AI model evaluation framework',
  },
  {
    value: 'config',
    label: 'Shared Config',
    hint: 'packages/config - Shared configuration utilities',
  },
  {
    value: 'rag',
    label: 'RAG (Qdrant)',
    hint: 'packages/rag - Vector search with Qdrant + Vercel AI SDK embeddings',
  },
]

export async function runInteractivePrompts(partial: Partial<CasOptions>): Promise<CasOptions> {
  const gitUserName = await getGitUserName()

  p.intro(pc.bgCyan(pc.black(' Composable AI Stack ')))

  const answers = await p.group(
    {
      projectName: () => {
        if (partial.projectName) {
          return Promise.resolve(partial.projectName)
        }
        return p.text({
          message: 'What is your project name?',
          placeholder: 'my-ai-app',
          validate: (value) => {
            const result = validateProjectName(value)
            if (!result.valid) {
              const suggested = slugify(value)
              if (suggested && suggested !== value) {
                return `${result.message}. Try: ${suggested}`
              }
              return result.message
            }
          },
        })
      },

      author: () => {
        if (partial.author) {
          return Promise.resolve(partial.author)
        }
        return p.text({
          message: 'Author name',
          placeholder: gitUserName || 'Your Name',
          initialValue: gitUserName || '',
        })
      },

      license: () => {
        if (partial.license) {
          return Promise.resolve(partial.license)
        }
        return p.select({
          message: 'Select a license',
          options: LICENSE_OPTIONS,
          initialValue: 'MIT' as License,
        })
      },

      components: () => {
        // Skip if preset was used
        if (partial.all || partial.minimal) {
          if (partial.all) {
            return Promise.resolve(['api', 'worker', 'evals', 'config', 'rag'])
          }
          return Promise.resolve([])
        }

        // Check if individual flags were set
        const preselected: string[] = []
        if (partial.withApi) preselected.push('api')
        if (partial.withWorker) preselected.push('worker')
        if (partial.withEvals) preselected.push('evals')
        if (partial.withConfig) preselected.push('config')
        if (partial.withRag) preselected.push('rag')

        if (preselected.length > 0) {
          return Promise.resolve(preselected)
        }

        return p.multiselect({
          message: 'Select optional components to include',
          options: COMPONENT_OPTIONS,
          initialValues: ['api', 'worker'],
          required: false,
        })
      },

      packageManager: () => {
        if (partial.packageManager) {
          return Promise.resolve(partial.packageManager)
        }
        return p.select({
          message: 'Select a package manager',
          options: PACKAGE_MANAGER_OPTIONS,
          initialValue: 'bun' as PackageManager,
        })
      },
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.')
        process.exit(0)
      },
    },
  )

  // Handle cancellation
  if (p.isCancel(answers)) {
    p.cancel('Operation cancelled.')
    process.exit(0)
  }

  const projectName = answers.projectName as string
  const components = answers.components as string[]

  return {
    projectName,
    dir: partial.dir || projectName,
    author: (answers.author as string) || '',
    license: answers.license as License,
    withApi: components.includes('api'),
    withWorker: components.includes('worker'),
    withEvals: components.includes('evals'),
    withConfig: components.includes('config'),
    withRag: components.includes('rag'),
    all: partial.all || false,
    minimal: partial.minimal || false,
    force: partial.force || false,
    noInstall: partial.noInstall || false,
    noGit: partial.noGit || false,
    packageManager: answers.packageManager as PackageManager,
    dryRun: partial.dryRun || false,
  }
}
