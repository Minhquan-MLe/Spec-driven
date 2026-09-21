import { statSync } from 'node:fs'
import { join } from 'node:path'
import { header } from './components/header'
import { main, type MainOptions } from './components/main'
import { footer } from './components/footer'

// /styles.css is served with Last-Modified but no Cache-Control, so browsers
// may reuse a stale copy for days — even on a normal reload — after the file
// changes. Tagging the URL with the file's mtime gives every edit a new URL
// that no browser cache has seen. Same cwd-relative root as serveStatic.
function stylesheetVersion(): string {
  try {
    return String(Math.floor(statSync(join(process.cwd(), 'public', 'styles.css')).mtimeMs))
  } catch {
    return '0'
  }
}

export function layout(title: string, content: string, options: MainOptions = {}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
    />
    <link rel="stylesheet" href="/styles.css?v=${stylesheetVersion()}" />
  </head>
  <body>
    ${header()}
    ${main(content, options)}
    ${footer()}
  </body>
</html>`
}
