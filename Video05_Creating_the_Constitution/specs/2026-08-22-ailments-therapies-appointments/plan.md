# Plan — Ailments, Therapies, Appointments & Polish

Numbered task groups, organized by technical layer. Complete each group
before moving to the next.

## 1. In-memory data store & seed data

1.1. Create `src/store.ts` with types for `Ailment`, `Therapy`, `Slot`,
     and `Appointment`, and in-memory arrays for each, plus an
     auto-incrementing id helper.
1.2. Define the fixed `CATEGORIES` list (`performance`, `reliability`,
     `integration`, `auth`, `other`) and export it for validation reuse.
1.3. Seed at least one `Therapy` per category and 5–10 future `Slot`
     entries (`taken: false`) at module load.
1.4. Add store functions: `createAilment`, `listAilments`, `getAilment`,
     `listTherapies`, `therapiesForAilment(ailmentId)`,
     `listAvailableSlots`, `createAppointment`, `listAppointments`.
     `createAppointment` must reject an already-`taken` slot.

## 2. Ailments route (`src/routes/ailments.ts`)

2.1. `POST /` — validate `agentId`, `category` (must be in
     `CATEGORIES`), `title`, `description` are present; `400` with
     `{ error }` if not. Create and return the ailment (`201`).
2.2. `GET /` — list all ailments, newest first.
2.3. `GET /:id` — fetch one ailment; `404` with `{ error }` if missing.
2.4. `GET /:id/therapies` — `404` if the ailment doesn't exist, else the
     therapies matching its category.
2.5. Mount at `/api/ailments` in `src/app.ts`.

## 3. Therapies route (`src/routes/therapies.ts`)

3.1. `GET /` — list all seeded therapies.
3.2. Mount at `/api/therapies` in `src/app.ts`.

## 4. Appointments route (`src/routes/appointments.ts`)

4.1. `GET /../slots` (or a sibling `src/routes/slots.ts` mounted at
     `/api/slots`) — list available (`taken: false`) slots.
4.2. `POST /` — validate `agentId`, `therapyId`, `slotId` present and
     that the therapy and slot exist (`400` if not); `409` if the slot is
     already taken. On success, mark the slot taken and create the
     appointment (`201`).
4.3. `GET /` — list all booked appointments.
4.4. Mount at `/api/appointments` in `src/app.ts`.

## 5. Styling (PicoCSS)

5.1. Add PicoCSS's stylesheet `<link>` (CDN) to `layout.ts`'s `<head>`,
     alongside the existing `/styles.css` link.
5.2. Trim `public/styles.css` down to only the AgentClinic-specific brand
     styling PicoCSS doesn't provide (e.g. `.site-header__brand` color) —
     remove rules PicoCSS now makes redundant.
5.3. Confirm the existing header/main/footer and Phase 1 pages still look
     correct with both stylesheets loaded (no visual conflicts).

## 6. Dashboard sections

6.1. Extend the existing `/dashboard` route in `src/app.ts` to render
     three sections reading from the store: Ailments (id, category,
     title, status), Therapies (name, categories), Appointments (agentId,
     therapy name, time slot).
6.2. Use plain semantic HTML for the new sections (`<table>`, `<article>`,
     `<mark>` for status, etc.) so PicoCSS styles them without bespoke
     classes.
6.3. Reuse the existing `layout`/`header`/`main`/`footer` components
     unchanged — no new layout primitives needed for this phase.

## 7. Validation & error handling (polish)

7.1. Consistent `{ "error": "..." }` JSON shape for every `400`/`404`/
     `409` response across the three routers.
7.2. Confirm no endpoint throws an unhandled exception on missing/malformed
     input — every validation failure returns a handled error response.

## 8. Automated tests (Vitest)

8.1. Unit tests for `store.ts`: category → therapy matching, and that
     booking a `taken` slot is rejected.
8.2. Route tests (via `app.request()`) for each endpoint's success case
     and at least one validation-error case:
     `/api/ailments` (POST + GET + GET/:id + GET/:id/therapies),
     `/api/therapies` (GET), `/api/slots` (GET),
     `/api/appointments` (POST + GET).
8.3. A dashboard route test confirming the three new sections render
     content sourced from the store (e.g. after creating an ailment via
     the store directly, `/dashboard` shows it).

## 9. Manual smoke check

9.1. Run the server locally (`npm start`).
9.2. Use `curl` (or similar) to report an ailment, list therapies for it,
     list available slots, and book an appointment against one — confirm
     each JSON response and status code matches requirements.md.
9.3. Visit `/dashboard` in a browser; confirm the ailment, matching
     therapy, and booked appointment from 9.2 all appear, styled by
     PicoCSS.
9.4. Confirm the existing `/` and Phase 1 layout/responsive behavior are
     unaffected by the added PicoCSS stylesheet.
9.5. Confirm `npm run build` succeeds with no TypeScript errors and
     `npm test` passes.
