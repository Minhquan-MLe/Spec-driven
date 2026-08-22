"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.layout = layout;
const header_1 = require("./components/header");
const main_1 = require("./components/main");
const footer_1 = require("./components/footer");
function layout(title, content) {
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
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    ${(0, header_1.header)()}
    ${(0, main_1.main)(content)}
    ${(0, footer_1.footer)()}
  </body>
</html>`;
}
