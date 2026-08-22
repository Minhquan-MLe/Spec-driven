# Requirements — Skeleton App + Basic Layout

## Phase

Roadmap Phase 1 (`specs/roadmap.md`): "Skeleton app + basic layout."

## Scope

- Stand up a minimal Hono server on Node.js, on top of the existing
  TypeScript scaffold (`hono` and `@hono/node-server` are already
  installed).
- A shared page layout composed of three subcomponents: a header (brand +
  nav placeholder, no real links yet), a main content area, and a footer.
- The shared stylesheet correctly linked from the layout and served via
  static file middleware.
- The shared layout and stylesheet are responsive (per `specs/tech-stack.md`):
  a viewport meta tag, fluid/relative-unit layout, and a media query
  breakpoint so the header and content stay usable on mobile-width screens.
- A minimal `/` home page, using the shared layout, with AgentClinic-
  specific content: an "AgentClinic" heading, a one-line description drawn
  from `specs/mission.md`, and a link to `/dashboard`.
- One stub `/dashboard` route, reusing the same shared layout, with
  placeholder content — this is the seed of the staff dashboard called out
  in `specs/mission.md`.
- No other routes, no ailments/therapies/booking logic, no persistence.

## Out of scope

- Any domain data model (ailments, therapies, appointments) — that's
  Phases 2–4.
- Real navigation links or deeper visual polish (colors/typography beyond a
  minimal, non-broken look) — deferred to Phase 5 per the roadmap.
- Auth, database, deployment config.

## Decisions

- **Framework:** Hono + `@hono/node-server`, per `specs/tech-stack.md`.
- **Rendering:** server-rendered HTML via Hono, no client-side framework
  (per `tech-stack.md`'s "no separate frontend framework yet").
- **Layout:** a single shared layout function, composed of three
  subcomponents (`header`, `main`, `footer`) under `src/components/`, used
  by both routes so later phases add pages without re-deriving the shell.
  Navigation lives inside the `header` subcomponent.
- **File structure:** each subcomponent lives in its own file
  (`src/components/header.ts`, `src/components/main.ts`,
  `src/components/footer.ts`), not bundled together, so each can be
  edited/extended independently as later phases add real content.
- **Data:** none — both routes render static content only; the home
  page's copy is hardcoded, not sourced from a data model.
- **Home page content:** minimal and static — a heading, one line of
  description, and a link to `/dashboard`. No marketing copy or imagery.
- **Responsive design:** a baseline requirement for this phase, not
  deferred to Phase 5 — the layout already ships a
  `<meta name="viewport">` tag and fluid units; this phase adds a media
  query so the header stacks (instead of overflowing) on narrow screens.
- **Testing:** automated tests via **Vitest** (per `specs/tech-stack.md`),
  run with `npm test`. The Hono app is exported separately from server
  startup (`src/app.ts` vs. `src/index.ts`) so routes can be exercised in
  tests via `app.request()` without binding a port.

## Context

This is the first implemented phase of AgentClinic. Its only goal is to
prove the chosen stack (TypeScript + Hono + Node.js) runs end to end and
produces a presentable shell, per `specs/mission.md`'s target audience of
course students and conference demo builders — the app needs to run
reliably and build up visibly in small steps starting here.
