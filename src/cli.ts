import pc from 'picocolors'

import { createProgram, needsInteractiveMode, parseOptions } from './args.js'
import { printBanner } from './banner.js'
import { runInteractivePrompts } from './prompts.js'
import { printFailureMessage, printSuccessMessage, scaffold } from './template.js'
import type { CasOptions } from './types.js'
import { checkForUpdates, formatUpdateMessage } from './utils.js'

const VERSION = '0.1.0'

export async function run(argv: string[] = process.argv): Promise<void> {
  // Print banner
  printBanner()

  // Fire non-blocking update check
  const updatePromise = checkForUpdates(VERSION)

  // Parse arguments
  const program = createProgram()
  await program.parseAsync(argv)

  // Get the parsed command
  const initCommand = program.commands.find((c) => c.name() === 'init')
  if (!initCommand) {
    return
  }

  const projectName = initCommand.args[0]
  const opts = initCommand.opts()

  let options: Partial<CasOptions>
  try {
    options = parseOptions(projectName, opts)
  } catch (error: any) {
    console.error(pc.red(`Error: ${error.message}`))
    process.exit(1)
  }

  // Check if interactive mode is needed
  let finalOptions: CasOptions
  if (needsInteractiveMode(options)) {
    finalOptions = await runInteractivePrompts(options)
  } else {
    // Fill in defaults for non-interactive mode
    finalOptions = {
      projectName: options.projectName!,
      dir: options.dir || options.projectName!,
      author: options.author || '',
      license: options.license || 'MIT',
      withApi: options.withApi || false,
      withWorker: options.withWorker || false,
      withEvals: options.withEvals || false,
      withConfig: options.withConfig || false,
      withRag: options.withRag || false,
      all: options.all || false,
      minimal: options.minimal || false,
      force: options.force || false,
      noInstall: options.noInstall || false,
      noGit: options.noGit || false,
      packageManager: options.packageManager || 'bun',
      dryRun: options.dryRun || false,
    }
  }

  // Warn if non-bun package manager
  if (finalOptions.packageManager !== 'bun') {
    console.log()
    console.log(
      pc.yellow(
        `Warning: Using ${finalOptions.packageManager} instead of bun. Some features may not work as expected.`,
      ),
    )
    console.log()
  }

  // Handle dry-run
  if (finalOptions.dryRun) {
    console.log()
    console.log(pc.cyan('Dry-run mode enabled. No changes will be made.'))
    console.log()
    console.log(pc.bold('Configuration:'))
    console.log(`  Project name: ${finalOptions.projectName}`)
    console.log(`  Directory: ${finalOptions.dir}`)
    console.log(`  Author: ${finalOptions.author || '(not set)'}`)
    console.log(`  License: ${finalOptions.license}`)
    console.log(`  Components:`)
    console.log(`    - API: ${finalOptions.withApi ? 'yes' : 'no'}`)
    console.log(`    - Worker: ${finalOptions.withWorker ? 'yes' : 'no'}`)
    console.log(`    - Evals: ${finalOptions.withEvals ? 'yes' : 'no'}`)
    console.log(`    - Config: ${finalOptions.withConfig ? 'yes' : 'no'}`)
    console.log(`    - RAG (Qdrant): ${finalOptions.withRag ? 'yes' : 'no'}`)
    console.log(`  Package manager: ${finalOptions.packageManager}`)
    console.log(`  Install dependencies: ${finalOptions.noInstall ? 'no' : 'yes'}`)
    console.log(`  Initialize git: ${finalOptions.noGit ? 'no' : 'yes'}`)
    console.log(`  Force overwrite: ${finalOptions.force ? 'yes' : 'no'}`)
    console.log()
  }

  // Execute scaffold
  const result = await scaffold(finalOptions)

  // Show result
  if (result.success) {
    printSuccessMessage(finalOptions)
  } else {
    printFailureMessage(result.errors || ['Unknown error occurred'])
    process.exit(1)
  }

  // Check for updates (non-blocking)
  const latestVersion = await updatePromise
  if (latestVersion) {
    console.log(formatUpdateMessage(VERSION, latestVersion))
  }
}

// Entry point detection for both CJS and ESM
const isCjsMain =
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  (require as any).main === module
const isEsmMain =
  typeof import.meta !== 'undefined' && (import.meta as any).url === `file://${process.argv[1]}`

if (isCjsMain || isEsmMain) {
  run()
}
