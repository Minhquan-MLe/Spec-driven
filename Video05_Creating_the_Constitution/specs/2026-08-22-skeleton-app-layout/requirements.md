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
- Real navigation links, styling polish, or responsive design — deferred to
  Phase 5 per the roadmap.
- Automated tests / test tooling — not part of this phase.
- Auth, database, deployment config.

## Decisions

- **Framework:** Hono + `@hono/node-server`, per `specs/tech-stack.md`.
- **Rendering:** server-rendered HTML via Hono, no client-side framework
  (per `tech-stack.md`'s "no separate frontend framework yet").
- **Layout:** a single shared layout function, composed of three
  subcomponents (`header`, `main`, `footer`) under `src/components/`, used
  by both routes so later phases add pages without re-deriving the shell.
  Navigation lives inside the `header` subcomponent.
- **Data:** none — both routes render static content only; the home
  page's copy is hardcoded, not sourced from a data model.
- **Home page content:** minimal and static — a heading, one line of
  description, and a link to `/dashboard`. No marketing copy or imagery.

## Context

This is the first implemented phase of AgentClinic. Its only goal is to
prove the chosen stack (TypeScript + Hono + Node.js) runs end to end and
produces a presentable shell, per `specs/mission.md`'s target audience of
course students and conference demo builders — the app needs to run
reliably and build up visibly in small steps starting here.
