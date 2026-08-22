import { describe, expect, it } from 'vitest'
import { main } from './main'

describe('main', () => {
  it('wraps the given content in a main content area', () => {
    const html = main('<p>hello</p>')
    expect(html).toContain('<main class="content">')
    expect(html).toContain('<p>hello</p>')
  })
})
