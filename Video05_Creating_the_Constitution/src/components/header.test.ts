import { describe, expect, it } from 'vitest'
import { header } from './header'

describe('header', () => {
  it('renders the brand and a nav placeholder', () => {
    const html = header()
    expect(html).toContain('AgentClinic')
    expect(html).toContain('<nav class="site-nav">')
  })
})
