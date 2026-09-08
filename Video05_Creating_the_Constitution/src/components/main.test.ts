import { describe, expect, it } from 'vitest'
import { main } from './main'

describe('main', () => {
  it('wraps the given content in a main content area', () => {
    const html = main('<p>hello</p>')
    expect(html).toContain('<main class="content">')
    expect(html).toContain('<p>hello</p>')
  })

  it('does not add the wide modifier by default', () => {
    const html = main('<p>hello</p>')
    expect(html).not.toContain('content--wide')
  })

  it('adds the wide modifier when options.wide is true', () => {
    const html = main('<p>hello</p>', { wide: true })
    expect(html).toContain('<main class="content content--wide">')
  })
})
