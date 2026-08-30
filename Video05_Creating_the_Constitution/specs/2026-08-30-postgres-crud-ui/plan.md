# Plan — PostgreSQL Persistence & Ailment/Appointment CRUD UI

Numbered task groups, organized by technical layer. Complete each group
before moving to the next.

## 1. Docker and environment setup

1.1. Add `docker-compose.yml` defining a single `postgres` service
     (image `postgres:16` or `postgres:16-alpine`), reading
     `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from the
     environment, mapping `${POSTGRES_PORT:-5432}` on the host, and
     mounting a named volume for `/var/lib/postgresql/data`.
1.2. Add `.env.example` (committed) listing `POSTGRES_USER`,
     `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`,
     `POSTGRES_PORT`, `DATABASE_URL`, each with a placeholder value —
     no real secret.
1.3. Add `.env` to `.gitignore`.
1.4. Add `pg` and `@types/pg` to `package.json` dependencies, plus a
     small env-loading dependency (`dotenv`) if the app needs to read
     `.env` outside of Docker Compose's own env handling.
1.5. Confirm `docker compose up -d` starts Postgres and it's reachable
     (e.g. `docker compose exec postgres pg_isready` or `psql`) before
     writing any application code against it.

## 2. PostgreSQL schema and migration

2.1. Add `src/db/migrations/001_create_therapies.sql`,
     `002_create_slots.sql`, `003_create_ailments.sql`,
     `004_create_appointments.sql` (order chosen so `appointments`' FKs
     into `therapies`/`slots` exist first), matching the field lists in
     `requirements.md`.
2.2. Add `src/db/migrate.ts` — a small script that connects via `pg`,
     tracks which migration files have already run (a `schema_migrations`
     tracking table), and applies any new ones in filename order.
2.3. Add a `db:migrate` script to `package.json`.
2.4. Add `src/db/seed.ts` — inserts the 5 fixed therapies and 8 future
     slots currently hardcoded in `src/store.ts`'s `seed()`, using
     `ON CONFLICT DO NOTHING` (or an existence check) so it's safe to
     re-run. Add a `db:seed` script to `package.json`.

## 3. Database connection

3.1. Add `src/db/index.ts` exporting a shared `pg.Pool` constructed from
     `DATABASE_URL` (or discrete `POSTGRES_*` vars), with a clear
     startup error if the connection string is missing.
3.2. Add a small transaction helper (e.g. `withTransaction(fn)`) that
     checks out a client, runs `BEGIN`, calls `fn(client)`, and
     `COMMIT`s or `ROLLBACK`s — used by every multi-statement write in
     groups 5–6.

## 4. Database repositories / store replacement

4.1. Replace `src/store.ts`'s in-memory arrays with `pg`-backed
     functions of the same names where behavior is unchanged
     (`listTherapies`, `getTherapy`, `listAvailableSlots`, `getSlot`,
     `therapiesForAilment`), now `async` and querying Postgres.
4.2. Replace `createAilment`, `listAilments`, `getAilment` with
     `async` Postgres-backed equivalents, mapping DB rows to the
     existing camelCase `Ailment` shape.
4.3. Add `updateAilment(id, patch)` and `deleteAilment(id)`.
4.4. Replace `createAppointment`, `listAppointments` with `async`
     Postgres-backed equivalents (transactional create per
     `requirements.md`), and add `getAppointment(id)`.
4.5. Add `updateAppointment(id, patch)` (transactional slot
     release/reserve when `slotId` changes) and
     `deleteAppointment(id)` (transactional slot release + row delete).
4.6. Update every caller of these functions (`src/routes/*.ts`,
     `src/app.ts`'s `/dashboard` handler) to `await` them.
4.7. Remove the now-unused in-memory arrays and the old synchronous
     `seed()` call from `src/store.ts` (seeding now happens via
     `db:seed`, not at process startup).

## 5. Ailment API CRUD

5.1. Update `src/routes/ailments.ts`: keep existing `POST`/`GET`/
     `GET :id`/`GET :id/therapies` working against the new async store
     functions, unchanged request/response shape.
5.2. Add `PATCH /api/ailments/:id` — partial-field validation (reusing
     `src/validation.ts` helpers, extended as needed for `status`),
     `404` if missing, `200` + updated ailment on success.
5.3. Add `DELETE /api/ailments/:id` — `404` if missing, `204` on
     success.
5.4. Update `src/routes/ailments.test.ts` for the new endpoints and for
     async/DB-backed behavior (see group 9 for test-DB setup).

## 6. Appointment API CRUD and transactions

6.1. Update `src/routes/appointments.ts`: keep existing `POST`/`GET`
     working against the new async, transactional store functions.
6.2. Add `GET /api/appointments/:id` — `404` if missing.
6.3. Add `PATCH /api/appointments/:id` — partial-field validation,
     `404` for a missing appointment/therapy/slot, `409` if the
     requested new slot is already taken, transactional slot
     release+reserve when `slotId` changes, `200` + updated appointment
     on success.
6.4. Add `DELETE /api/appointments/:id` — `404` if missing, releases
     the slot and deletes the row transactionally, `204` on success.
6.5. Update `src/routes/appointments.test.ts` for the new endpoints,
     including a test that updating/deleting an appointment correctly
     frees/reserves slots (verified via `GET /api/slots`).

## 7. Ailment UI

7.1. Add `GET /ailments/new` (form) and `POST /ailments/new` (handler)
     in `src/app.ts` (or a new `src/routes/ailmentsUi.ts` mounted
     there) — on success, redirect to `/dashboard`; on validation/DB
     error, re-render the form with the entered values and a visible
     error.
7.2. Add `GET /ailments/:id/edit` and `POST /ailments/:id/edit`,
     pre-filled with current values, same success/error handling
     pattern.
7.3. Add `POST /ailments/:id/delete`, with the confirmation-`onsubmit`
     pattern from `requirements.md`; redirect to `/dashboard` on
     success, render a visible error (not a crash) on failure.
7.4. Extend `/dashboard`'s Ailments section with a "New Ailment" link
     and per-row "Edit"/"Delete" controls.
7.5. Add new small components/partials under `src/components/` for the
     form markup if it's reused between create/edit (e.g.
     `ailmentForm.ts` taking optional initial values).

## 8. Appointment UI

8.1. Add `GET /appointments/new` and `POST /appointments/new`, with
     `<select>` options for `therapyId` (all therapies) and `slotId`
     (currently available slots) sourced live from the store.
8.2. Add `GET /appointments/:id/edit` and `POST /appointments/:id/edit`,
     pre-filled, with the `slotId` `<select>` including the
     appointment's current slot plus all other available slots (per
     `requirements.md`).
8.3. Add `POST /appointments/:id/delete` with the same confirmation
     pattern as ailments.
8.4. Extend `/dashboard`'s Appointments section with a "New
     Appointment" link and per-row "Edit"/"Delete" controls.
8.5. Add a shared `appointmentForm.ts` component analogous to
     `ailmentForm.ts` if the create/edit markup is reused.

## 9. Tests, build, and manual validation

9.1. Decide and wire up the test-database approach from
     `requirements.md`'s Decisions (`agentclinic_test` database via
     `TEST_DATABASE_URL`, truncated between tests) — add a Vitest
     setup/teardown hook if needed.
9.2. Update `src/store.test.ts` for the new async, Postgres-backed
     functions (create/update/delete for ailments and appointments,
     slot release/reserve behavior).
9.3. Run `npm run build` and `npm test`; fix anything broken by the
     store/route changes before moving on.
9.4. Manual smoke test (`docker compose up -d`, `npm run db:migrate`,
     `npm run db:seed`, `npm start`): exercise create/edit/delete for
     both ailments and appointments via `curl` and via the new UI pages
     in a browser, confirming status codes, redirects, and dashboard
     updates match `requirements.md`.
9.5. Restart the Hono process (not the container) and confirm prior
     data is still present; then stop/start the Postgres container
     (without removing its volume) and confirm the same.
9.6. Confirm therapies/slots listing, ailment-to-therapy matching, and
     the rest of the dashboard are visibly unaffected (per
     `requirements.md`'s "preserve existing functionality").
9.7. Run the `/changelog` skill to record this work in `CHANGELOG.md`.
