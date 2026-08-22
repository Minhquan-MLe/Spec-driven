# Validation — Ailments, Therapies, Appointments & Polish

## How to know this phase succeeded

This phase is validated by automated Vitest tests plus a manual smoke
test exercising the full agent → ailment → therapy → appointment loop,
per `specs/tech-stack.md` and `specs/mission.md`.

## Checklist

- [ ] `npm test` (Vitest) passes, including:
  - [ ] Store unit tests: category-to-therapy matching, and slot
        double-booking is rejected.
  - [ ] Route tests for `/api/ailments` (create, list, get-by-id,
        matching therapies, and at least one validation-error case).
  - [ ] Route tests for `/api/therapies` and `/api/slots` (list).
  - [ ] Route tests for `/api/appointments` (book against a slot, list,
        and the slot-already-taken `409` case).
  - [ ] A dashboard test confirming ailments/therapies/appointments
        sections render store data.
- [ ] `npm run build` completes with no TypeScript errors.
- [ ] Manual smoke test: report an ailment, list its matching therapies,
      list available slots, and book an appointment via `curl`/HTTP
      client — each call returns the status code and JSON shape from
      `requirements.md`.
- [ ] Visiting `/dashboard` in a browser shows the ailment, therapy, and
      appointment created during the manual smoke test.
- [ ] PicoCSS is linked in the shared layout's `<head>` and its default
      styling is visibly applied to the new dashboard sections (tables,
      status marks) with no unstyled/broken-looking elements.
- [ ] Phase 1's `/` page and shared header/footer still render correctly
      with PicoCSS added alongside the trimmed `public/styles.css`.
- [ ] Booking against an already-taken slot returns `409` and does not
      create a duplicate appointment.
- [ ] Reporting an ailment with a missing field or unknown `category`
      returns `400` with a JSON error, not a server crash.
- [ ] Phase 1 behavior is unaffected: `/`, the shared layout, its
      responsive baseline, and `/styles.css` still work as before.
- [ ] No auth, database/persistence, editing/deleting, or
      therapy/slot-authoring UI has been introduced — scope stayed to
      what's in `requirements.md`.

## Ready to merge when

All checklist items pass and the diff contains only what's in scope per
`requirements.md` (in-memory store, ailments/therapies/appointments
routes, PicoCSS styling, dashboard sections, validation/error handling,
Vitest tests). No unrelated changes.
