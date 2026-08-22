# Requirements — MVP Verification & Hardening

## Phase

Not a new roadmap phase — both phases in `specs/roadmap.md` (skeleton +
"Agents, ailments, therapies, appointments & polish") are implemented and
their own validation checklists are complete. This spec closes the loop
into an actual MVP: it verifies the built system against `mission.md`'s
"Success looks like" criteria in a real browser (Phase 2's validation.md
explicitly notes visual/responsive rendering was never screenshotted —
only confirmed via `curl`), fixes anything that verification turns up, and
formally resolves the roadmap's open "revisit persistence, auth, and
deployment needs" note.

## Scope

### Decision: persistence, auth, deployment (closing the roadmap's open note)

Per stakeholder decision for this MVP:

- **Persistence:** stay in-memory. No database or file-backed store is
  introduced. Matches `mission.md`'s teaching/conference-booth audience —
  a fresh state per restart is acceptable, and it keeps the codebase
  simple for students to read.
- **Auth:** none. The agent JSON API and the `/dashboard` stay open,
  matching the mission's demo-first framing.
- **Deployment:** none. The MVP runs via `npm start`, same as every prior
  phase — no hosting target is chosen this round.

This resolves `roadmap.md`'s Phase 2 note ("Revisit persistence, auth, and
deployment needs...") as "revisited, no change" rather than leaving it
open indefinitely.

### Browser verification

- Load `/` and `/dashboard` in an actual browser (not just `curl`) at
  three representative viewport widths: mobile (~375px), tablet (~768px),
  desktop (~1280px).
- Exercise the full agent loop (report an ailment → list matching
  therapies → list available slots → book an appointment) and confirm the
  dashboard reflects each step live, styled by PicoCSS, at all three
  widths.
- Confirm no horizontal overflow / clipped content at the mobile width,
  per `tech-stack.md`'s responsive baseline requirement.

### Hardening (only if verification finds a problem)

- Fix concrete responsive/visual issues found during the above — e.g. the
  dashboard's `<table>` elements have no overflow wrapper, so a long
  `agentId` or ISO timestamp could force horizontal scrolling of the whole
  page at the mobile width rather than just the table.
- Any fix here is scoped to what verification actually finds — this is
  not a license to re-polish visuals beyond what's already shipped.

### Documentation

- Update `roadmap.md`'s Phase 2 section (or add a short "MVP" note below
  it) to record that persistence/auth/deployment were revisited and
  intentionally left unchanged, so a future contributor doesn't treat it
  as still-open.

## Out of scope

- Any new feature (editing/deleting records, agent HTML form, pagination,
  search, filtering, etc.) — none of that was requested for MVP.
- Persistence, auth, or deployment work of any kind — explicitly declined
  above.
- Visual/branding redesign beyond fixing concrete overflow/clipping bugs
  found during verification.

## Decisions

- **Verification tooling:** the `claude-in-chrome` browser automation
  tools, resizing the viewport to the three widths above, since Phase 2's
  validation explicitly flagged this as unverified.
- **Fix threshold:** only fix issues actually observed during
  verification (e.g. overflow/clipping); do not preemptively rewrite
  styling that already renders correctly.

## Context

`mission.md`'s "Success looks like" section requires the UI to be "usable
and legible on mobile, tablet, and desktop viewport widths, not just a
fixed desktop layout" and "presentable enough to demo to non-technical
stakeholders." Phase 2 built toward that with PicoCSS but its own
validation.md admits the rendering was never actually checked in a
browser. Given the stakeholder chose not to add persistence, auth, or
deployment work for this MVP, verifying (and if needed, fixing) that
existing responsive/visual claim is the one concrete gap left before this
can be called a true MVP.
