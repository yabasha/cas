import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scaffold } from '../template.js'
import type { CasOptions } from '../types.js'

const TEST_DIR = join(process.cwd(), '.test-output')
const TEST_PROJECT = 'test-project'
const TEST_PROJECT_PATH = join(TEST_DIR, TEST_PROJECT)

const baseOptions: CasOptions = {
  projectName: TEST_PROJECT,
  dir: join('.test-output', TEST_PROJECT),
  author: 'Test Author',
  license: 'MIT',
  withApi: true,
  withWorker: true,
  withEvals: true,
  withConfig: true,
  all: false,
  minimal: false,
  force: true,
  noInstall: true, // Skip install for faster tests
  noGit: true, // Skip git for faster tests
  packageManager: 'bun',
  dryRun: false,
}

describe('scaffold', () => {
  beforeEach(async () => {
    // Clean up before each test
    if (existsSync(TEST_PROJECT_PATH)) {
      await rm(TEST_PROJECT_PATH, { recursive: true, force: true })
    }
  })

  afterEach(async () => {
    // Clean up after each test
    if (existsSync(TEST_PROJECT_PATH)) {
      await rm(TEST_PROJECT_PATH, { recursive: true, force: true })
    }
  })

  it('creates project directory', async () => {
    const result = await scaffold(baseOptions)

    // If network fails, skip the test
    if (!result.success && result.errors?.some((e) => e.includes('network'))) {
      console.log('Skipping test: no network connectivity')
      return
    }

    expect(result.success).toBe(true)
    expect(existsSync(TEST_PROJECT_PATH)).toBe(true)
  }, 60000) // 60 second timeout for clone

  it('respects dry-run mode', async () => {
    const result = await scaffold({
      ...baseOptions,
      dryRun: true,
    })

    expect(result.success).toBe(true)
    // Directory should NOT be created in dry-run mode
    expect(existsSync(TEST_PROJECT_PATH)).toBe(false)
  })

  it('fails when directory exists without --force', async () => {
    // First create the directory
    const { mkdir } = await import('node:fs/promises')
    await mkdir(TEST_PROJECT_PATH, { recursive: true })

    const result = await scaffold({
      ...baseOptions,
      force: false,
    })

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors?.[0]).toContain('already exists')
  })

  it('removes unselected components', async () => {
    const result = await scaffold({
      ...baseOptions,
      withApi: false,
      withWorker: true,
      withEvals: false,
      withConfig: false,
    })

    // If network fails, skip the test
    if (!result.success && result.errors?.some((e) => e.includes('network'))) {
      console.log('Skipping test: no network connectivity')
      return
    }

    expect(result.success).toBe(true)

    // API should be removed
    expect(existsSync(join(TEST_PROJECT_PATH, 'apps', 'api'))).toBe(false)

    // Worker should exist
    expect(existsSync(join(TEST_PROJECT_PATH, 'apps', 'worker'))).toBe(true)

    // Evals should be removed
    expect(existsSync(join(TEST_PROJECT_PATH, 'packages', 'evals'))).toBe(false)

    // Config should be removed
    expect(existsSync(join(TEST_PROJECT_PATH, 'packages', 'config'))).toBe(false)
  }, 60000)

  it('handles minimal preset correctly', async () => {
    const result = await scaffold({
      ...baseOptions,
      withApi: false,
      withWorker: false,
      withEvals: false,
      withConfig: false,
      minimal: true,
    })

    // If network fails, skip the test
    if (!result.success && result.errors?.some((e) => e.includes('network'))) {
      console.log('Skipping test: no network connectivity')
      return
    }

    expect(result.success).toBe(true)

    // All optional components should be removed
    expect(existsSync(join(TEST_PROJECT_PATH, 'apps', 'api'))).toBe(false)
    expect(existsSync(join(TEST_PROJECT_PATH, 'apps', 'worker'))).toBe(false)
    expect(existsSync(join(TEST_PROJECT_PATH, 'packages', 'evals'))).toBe(false)
    expect(existsSync(join(TEST_PROJECT_PATH, 'packages', 'config'))).toBe(false)

    // Core directories should still exist
    expect(existsSync(join(TEST_PROJECT_PATH, 'apps', 'web'))).toBe(true)
    expect(existsSync(join(TEST_PROJECT_PATH, 'packages', 'ai'))).toBe(true)
    expect(existsSync(join(TEST_PROJECT_PATH, 'packages', 'shared'))).toBe(true)
  }, 60000)
})
