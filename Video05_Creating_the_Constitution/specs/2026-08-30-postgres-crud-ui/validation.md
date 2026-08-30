# Validation — PostgreSQL Persistence & Ailment/Appointment CRUD UI

## How to know this phase succeeded

This phase is validated by automated Vitest tests running against a real
Postgres test database, plus a manual smoke test covering Docker Compose
startup, data persistence across restarts, every new/changed API
endpoint, and every new UI page — per `requirements.md`.

## Assumption flagged before validation

The exact test-database strategy (`agentclinic_test` database on the same
`docker compose` Postgres instance, truncated between tests) is an
assumption made in `requirements.md`'s Decisions, not one of the 25
explicitly approved technical decisions. Confirm this before relying on
the automated-test checklist items below; if a different approach is
chosen (e.g. a second container, or mocking `pg`), the commands in
section 2 will need to change accordingly.

## Checklist

### 1. Build and automated tests

- [ ] `npm install` completes with no errors (picks up new `pg`,
      `@types/pg`, and any env-loading dependency).
- [ ] `npm run build` (`tsc`) completes with no TypeScript errors.
- [ ] `npm test` (`vitest run`) passes, including:
  - [ ] Updated `src/store.test.ts` covering ailment/appointment
        create, update, delete, and slot release/reserve behavior
        against the test database.
  - [ ] Updated `src/routes/ailments.test.ts`: existing cases still
        pass, plus new `PATCH`/`DELETE` success and error cases (`400`
        no fields, `404` missing ailment).
  - [ ] Updated `src/routes/appointments.test.ts`: existing cases still
        pass, plus new `GET /:id`, `PATCH`, `DELETE` cases — including
        a `409` on updating to an already-taken slot, `404` for a
        missing appointment/therapy/slot, and confirmation that
        deleting/updating-away-from-a-slot frees it (checked via
        `GET /api/slots`).

### 2. Docker Compose and environment

- [ ] `cp .env.example .env` (with locally-chosen non-secret values),
      then `docker compose up -d` brings up a healthy `postgres`
      container with no manual intervention beyond that.
- [ ] `docker compose ps` shows the `postgres` service running and
      healthy.
- [ ] `docker compose exec postgres pg_isready -U "$POSTGRES_USER"`
      reports the server is accepting connections.
- [ ] `.env` is **not** tracked by git: `git status --short` shows
      nothing for `.env` after it's created, and `.gitignore` lists it.
- [ ] `.env.example` contains only placeholder values — no real
      password — confirmed by inspection.
- [ ] `docker-compose.yml` contains no literal password — confirmed by
      inspection (values come from `${VAR}` interpolation only).
- [ ] Starting the app (`npm start`) with `.env` missing or
      `DATABASE_URL` unset fails fast with a clear error message, not a
      raw driver stack trace or a silent hang.
- [ ] If port `5432` is already in use locally, setting
      `POSTGRES_PORT` in `.env` to an alternate port and re-running
      `docker compose up -d` succeeds without editing
      `docker-compose.yml`.

### 3. Migrations and seed data

- [ ] `npm run db:migrate` applies all four migrations cleanly against a
      fresh database (confirm via `psql` or `docker compose exec
      postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\dt'`
      that `therapies`, `slots`, `ailments`, `appointments` all exist).
- [ ] Running `npm run db:migrate` a second time is a no-op (no errors,
      no duplicate schema changes).
- [ ] `npm run db:seed` inserts 5 therapies and 8 slots (confirm via
      `GET /api/therapies` and `GET /api/slots` return the expected
      counts).
- [ ] Running `npm run db:seed` a second time does not create duplicate
      rows (therapy/slot counts stay the same).

### 4. Ailment API CRUD

- [ ] `POST /api/ailments` with a valid body still returns `201` +
      the created ailment, matching the existing shape.
- [ ] `POST /api/ailments` with a missing field or invalid `category`
      still returns `400 { error }`.
- [ ] `GET /api/ailments` and `GET /api/ailments/:id` behave as before;
      `GET /api/ailments/:id` for an unknown id returns `404`.
- [ ] `PATCH /api/ailments/:id` with a valid partial body (e.g.
      `{ "status": "resolved" }`) returns `200` + the updated ailment,
      and a subsequent `GET /api/ailments/:id` reflects the change.
- [ ] `PATCH /api/ailments/:id` with an empty body (`{}`) returns `400`.
- [ ] `PATCH /api/ailments/:id` with an invalid `category` returns
      `400`.
- [ ] `PATCH /api/ailments/:id` for an unknown id returns `404`.
- [ ] `DELETE /api/ailments/:id` returns `204` with an empty body, and a
      subsequent `GET /api/ailments/:id` returns `404`.
- [ ] `DELETE /api/ailments/:id` for an unknown id returns `404`.

### 5. Appointment API CRUD and slot transactions

- [ ] `POST /api/appointments` still returns `201`/`400`/`404`/`409` as
      before, and successfully booking still marks the slot `taken`
      (confirm via `GET /api/slots` no longer listing it).
- [ ] `GET /api/appointments/:id` (new) returns `200` + the appointment
      for a known id, `404` for an unknown id.
- [ ] `PATCH /api/appointments/:id` changing only `agentId` succeeds
      (`200`) without touching slot state.
- [ ] `PATCH /api/appointments/:id` changing `slotId` to a currently
      available slot succeeds (`200`); the old slot becomes available
      again and the new slot becomes taken (confirm both via
      `GET /api/slots`).
- [ ] `PATCH /api/appointments/:id` changing `slotId` to an already
      `taken` slot returns `409`, and neither the old nor the new slot's
      `taken` state changes (confirm via `GET /api/slots` before and
      after).
- [ ] `PATCH /api/appointments/:id` with an unknown `therapyId` or
      `slotId` returns `404`, with no partial changes applied.
- [ ] `PATCH /api/appointments/:id` for an unknown appointment id
      returns `404`.
- [ ] `PATCH /api/appointments/:id` with an empty body returns `400`.
- [ ] `DELETE /api/appointments/:id` returns `204`, the appointment no
      longer appears in `GET /api/appointments`, and its slot becomes
      available again in `GET /api/slots`.
- [ ] `DELETE /api/appointments/:id` for an unknown id returns `404`.

### 6. Persistence across restarts

- [ ] After creating at least one ailment and one appointment, stop the
      Hono process (`Ctrl+C`) and restart it (`npm start`); `GET
      /api/ailments` and `GET /api/appointments` still show the same
      records.
- [ ] `docker compose restart postgres` (or `docker compose down`
      followed by `docker compose up -d`, without `-v`), then repeat the
      same `GET` calls — records are still present.
- [ ] `docker compose down -v` (removing the volume) followed by
      `docker compose up -d` + `npm run db:migrate` + `npm run db:seed`
      results in an empty `ailments`/`appointments` table again —
      confirming the volume, not some other mechanism, is what persists
      data (destructive; run only as a deliberate check, not part of
      normal workflow).

### 7. Ailment UI

- [ ] `/dashboard` shows a "New Ailment" link; following it loads
      `/ailments/new` with a form (agentId, category select, title,
      description).
- [ ] Submitting a valid ailment form redirects to `/dashboard`, which
      now lists the new ailment.
- [ ] Submitting the form with a missing/invalid field re-renders
      `/ailments/new` with the previously entered values intact and a
      visible, human-readable error message — not a blank page or raw
      JSON.
- [ ] Each ailment row on `/dashboard` has working "Edit" and "Delete"
      controls.
- [ ] "Edit" loads `/ailments/:id/edit` pre-filled with that ailment's
      current values (including `status`); submitting a change redirects
      to `/dashboard` showing the update.
- [ ] "Delete" prompts a browser confirmation dialog before submitting;
      confirming removes the ailment from `/dashboard`; canceling leaves
      it untouched.
- [ ] Editing/deleting an ailment that was already deleted in another
      tab (a stale `404`) shows a clear error, not a crash.

### 8. Appointment UI

- [ ] `/dashboard` shows a "New Appointment" link; following it loads
      `/appointments/new` with `agentId`, a therapy `<select>`, and a
      slot `<select>` listing only currently available slots.
- [ ] Submitting a valid appointment form redirects to `/dashboard`,
      which now lists the new appointment, and the booked slot no
      longer appears as available on a fresh `/appointments/new` load.
- [ ] Submitting with an unavailable slot (e.g. two browser tabs racing
      the same slot) re-renders the form with a clear conflict message,
      not a crash.
- [ ] Each appointment row on `/dashboard` has working "Edit" and
      "Delete" controls.
- [ ] "Edit" loads `/appointments/:id/edit` pre-filled, with the slot
      `<select>` including the current slot plus other available slots;
      changing the slot and submitting moves the appointment and
      updates slot availability accordingly (confirmed on `/dashboard`
      and via `GET /api/slots`).
- [ ] "Delete" prompts a confirmation dialog; confirming removes the
      appointment from `/dashboard` and frees its slot; canceling leaves
      it untouched.

### 9. Regression: existing functionality preserved

- [ ] `/` (home page) is unaffected.
- [ ] `GET /api/therapies` and `GET /api/slots` behave as before (now
      backed by Postgres instead of arrays).
- [ ] `GET /api/ailments/:id/therapies` still returns therapies matching
      the ailment's category.
- [ ] `/dashboard`'s Therapies and Slots sections remain read-only (no
      new edit/delete controls added there).
- [ ] The responsive layout established in
      `specs/2026-08-22-mvp-hardening/` is unaffected by the new
      forms/controls at mobile (~375px), tablet (~768px), and desktop
      (~1280px) widths — no new horizontal overflow introduced.

## Ready to merge when

All checklist items pass, `npm run build` and `npm test` are green, the
assumption in "Assumption flagged before validation" has been confirmed
or explicitly re-decided, and the diff contains only what's in
`requirements.md` (Docker Compose for Postgres, env/migration/seed
setup, the database connection layer, Ailment/Appointment CRUD at the
API and UI layers, and their tests) — no unrelated changes, and no
Agents table, ORM, containerized app, or client-side framework was
introduced.
