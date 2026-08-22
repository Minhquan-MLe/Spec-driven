import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'public/styles.css'), 'utf-8')

describe('styles.css', () => {
  it('includes a media query breakpoint for narrow/mobile screens', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/)
  })

  it('lets the header wrap instead of overflowing on narrow screens', () => {
    expect(css).toMatch(/\.site-header\s*{[^}]*flex-wrap:\s*wrap/)
  })
})
