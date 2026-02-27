export type License = 'MIT' | 'Apache-2.0' | 'ISC' | 'GPL-3.0' | 'BSD-3-Clause' | 'UNLICENSED'

export type PackageManager = 'bun' | 'npm' | 'yarn' | 'pnpm'

export interface CasOptions {
  projectName: string
  dir: string
  author: string
  license: License
  withApi: boolean
  withWorker: boolean
  withEvals: boolean
  withConfig: boolean
  withRag?: boolean
  all: boolean
  minimal: boolean
  force: boolean
  noInstall: boolean
  noGit: boolean
  packageManager: PackageManager
  dryRun: boolean
}

export interface ScaffoldResult {
  success: boolean
  projectPath: string
  errors?: string[]
}

export interface TemplateVars {
  projectName: string
  author: string
  license: string
  year: string
}
