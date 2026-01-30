import { execa, type Options as ExecaOptions } from 'execa'
import pc from 'picocolors'

export type Runtime = 'bun' | 'node'

// Augment globalThis for Bun detection
declare global {
  var Bun: unknown
}

/**
 * Detect the current JavaScript runtime
 */
export function detectRuntime(): Runtime {
  if (typeof globalThis.Bun !== 'undefined') {
    return 'bun'
  }
  return 'node'
}

/**
 * Execute a command with cross-runtime support
 */
export async function exec(
  cmd: string,
  args: string[] = [],
  opts: ExecaOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa(cmd, args, {
      ...opts,
      reject: false,
    })
    return {
      stdout: String(result.stdout ?? ''),
      stderr: String(result.stderr ?? ''),
      exitCode: result.exitCode ?? 1,
    }
  } catch (error: any) {
    return {
      stdout: '',
      stderr: error.message || 'Unknown error',
      exitCode: 1,
    }
  }
}

/**
 * Check if the machine has network connectivity
 */
export async function isOnline(): Promise<boolean> {
  try {
    const result = await exec('git', ['ls-remote', 'https://github.com/yabasha/composable-ai-stack.git', 'HEAD'], {
      timeout: 10000,
    })
    return result.exitCode === 0
  } catch {
    return false
  }
}

/**
 * Get the git user.name from global config
 */
export async function getGitUserName(): Promise<string> {
  const result = await exec('git', ['config', '--global', 'user.name'])
  return result.stdout.trim()
}

/**
 * Validate a project name against naming conventions
 * Must start with a lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores
 */
export function validateProjectName(name: string): { valid: boolean; message?: string } {
  if (!name) {
    return { valid: false, message: 'Project name is required' }
  }

  if (name.length > 214) {
    return { valid: false, message: 'Project name must be 214 characters or less' }
  }

  const validPattern = /^[a-z][a-z0-9-_]*$/
  if (!validPattern.test(name)) {
    return {
      valid: false,
      message:
        'Project name must start with a lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores',
    }
  }

  return { valid: true }
}

/**
 * Convert a string to a valid project name slug
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/-+/g, '-')
    .replace(/-$/, '')
}

/**
 * Check for available updates (non-blocking)
 */
export async function checkForUpdates(currentVersion: string): Promise<string | null> {
  try {
    const result = await exec('npm', ['view', '@yabasha/cas', 'version'], {
      timeout: 5000,
    })

    if (result.exitCode !== 0) {
      return null
    }

    const latestVersion = result.stdout.trim()
    if (latestVersion && latestVersion !== currentVersion) {
      return latestVersion
    }

    return null
  } catch {
    return null
  }
}

/**
 * Format an update notification message
 */
export function formatUpdateMessage(currentVersion: string, latestVersion: string): string {
  return `
${pc.yellow('╭─────────────────────────────────────────╮')}
${pc.yellow('│')}  Update available: ${pc.gray(currentVersion)} → ${pc.green(latestVersion)}    ${pc.yellow('│')}
${pc.yellow('│')}  Run ${pc.cyan('npm i -g @yabasha/cas')} to update  ${pc.yellow('│')}
${pc.yellow('╰─────────────────────────────────────────╯')}
`
}

/**
 * Check if a directory exists
 */
export async function directoryExists(path: string): Promise<boolean> {
  const { stat } = await import('node:fs/promises')
  try {
    const stats = await stat(path)
    return stats.isDirectory()
  } catch {
    return false
  }
}

/**
 * Remove a directory recursively
 */
export async function removeDirectory(path: string): Promise<void> {
  const { rm } = await import('node:fs/promises')
  await rm(path, { recursive: true, force: true })
}
