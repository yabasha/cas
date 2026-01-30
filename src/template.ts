import { readdir, readFile, writeFile } from 'node:fs/promises'
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
        errors: [
          `Directory "${options.dir}" already exists. Use --force to overwrite.`,
        ],
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

  if (includedComponents.length > 0) {
    console.log(pc.dim('Included components:'))
    for (const component of includedComponents) {
      console.log(pc.dim(`  - ${component}`))
    }
    console.log()
  }

  // Convex reminder
  console.log(pc.yellow('Note: Run `npx convex dev` to initialize Convex after setting up your account.'))
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
