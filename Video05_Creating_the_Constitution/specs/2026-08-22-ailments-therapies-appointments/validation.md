# Validation — Ailments, Therapies, Appointments & Polish

## How to know this phase succeeded

This phase is validated by automated Vitest tests plus a manual smoke
test exercising the full agent → ailment → therapy → appointment loop,
per `specs/tech-stack.md` and `specs/mission.md`.

## Checklist

- [x] `npm test` (Vitest) passes, including:
  - [x] Store unit tests: category-to-therapy matching, and slot
        double-booking is rejected.
  - [x] Route tests for `/api/ailments` (create, list, get-by-id,
        matching therapies, and at least one validation-error case).
  - [x] Route tests for `/api/therapies` and `/api/slots` (list).
  - [x] Route tests for `/api/appointments` (book against a slot, list,
        and the slot-already-taken `409` case).
  - [x] A dashboard test confirming ailments/therapies/appointments
        sections render store data.
- [x] `npm run build` completes with no TypeScript errors.
- [x] Manual smoke test: report an ailment, list its matching therapies,
      list available slots, and book an appointment via `curl`/HTTP
      client — each call returns the status code and JSON shape from
      `requirements.md`.
- [x] `/dashboard`'s HTML shows the ailment, therapy, and appointment
      created during the manual smoke test (confirmed via `curl`; not
      visually screenshotted in a rendered browser — the Chrome extension
      wasn't connected during implementation).
- [x] PicoCSS is linked in the shared layout's `<head>`, and the new
      dashboard sections use plain semantic elements (`<table>`, `<mark>`)
      that Pico styles by default (confirmed structurally; visual
      rendering not screenshotted — see note above).
- [x] Phase 1's `/` page and shared header/footer still render (verified
      via `curl`) with PicoCSS added alongside the trimmed
      `public/styles.css`.
- [x] Booking against an already-taken slot returns `409` and does not
      create a duplicate appointment.
- [x] Reporting an ailment with a missing field or unknown `category`
      returns `400` with a JSON error, not a server crash.
- [x] Phase 1 behavior is unaffected: `/`, the shared layout, its
      responsive baseline, and `/styles.css` still work as before.
- [x] No auth, database/persistence, editing/deleting, or
      therapy/slot-authoring UI has been introduced — scope stayed to
      what's in `requirements.md`.

## Ready to merge when

All checklist items pass and the diff contains only what's in scope per
`requirements.md` (in-memory store, ailments/therapies/appointments
routes, PicoCSS styling, dashboard sections, validation/error handling,
Vitest tests). No unrelated changes.
