import { describe, expect, it } from 'vitest'

import { detectRuntime, slugify, validateProjectName } from '../utils.js'

describe('validateProjectName', () => {
  it('accepts valid project names', () => {
    expect(validateProjectName('my-project').valid).toBe(true)
    expect(validateProjectName('my_project').valid).toBe(true)
    expect(validateProjectName('myproject').valid).toBe(true)
    expect(validateProjectName('my-project-123').valid).toBe(true)
    expect(validateProjectName('a').valid).toBe(true)
  })

  it('rejects names starting with numbers', () => {
    const result = validateProjectName('123-project')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('start with a lowercase letter')
  })

  it('rejects names starting with hyphens', () => {
    const result = validateProjectName('-project')
    expect(result.valid).toBe(false)
  })

  it('rejects names with uppercase letters', () => {
    const result = validateProjectName('MyProject')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('lowercase')
  })

  it('rejects names with special characters', () => {
    const result = validateProjectName('my@project')
    expect(result.valid).toBe(false)
  })

  it('rejects empty names', () => {
    const result = validateProjectName('')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('required')
  })

  it('rejects names that are too long', () => {
    const longName = 'a'.repeat(215)
    const result = validateProjectName(longName)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('214 characters')
  })
})

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('MyProject')).toBe('myproject')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('my project')).toBe('my-project')
  })

  it('removes special characters', () => {
    expect(slugify('my@project!')).toBe('my-project')
  })

  it('removes leading non-letter characters', () => {
    expect(slugify('123-project')).toBe('project')
    expect(slugify('-my-project')).toBe('my-project')
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('my---project')).toBe('my-project')
  })

  it('removes trailing hyphens', () => {
    expect(slugify('my-project-')).toBe('my-project')
  })

  it('handles complex cases', () => {
    expect(slugify('My Cool Project! 123')).toBe('my-cool-project-123')
  })
})

describe('detectRuntime', () => {
  it('returns a valid runtime', () => {
    const runtime = detectRuntime()
    expect(['bun', 'node']).toContain(runtime)
  })
})
