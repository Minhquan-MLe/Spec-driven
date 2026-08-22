import { header } from './components/header'
import { main } from './components/main'
import { footer } from './components/footer'

export function layout(title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    ${header()}
    ${main(content)}
    ${footer()}
  </body>
</html>`
}
