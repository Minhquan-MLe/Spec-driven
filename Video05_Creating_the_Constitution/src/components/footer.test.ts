import { describe, expect, it } from 'vitest'
import { footer } from './footer'

describe('footer', () => {
  it('renders the site footer', () => {
    const html = footer()
    expect(html).toContain('<footer class="site-footer">')
    expect(html).toContain('AgentClinic')
  })
})
