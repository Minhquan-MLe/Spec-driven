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

  it('does not hardcode a fixed link color on .content (PicoCSS dark-mode contrast regression guard)', () => {
    // Regression guard: a `.content a { color: ... }` rule previously hardcoded
    // #14213d, which fails WCAG AA against PicoCSS's automatic dark background.
    // Links inside .content should fall through to PicoCSS's own theme-aware
    // link color instead, so no such rule (and no reference to that selector
    // at all) should exist in the stylesheet.
    expect(css).not.toMatch(/\.content\s+a\b/)
  })

  it('defines a wider content variant for the dashboard', () => {
    expect(css).toMatch(/\.content--wide\s*{[^}]*max-width:\s*\d/)
  })

  it('keeps Edit/Delete on one line by default (no wrap, room reserved)', () => {
    const actionsRule = css.match(/\.actions\s*{[^}]*}/)?.[0] ?? ''
    expect(actionsRule).toMatch(/flex-wrap:\s*nowrap/)
    expect(actionsRule).toMatch(/min-width:/)
  })

  it('restores Actions wrapping only on narrow/mobile screens', () => {
    const mediaQueryStart = css.indexOf('@media (max-width: 480px)')
    expect(mediaQueryStart).toBeGreaterThan(-1)
    const narrowBlock = css.slice(mediaQueryStart)
    expect(narrowBlock).toMatch(/\.actions\s*{[^}]*flex-wrap:\s*wrap/)
  })
})
