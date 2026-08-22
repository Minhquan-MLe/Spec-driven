# Requirements — Ailments, Therapies, Appointments & Polish

## Phase

Roadmap Phase 2 (`specs/roadmap.md`): "Agents, ailments, therapies,
appointments & polish." This single feature spec covers the whole phase,
per the decision made when starting it.

## Scope

### Ailments
- An **ailment** has: `id`, `agentId` (free-text identifier of the
  reporting agent), `category` (one of a small fixed set — see Decisions),
  `title`, `description`, `status` (`open` | `resolved`, default `open`),
  `createdAt` (ISO timestamp).
- `POST /api/ailments` — an agent reports an ailment. Validates required
  fields (`agentId`, `category`, `title`, `description`) and that
  `category` is one of the known categories; returns `201` with the
  created ailment or `400` with an error message.
- `GET /api/ailments` — list all ailments (newest first).
- `GET /api/ailments/:id` — fetch one ailment; `404` if not found.
- The staff dashboard (`/dashboard`) lists all reported ailments (id,
  category, title, status).

### Therapies
- A **therapy** has: `id`, `name`, `description`, `categories` (array of
  the ailment categories it addresses).
- Therapies are **seeded, static data** — no therapy-authoring UI/API in
  this phase.
- `GET /api/therapies` — list all therapies.
- `GET /api/ailments/:id/therapies` — therapies whose `categories` include
  the given ailment's `category`; `404` if the ailment doesn't exist.
- The dashboard lists all seeded therapies.

### Appointments
- An **appointment slot** has: `id`, `timeSlot` (ISO datetime string),
  `taken` (boolean). A small fixed set of slots is seeded (see Decisions).
- An **appointment** has: `id`, `agentId`, `therapyId`, `slotId`,
  `createdAt`.
- `GET /api/slots` — list available (`taken: false`) slots.
- `POST /api/appointments` — an agent books an appointment against an
  available slot. Body: `{ agentId, therapyId, slotId }`. Validates the
  therapy and slot exist and the slot isn't already taken; marks the slot
  `taken` and creates the appointment. Returns `201`, `400` (missing
  fields / bad therapy), or `409` (slot already taken).
- `GET /api/appointments` — list all booked appointments.
- The dashboard lists upcoming (booked) appointments.

### Polish
- Basic input validation and consistent JSON error responses
  (`{ "error": "..." }`) across all API endpoints above.
- The shared layout adopts **PicoCSS** (see Decisions) so the new
  dashboard sections (ailment/therapy/appointment lists) render with
  consistent, responsive, out-of-the-box styling instead of hand-rolled
  CSS for each new element.

## Out of scope

- Any real database/persistence — data is in-memory and resets on server
  restart (see Decisions). Persistence is deferred until a phase actually
  needs it, per `tech-stack.md`.
- Auth / authentication of agents or staff.
- Editing or deleting ailments, therapies, appointments, or slots —
  create + list only.
- Therapy authoring UI/API, slot authoring UI/API — both are seeded
  fixtures for this phase.
- Pagination, search, filtering, or sorting beyond "newest first" /
  "available only".
- An HTML form for agents to report ailments — agents interact via the
  JSON API only this phase (see Decisions).
- Deep visual/marketing polish beyond what PicoCSS gives for free (custom
  theming, color palette, branding beyond the existing brand mark) —
  still deferred, per `roadmap.md`'s Phase 2 note.

## Decisions

- **Storage:** a single in-memory store module (`src/store.ts`) holding
  ailments, therapies, slots, and appointments in arrays with
  auto-incrementing numeric ids. No database dependency is introduced
  (per `tech-stack.md`: "no database is committed to yet").
- **Interface split:** agents interact only through a **JSON API** under
  `/api/*`; staff interact only through the existing **server-rendered
  HTML dashboard** (`/dashboard`) reading from the same store — matching
  `mission.md`'s primary-user (agent) / secondary-user (staff) split.
- **Ailment categories:** a small fixed set —
  `performance`, `reliability`, `integration`, `auth`, `other` — used both
  to validate incoming ailments and to match therapies. Chosen over a
  free-text tag or an explicit ailment-to-therapy relation table to keep
  matching simple without a real data model/migration system yet.
- **Therapy & slot seed data:** hardcoded in `src/store.ts` at startup —
  at least one therapy per category, and a small fixed list (5–10) of
  future `timeSlot` values. No admin UI to manage either in this phase.
- **Route organization:** one Hono sub-router per domain area
  (`src/routes/ailments.ts`, `src/routes/therapies.ts`,
  `src/routes/appointments.ts`), each exporting a Hono instance mounted
  onto `app` in `src/app.ts` — keeps `app.ts` from growing into one large
  file as the domain surface grows.
- **Styling:** link **PicoCSS** (via its CDN `<link>`, e.g.
  `@picocss/pico`'s `css/pico.min.css`) from the shared layout's `<head>`,
  alongside — not replacing outright — `public/styles.css`, which is
  trimmed down to only the AgentClinic-specific brand styling Pico
  doesn't provide (e.g. `.site-header__brand` color). New markup for
  ailments/therapies/appointments uses plain semantic HTML (`<table>`,
  `<article>`, `<mark>` for status, etc.) rather than bespoke classes, so
  Pico's default styling applies with no extra CSS needed.
- **Dashboard:** extends the existing `/dashboard` route/stub in `src/app.ts`
  with three sections (ailments, therapies, appointments) reading from the
  same store the API writes to — proving the two interfaces share state,
  not independently mocked data.
- **Testing:** Vitest, following the pattern established in Phase 1 —
  route tests via `app.request()` for each new endpoint (success and
  validation-error cases), plus unit tests for the store's matching logic
  (category → therapies) and slot-booking logic (double-booking
  rejected).

## Context

This is the first feature spec to introduce a real (if minimal) domain
data model, per `mission.md`'s core loop: an agent reports an ailment,
discovers a matching therapy, and books an appointment — all without
human hand-holding. Staff get visibility into that activity through the
dashboard seeded in Phase 1. Keeping storage in-memory and interfaces
(API vs. dashboard) cleanly split keeps this phase demoable and buildable
without committing to persistence or auth decisions before they're
actually needed.
