export interface MainOptions {
  /** Widens the content container for pages with wide tables (see /dashboard). */
  wide?: boolean
}

export function main(content: string, options: MainOptions = {}): string {
  const className = options.wide ? 'content content--wide' : 'content'
  return `
    <main class="${className}">
      ${content}
    </main>
  `
}
