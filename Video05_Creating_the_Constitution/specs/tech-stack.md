# Tech Stack

## Language

- **TypeScript** end to end (server and any client code). Satisfies Mary's
  requirement for a TypeScript-based stack and gives us type safety across
  the codebase as features grow.

## Server framework

- **Hono**, running on **Node.js**. Hono is a small, fast, popular
  TypeScript-first web framework — easy to reason about, quick to build on,
  and well suited to serving both a JSON API (for agents) and rendered pages
  (for the staff dashboard).

## Build & tooling

- **`tsc`** for compilation (already scaffolded in `package.json` /
  `tsconfig.json`).
- **npm** for package management.
- Keep dependencies minimal in early phases; add libraries only when a
  feature phase actually needs them.

## Frontend / dashboard

- Server-rendered pages via Hono to start (no separate frontend framework
  yet). This keeps the stack small and lets Steve's "attractive, modern
  browser" requirement be met with plain HTML/CSS first.
- Revisit whether a client-side framework is needed once the dashboard's
  interactivity requirements are clearer.
- **Responsive design is a baseline requirement, not deferred polish**:
  fluid/relative units (`%`, `rem`, `max-width`) over fixed pixel widths, a
  `<meta name="viewport">` tag, and CSS media query breakpoints wherever a
  fixed-width layout would break on mobile/tablet screens.
- **PicoCSS** for base styling, linked from the shared layout's `<head>`.
  It's a classless/semantic-HTML CSS framework — plain `<header>`,
  `<nav>`, `<main>`, `<button>`, `<table>`, form elements, etc. get
  sensible, responsive, light/dark-aware styling with no utility-class
  soup, which keeps markup close to plain HTML per Steve's "attractive,
  modern browser" requirement without hand-rolling a design system.
  Supersedes the from-scratch `public/styles.css` written in Phase 1;
  only AgentClinic-specific touches (e.g. brand mark) stay as custom CSS
  layered on top.

## Testing

- **Vitest** for validation/automated tests once a phase's requirements
  call for them. Fast, TypeScript-native, and low-config alongside the
  existing `tsc` build.
- Run via a `test` script in `package.json` (`vitest run`).

## Data

- **PostgreSQL 16**, run locally via Docker Compose (`compose.yaml`) —
  see `specs/2026-08-30-postgres-crud-ui/`. Schema and starter data are
  managed by hand-written SQL migrations under `src/db/migrations/`,
  applied with `npm run db:migrate` and seeded with `npm run db:seed`
  (see `README.md` for exact commands).
- Plain **`pg`** (node-postgres) for database access — no ORM, per the
  "keep dependencies minimal" principle above.
- **Transitional state:** the database and its schema exist and are
  fully runnable, but the application itself (`src/store.ts` and the
  routes/dashboard that use it) still reads/writes an in-memory store.
  Wiring the app to Postgres is a later phase in
  `specs/2026-08-30-postgres-crud-ui/plan.md` — until then, restarting
  the Node process still resets ailment/appointment data even though
  the database itself persists.

## Non-goals (for now)

- No mobile app.
- No microservices — a single deployable service until there's a concrete
  reason to split it.
