# Roadmap

High-level implementation order, broken into small phases. Each phase should
be small enough to spec, build, and validate on its own before moving to the
next.

## Phase 1 — Skeleton app + basic layout (Complete)

- Stand up a minimal Hono server on top of the existing TypeScript scaffold.
- Add a basic page layout / shell (header, nav placeholder, content area)
  shared across pages, responsive from the start (see `tech-stack.md`) —
  not deferred to Phase 5.
- Add a stub dashboard route so staff have a landing page, even with no real
  data yet.
- Goal: prove the stack runs end to end and looks presentable before any
  domain logic exists.

## Phase 2 — Agents, ailments, therapies, appointments & polish

- Define the ailment data model (what an ailment is, its fields, how it
  relates to an agent).
- Build a way to list and view ailments.
- Surface ailments on the staff dashboard.
- Define the therapy data model and how therapies map to ailments.
- Build a way for an agent to browse therapies relevant to a reported
  ailment.
- Define the appointment data model (agent, therapy/staff, time slot).
- Let an agent book an appointment against an available slot.
- Surface upcoming appointments on the staff dashboard.
- Deeper visual polish for the dashboard and agent-facing pages, beyond the
  responsive baseline established in Phase 1 (Steve's "attractive, modern
  browser" requirement).
- Basic validation and error handling across the flows above.
- Revisit persistence, auth, and deployment needs based on what's been
  learned building Phase 1 and this phase.

## MVP (Complete)

- Phase 2's "revisit persistence, auth, and deployment needs" note was
  revisited for the MVP: all three were intentionally left unchanged.
  In-memory storage, no auth, and no deployment target all still fit
  `mission.md`'s teaching/conference-booth audience — see
  `specs/2026-08-22-mvp-hardening/requirements.md` for the full
  rationale.
- Verified the responsive dashboard/agent loop against `mission.md`'s
  "Success looks like" criteria and wrapped dashboard tables in an
  `overflow-x: auto` container so long unbreakable content (ISO
  timestamps, agent IDs) scrolls within the table instead of the page.

## PostgreSQL Persistence & Ailment/Appointment CRUD UI (Complete)

- Acted on the roadmap's long-deferred persistence note: replaced the
  in-memory store with PostgreSQL 16, run locally via Docker Compose
  (`compose.yaml`), accessed through a hand-written repository layer
  (`src/db/repository/`) — no ORM.
- Added complete Create/Read/Update/Delete for Ailments and
  Appointments at both the JSON API (`/api/ailments`,
  `/api/appointments`) and server-rendered dashboard-UI layers
  (`/ailments/*`, `/appointments/*`), including transactional
  slot reservation/release for appointments.
- Therapies and Slots remain seeded, read-only reference data — no
  authoring UI/API for either, per this phase's decisions.
- Full spec, decisions, and validation evidence:
  `specs/2026-08-30-postgres-crud-ui/`.
- The shared connection pool handles a lost idle connection (e.g. a
  Postgres restart) without crashing the Node process, and reconnects
  automatically once Postgres is back — see `tech-stack.md`'s "Data"
  section and `specs/2026-08-30-postgres-crud-ui/validation.md`'s
  "Hotfix validation" for the live evidence.

## Notes

- This order can change as feature specs are written — the roadmap is a
  starting sequence, not a fixed contract.
- Auth and deployment/infrastructure decisions are still deliberately
  deferred until a phase actually needs them (see `tech-stack.md`).
  Persistence is no longer deferred — see the phase above.
