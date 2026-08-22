# Plan — Skeleton App + Basic Layout

Numbered task groups, organized by technical layer. Complete each group
before moving to the next.

## 1. Server bootstrap

1.1. Create the Hono app (`src/app.ts`), replacing the current empty
     scaffold. Keep it separate from server startup so tests can exercise
     routes via `app.request()` without binding a port.
1.2. Create a thin entry point (`src/index.ts`) that imports the app and
     wires it up to `@hono/node-server` so it listens on a local port.
1.3. Update `package.json` scripts so the app can be built (`tsc`) and run
     locally (e.g. `npm start`).

## 2. Layout component

2.1. Add a shared layout function composed of three subcomponents: a
     `header` (brand + nav placeholder), a `main` (content area), and a
     `footer`.
2.2. Put each subcomponent in its own file under `src/components/`
     (`header.ts`, `main.ts`, `footer.ts`), imported by the shared layout
     — not one combined components file.
2.3. Keep it framework-free — plain HTML strings/JSX-via-Hono, no client
     framework.
2.4. Link the shared stylesheet (`/styles.css`) in the layout's `<head>`,
     and confirm it's actually reachable via the static file middleware.

## 3. Routes

3.1. Add `/` route rendering the shared layout.
3.2. Add `/dashboard` route rendering the shared layout with placeholder
     dashboard content.

## 4. Minimal AgentClinic home page

4.1. Replace the `/` route's placeholder content with minimal
     AgentClinic-specific content: an "AgentClinic" heading and a one-line
     description drawn from `specs/mission.md` (a clinic for AI agents to
     report ailments, find therapies, and book appointments).
4.2. Add a link from the home page to `/dashboard`.
4.3. Keep it minimal — no marketing copy, imagery, or styling beyond what's
     needed to make the homepage recognizably AgentClinic rather than a
     blank placeholder.

## 5. Static assets / minimal styling

5.1. Add a small stylesheet (served as a static asset) so the shell looks
     intentional rather than unstyled — no responsive/visual polish, just
     enough to not look broken.

## 6. Automated tests (Vitest)

6.1. Add `vitest` as a dev dependency and a `test` script in
     `package.json` (`vitest run`), per `specs/tech-stack.md`.
6.2. Unit tests for each layout subcomponent (`header`, `main`, `footer`)
     confirming they render their expected markup.
6.3. A test for `layout()` confirming it composes header/main/footer
     around the given title and content, and links `/styles.css`.
6.4. Route tests for `/` and `/dashboard` (via `app.request()`) confirming
     status 200, expected content, and the shared layout markup.
6.5. Exclude `*.test.ts` from the `tsc` build (`tsconfig.json`) so test
     files aren't emitted to `dist/`.

## 7. Manual smoke check

7.1. Run the server locally.
7.2. Visit `/` and `/dashboard` in a browser; confirm both render the
     shared layout without errors.
7.3. Confirm the home page shows the AgentClinic heading/description and
     that its link to `/dashboard` works.
7.4. Confirm both pages render a header (with nav placeholder), a main
     content area, and a footer, and that `/styles.css` loads (200
     response, applied styling visible).
7.5. Confirm `npm run build` succeeds with no TypeScript errors and
     `npm test` passes.
