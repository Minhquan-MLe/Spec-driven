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
- **Live, not transitional:** `src/store.ts` has no in-memory arrays —
  every ailment/therapy/slot/appointment read and write goes through
  `src/db/repository/` to Postgres via a shared `pg.Pool`
  (`src/db/index.ts`). Restarting the Node process no longer resets any
  data; only the small `Idempotency-Key` replay cache
  (`src/idempotency.ts`) is still intentionally in memory. Automated
  tests still run against an in-memory manual mock
  (`src/__mocks__/store.ts`) so `npm test` needs no database; a
  separate `npm run test:db` exercises the real repository layer
  against a dedicated `agentclinic_test` database.
- **Reliability:** the shared `pg.Pool` (`createPool()` in
  `src/db/index.ts`) attaches one `error` listener to every pool it
  creates. `pg.Pool` emits `error` when an *idle* client is
  disconnected in the background — e.g. Postgres terminating the
  connection on `docker compose stop`/`restart` — and Node's default
  behavior for an unlistened `error` event is to crash the process;
  the listener logs a concise, safe message (`err.message` only —
  never the connection string, password, or full error object) instead
  of letting that happen. This doesn't touch normal query error
  handling: a request made while Postgres is unavailable still fails
  and still returns the existing generic `500` response. No retry loop
  was added — `pg.Pool` already opens a fresh connection lazily on the
  next query, so once Postgres is reachable again the same running
  process serves database requests normally with no manual restart.
  Verified live: `specs/2026-08-30-postgres-crud-ui/validation.md`'s
  "Hotfix validation" section.

## Non-goals (for now)

- No mobile app.
- No microservices — a single deployable service until there's a concrete
  reason to split it.
