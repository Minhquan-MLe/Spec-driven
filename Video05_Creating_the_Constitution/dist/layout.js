"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.layout = layout;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const header_1 = require("./components/header");
const main_1 = require("./components/main");
const footer_1 = require("./components/footer");
// /styles.css is served with Last-Modified but no Cache-Control, so browsers
// may reuse a stale copy for days — even on a normal reload — after the file
// changes. Tagging the URL with the file's mtime gives every edit a new URL
// that no browser cache has seen. Same cwd-relative root as serveStatic.
function stylesheetVersion() {
    try {
        return String(Math.floor((0, node_fs_1.statSync)((0, node_path_1.join)(process.cwd(), 'public', 'styles.css')).mtimeMs));
    }
    catch (_a) {
        return '0';
    }
}
function layout(title, content, options = {}) {
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
    ${(0, header_1.header)()}
    ${(0, main_1.main)(content, options)}
    ${(0, footer_1.footer)()}
  </body>
</html>`;
}
