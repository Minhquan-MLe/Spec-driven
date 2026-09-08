"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
function main(content, options = {}) {
    const className = options.wide ? 'content content--wide' : 'content';
    return `
    <main class="${className}">
      ${content}
    </main>
  `;
}
