# Roadmap

High-level implementation order, broken into small phases. Each phase should
be small enough to spec, build, and validate on its own before moving to the
next.

## Phase 1 — Skeleton app + basic layout (Complete)

- Stand up a minimal Hono server on top of the existing TypeScript scaffold.
- Add a basic page layout / shell (header, nav placeholder, content area)
  shared across pages.
- Add a stub dashboard route so staff have a landing page, even with no real
  data yet.
- Goal: prove the stack runs end to end and looks presentable before any
  domain logic exists.

## Phase 2 — Agents & ailments

- Define the ailment data model (what an ailment is, its fields, how it
  relates to an agent).
- Build a way to list and view ailments.
- Surface ailments on the staff dashboard.

## Phase 3 — Therapies

- Define the therapy data model and how therapies map to ailments.
- Build a way for an agent to browse therapies relevant to a reported
  ailment.

## Phase 4 — Appointment booking

- Define the appointment data model (agent, therapy/staff, time slot).
- Let an agent book an appointment against an available slot.
- Surface upcoming appointments on the staff dashboard.

## Phase 5 — Polish & hardening

- Responsive/visual polish for the dashboard and agent-facing pages (Steve's
  "attractive, modern browser" requirement).
- Basic validation and error handling across the flows above.
- Revisit persistence, auth, and deployment needs based on what's been
  learned building Phases 1–4.

## Notes

- This order can change as feature specs are written — the roadmap is a
  starting sequence, not a fixed contract.
- Persistence, auth, and infrastructure decisions are deliberately deferred
  until a phase actually needs them (see `tech-stack.md`).
