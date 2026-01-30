import { Command, InvalidArgumentError } from 'commander'

import type { CasOptions, License, PackageManager } from './types.js'

const VALID_LICENSES: License[] = ['MIT', 'Apache-2.0', 'ISC', 'GPL-3.0', 'BSD-3-Clause', 'UNLICENSED']
const VALID_PACKAGE_MANAGERS: PackageManager[] = ['bun', 'npm', 'yarn', 'pnpm']

function validateLicense(value: string): License {
  if (!VALID_LICENSES.includes(value as License)) {
    throw new InvalidArgumentError(
      `Invalid license. Must be one of: ${VALID_LICENSES.join(', ')}`,
    )
  }
  return value as License
}

function validatePackageManager(value: string): PackageManager {
  if (!VALID_PACKAGE_MANAGERS.includes(value as PackageManager)) {
    throw new InvalidArgumentError(
      `Invalid package manager. Must be one of: ${VALID_PACKAGE_MANAGERS.join(', ')}`,
    )
  }
  return value as PackageManager
}

export function createProgram(): Command {
  const program = new Command()
    .name('cas')
    .description('CLI scaffolding tool for the Composable AI Stack')
    .version('0.1.0')

  const initCommand = new Command('init')
    .alias('create')
    .description('Create a new Composable AI Stack project')
    .argument('[project-name]', 'Name of the project')
    .option('-d, --dir <path>', 'Target directory (defaults to project name)')
    .option('-a, --author <name>', 'Author name for package.json')
    .option('-l, --license <license>', 'License type', validateLicense)
    .option('--with-api', 'Include API service', false)
    .option('--with-worker', 'Include background worker', false)
    .option('--with-evals', 'Include AI evaluation package', false)
    .option('--with-config', 'Include shared config package', false)
    .option('--all', 'Include all optional components', false)
    .option('--minimal', 'Exclude all optional components', false)
    .option('-f, --force', 'Overwrite existing directory', false)
    .option('--no-install', 'Skip dependency installation')
    .option('--no-git', 'Skip git initialization')
    .option(
      '-p, --package-manager <pm>',
      'Package manager to use',
      validatePackageManager,
      'bun' as PackageManager,
    )
    .option('--dry-run', 'Show what would happen without making changes', false)

  program.addCommand(initCommand, { isDefault: true })

  return program
}

export function parseOptions(projectName: string | undefined, opts: any): Partial<CasOptions> {
  // Validate mutually exclusive flags
  if (opts.all && opts.minimal) {
    throw new Error('Cannot use both --all and --minimal flags together')
  }

  // Resolve component flags based on presets
  let withApi = opts.withApi
  let withWorker = opts.withWorker
  let withEvals = opts.withEvals
  let withConfig = opts.withConfig

  if (opts.all) {
    withApi = true
    withWorker = true
    withEvals = true
    withConfig = true
  } else if (opts.minimal) {
    withApi = false
    withWorker = false
    withEvals = false
    withConfig = false
  }

  const result: Partial<CasOptions> = {
    withApi,
    withWorker,
    withEvals,
    withConfig,
    all: opts.all,
    minimal: opts.minimal,
    force: opts.force,
    noInstall: opts.install === false,
    noGit: opts.git === false,
    packageManager: opts.packageManager,
    dryRun: opts.dryRun,
  }

  if (projectName) {
    result.projectName = projectName
    result.dir = opts.dir || projectName
  } else if (opts.dir) {
    result.dir = opts.dir
  }

  if (opts.author) {
    result.author = opts.author
  }

  if (opts.license) {
    result.license = opts.license
  }

  return result
}

export function needsInteractiveMode(options: Partial<CasOptions>): boolean {
  // If project name is missing, we need interactive mode
  if (!options.projectName) {
    return true
  }

  // If no component selection was made (neither --all, --minimal, nor individual flags)
  if (
    !options.all &&
    !options.minimal &&
    !options.withApi &&
    !options.withWorker &&
    !options.withEvals &&
    !options.withConfig
  ) {
    return true
  }

  return false
}
