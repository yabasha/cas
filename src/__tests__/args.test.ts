import { describe, expect, it } from 'vitest'

import { createProgram, needsInteractiveMode, parseOptions } from '../args.js'

describe('createProgram', () => {
  it('creates a program with the correct name', () => {
    const program = createProgram()
    expect(program.name()).toBe('cas')
  })

  it('has an init command as default', () => {
    const program = createProgram()
    const initCommand = program.commands.find((c) => c.name() === 'init')
    expect(initCommand).toBeDefined()
  })

  it('init command has create as alias', () => {
    const program = createProgram()
    const initCommand = program.commands.find((c) => c.name() === 'init')
    expect(initCommand?.aliases()).toContain('create')
  })
})

describe('parseOptions', () => {
  it('parses project name from positional argument', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: false,
      dryRun: false,
      install: true,
      git: true,
    })
    expect(result.projectName).toBe('my-project')
  })

  it('defaults dir to project name', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: false,
      dryRun: false,
      install: true,
      git: true,
    })
    expect(result.dir).toBe('my-project')
  })

  it('allows custom dir override', () => {
    const result = parseOptions('my-project', {
      dir: 'custom-dir',
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: false,
      dryRun: false,
      install: true,
      git: true,
    })
    expect(result.dir).toBe('custom-dir')
  })

  it('handles --all preset', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: true,
      minimal: false,
      dryRun: false,
      install: true,
      git: true,
    })
    expect(result.withApi).toBe(true)
    expect(result.withWorker).toBe(true)
    expect(result.withEvals).toBe(true)
    expect(result.withConfig).toBe(true)
    expect(result.withRag).toBe(true)
  })

  it('handles --minimal preset', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: true,
      dryRun: false,
      install: true,
      git: true,
    })
    expect(result.withApi).toBe(false)
    expect(result.withWorker).toBe(false)
    expect(result.withEvals).toBe(false)
    expect(result.withConfig).toBe(false)
    expect(result.withRag).toBe(false)
  })

  it('handles --with-rag flag', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: false,
      withApi: false,
      withWorker: false,
      withEvals: false,
      withConfig: false,
      withRag: true,
      dryRun: false,
      install: true,
      git: true,
    })
    expect(result.withRag).toBe(true)
  })

  it('throws when both --all and --minimal are used', () => {
    expect(() =>
      parseOptions('my-project', {
        packageManager: 'bun',
        force: false,
        all: true,
        minimal: true,
        dryRun: false,
        install: true,
        git: true,
      }),
    ).toThrow('Cannot use both --all and --minimal flags together')
  })

  it('defaults package-manager to bun', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: false,
      dryRun: false,
      install: true,
      git: true,
    })
    expect(result.packageManager).toBe('bun')
  })

  it('handles individual component flags', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: false,
      withApi: true,
      withWorker: false,
      withEvals: true,
      withConfig: false,
      dryRun: false,
      install: true,
      git: true,
    })
    expect(result.withApi).toBe(true)
    expect(result.withWorker).toBe(false)
    expect(result.withEvals).toBe(true)
    expect(result.withConfig).toBe(false)
  })

  it('handles --no-install flag', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: false,
      dryRun: false,
      install: false,
      git: true,
    })
    expect(result.noInstall).toBe(true)
  })

  it('handles --no-git flag', () => {
    const result = parseOptions('my-project', {
      packageManager: 'bun',
      force: false,
      all: false,
      minimal: false,
      dryRun: false,
      install: true,
      git: false,
    })
    expect(result.noGit).toBe(true)
  })
})

describe('needsInteractiveMode', () => {
  it('returns true when project name is missing', () => {
    expect(
      needsInteractiveMode({
        all: true,
      }),
    ).toBe(true)
  })

  it('returns true when no component selection was made', () => {
    expect(
      needsInteractiveMode({
        projectName: 'my-project',
        withApi: false,
        withWorker: false,
        withEvals: false,
        withConfig: false,
        all: false,
        minimal: false,
      }),
    ).toBe(true)
  })

  it('returns false when --all is used', () => {
    expect(
      needsInteractiveMode({
        projectName: 'my-project',
        all: true,
      }),
    ).toBe(false)
  })

  it('returns false when --minimal is used', () => {
    expect(
      needsInteractiveMode({
        projectName: 'my-project',
        minimal: true,
      }),
    ).toBe(false)
  })

  it('returns false when individual components are selected', () => {
    expect(
      needsInteractiveMode({
        projectName: 'my-project',
        withApi: true,
      }),
    ).toBe(false)
  })

  it('returns false when --with-rag is used', () => {
    expect(
      needsInteractiveMode({
        projectName: 'my-project',
        withRag: true,
      }),
    ).toBe(false)
  })
})
