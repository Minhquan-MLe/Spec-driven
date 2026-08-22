import { describe, expect, it } from 'vitest'
import { layout } from './layout'

describe('layout', () => {
  it('composes the header, main content, and footer around the page title and stylesheet', () => {
    const html = layout('Page Title', '<p>body content</p>')

    expect(html).toContain('<title>Page Title</title>')
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
    )
    expect(html).toContain('cdn.jsdelivr.net/npm/@picocss/pico')
    expect(html).toContain('<link rel="stylesheet" href="/styles.css" />')
    expect(html).toContain('<header class="site-header">')
    expect(html).toContain('<main class="content">')
    expect(html).toContain('<p>body content</p>')
    expect(html).toContain('<footer class="site-footer">')
  })
})
