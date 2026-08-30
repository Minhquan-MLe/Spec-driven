# Requirements — PostgreSQL Persistence & Ailment/Appointment CRUD UI

## Phase

A new phase, following the MVP (`specs/roadmap.md`, `specs/2026-08-22-mvp-hardening/`).
Replaces the in-memory store with PostgreSQL, runs PostgreSQL locally via
Docker Compose, and adds complete Create/Read/Update/Delete for Ailments
and Appointments at both the API and dashboard-UI layers. This finally
acts on the roadmap's long-deferred "revisit persistence" note — this
time by actually introducing a database, per current stakeholder
direction.

## Scope

### Data persistence

- Ailments, Therapies, Slots, and Appointments all move from
  `src/store.ts`'s in-memory arrays into **PostgreSQL 16** tables.
- Access is via plain **`pg`** (node-postgres) — no ORM/query builder is
  introduced.
- `agentId` stays a plain free-text column on `ailments` and
  `appointments`. No `agents` table is introduced.
- API response field names and shapes stay **camelCase**, matching the
  current `Ailment`/`Therapy`/`Slot`/`Appointment` TypeScript interfaces
  in `src/store.ts` exactly, even though the underlying SQL columns may
  be `snake_case`. Existing GET/POST endpoints keep their current
  request/response behavior except where this spec explicitly adds new
  behavior (update, delete).
- **Persistence after restart:** stopping and restarting the Hono
  process (`npm start`) must **not** lose data — ailments, therapies,
  slots, and appointments created before the restart are still present
  and correct afterward, because they live in the Postgres container's
  data volume, not in process memory.
- Restarting the `postgres` container (`docker compose restart` /
  `docker compose down` + `docker compose up -d`, without removing its
  volume) must also preserve all previously written data.
- The in-memory **Idempotency-Key cache** (`src/idempotency.ts`) is
  **not** moved into the database this phase (see Decisions) — it still
  resets on process restart. This applies only to the existing
  idempotency-guarded `POST` endpoints (ailments, appointments create);
  the new update/delete endpoints introduced in this phase do not
  support an `Idempotency-Key`.

### Docker Compose

- `docker-compose.yml` (repo root of this project:
  `Video05_Creating_the_Constitution/docker-compose.yml`) defines exactly
  one service: `postgres`, image `postgres:16` (or `postgres:16-alpine`).
- A named volume persists `/var/lib/postgresql/data` across
  `docker compose down` / `up` cycles (data survives unless the volume is
  explicitly removed with `-v`).
- The Hono application itself is **not** containerized this phase — it
  keeps running via `npm start` on the host, connecting to Postgres over
  the mapped host port.
- `docker compose up -d` must bring up a healthy, reachable Postgres
  instance with no manual steps beyond having a valid `.env` file
  present.
- The compose file must not hardcode real credentials — it reads
  `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and the host port
  mapping from environment variables (see Environment variables below).

### Environment variables

- A `.env.example` file (committed) lists every variable name the app
  and compose file need, each with a clearly-fake local-dev placeholder
  value (e.g. `postgres`, `changeme_local_dev`) — never a real secret.
- A `.env` file (gitignored, added to `.gitignore` in this phase) holds
  the developer's actual local values; it is never committed.
- Variables (exact names, finalized during Phase 1 of the plan):
  `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`,
  `POSTGRES_PORT` (host-side port, defaulting to `5432` but overridable
  to avoid local conflicts), and `DATABASE_URL` (a single connection
  string derived from the above, used directly by the `pg` client).
- The Node process must fail fast with a clear error message on startup
  if `DATABASE_URL` (or the discrete `POSTGRES_*` vars it's built from)
  is missing — not fail silently or crash with a raw driver stack trace.

### Migrations and seed data

- Hand-written SQL migration files (no ORM codegen), applied in order by
  a small Node/`pg` migration-runner script — no external migration
  framework is introduced.
- Migrations create four tables: `ailments`, `therapies`, `slots`,
  `appointments`, matching the field lists in "Current data models"
  below, with `appointments.therapy_id` and `appointments.slot_id` as
  foreign keys into `therapies`/`slots`.
- A seed step inserts the same fixed data `src/store.ts` seeds today: 5
  therapies (one per category) and 8 future time slots (`taken: false`).
  Seeding is **idempotent** — running it against an already-seeded
  database does not create duplicate rows.
- Ailments and appointments are **not** seeded — both tables start empty,
  matching current in-memory startup behavior, and are populated only
  through the API/UI.

### Ailment CRUD (`/api/ailments`)

- `POST /api/ailments` — unchanged request/response/validation from
  today (`agentId`, `category`, `title`, `description` required;
  `category` must be one of `CATEGORIES`), except the created row is now
  persisted in Postgres. `Idempotency-Key` behavior unchanged.
- `GET /api/ailments` — unchanged: list all, newest first.
- `GET /api/ailments/:id` — unchanged: `404 { error }` if missing.
- `GET /api/ailments/:id/therapies` — unchanged.
- **`PATCH /api/ailments/:id`** (new) — partial update. Body may include
  any of `agentId`, `category`, `title`, `description`, `status`; at
  least one field is required (`400` if the body has none of them).
  Field-level validation matches `POST` (non-empty strings; `category`
  must be one of `CATEGORIES`; `status` must be `open` or `resolved`).
  Returns `200` + the updated ailment. `404 { error }` if the ailment
  doesn't exist.
- **`DELETE /api/ailments/:id`** (new) — deletes the ailment. Returns
  `204` with no body. `404 { error }` if the ailment doesn't exist.
  Deleting an ailment does not need to touch any other table (ailments
  have no dependent rows in this schema).

### Appointment CRUD (`/api/appointments`)

- `POST /api/appointments` — unchanged request/response/validation
  (`agentId`, `therapyId`, `slotId`; `400`/`404`/`409` cases as today),
  except the write is now persisted in Postgres and the slot-taken check
  + insert happen inside a single transaction (see Decisions).
  `Idempotency-Key` behavior unchanged.
- `GET /api/appointments` — unchanged: list all, newest first.
- **`GET /api/appointments/:id`** (new — didn't exist before) — fetch
  one appointment. `404 { error }` if missing.
- **`PATCH /api/appointments/:id`** (new) — partial update. Body may
  include any of `agentId`, `therapyId`, `slotId`; at least one field is
  required (`400` otherwise). Rules:
  - `agentId`, if present, must be a non-empty string.
  - `therapyId`, if present, must reference an existing therapy —
    `404 { error: 'therapy not found' }` if not.
  - `slotId`, if present and **different from the appointment's current
    slot**, must reference an existing slot — `404
    { error: 'slot not found' }` if not — and that slot must currently
    be available — `409 { error: 'slot already taken' }` if not. On
    success, the **old slot is released** (`taken = false`) and the
    **new slot is reserved** (`taken = true`) — see "Slot reservation
    and release" below for the atomicity requirement.
  - `slotId`, if present but equal to the current slot, is a no-op for
    slot state (no release/reserve cycle needed).
  - Returns `200` + the updated appointment on success.
  - `404 { error: 'appointment not found' }` if the appointment itself
    doesn't exist.
- **`DELETE /api/appointments/:id`** (new) — deletes the appointment and
  **releases its slot** (`taken = false`) atomically (same transaction).
  Returns `204` with no body. `404 { error }` if the appointment doesn't
  exist.

### Slot reservation and release

- A slot's `taken` flag is the single source of truth for availability.
- Reserving a slot (on appointment create, or on appointment update when
  `slotId` changes) and releasing a slot (on appointment delete, or on
  appointment update when moving off a slot) must never leave the
  database in a state where a slot is marked `taken` with no
  corresponding appointment, or `taken: false` while still referenced by
  an existing appointment's `slotId`.
- Attempting to reserve a slot that is already `taken` (by create or by
  update) always returns `409`, never partially applies the change.
- `GET /api/slots` continues to return only `taken: false` slots,
  unchanged.

### Server-rendered create/edit/delete UI

- New pages, server-rendered with Hono + PicoCSS (no client framework;
  see Decisions for exact routes):
  - An **ailment creation form** (`agentId`, `category` as a `<select>`
    of `CATEGORIES`, `title`, `description`).
  - An **ailment edit form**, pre-filled with the ailment's current
    values, covering the same fields plus `status`.
  - An **appointment creation form** (`agentId`, `therapyId` as a
    `<select>` of therapies, `slotId` as a `<select>` of *currently
    available* slots).
  - An **appointment edit form**, pre-filled, allowing `agentId`,
    `therapyId`, and `slotId` to change (the `slotId` `<select>` must
    include the appointment's *current* slot as a selectable option even
    though it's `taken`, plus all other currently-available slots).
  - Delete controls (buttons/links) for ailments and appointments,
    including on `/dashboard`, each requiring a confirmation step before
    the delete request is sent (see Decisions) — no accidental one-click
    deletes.
- The `/dashboard` page gains "New Ailment" / "New Appointment" links
  and, per ailment/appointment row, "Edit" and "Delete" controls. The
  Therapies and Slots dashboard sections stay read-only (per Decisions
  and MVP scope — no therapy/slot authoring UI is added).
- Therapies and Slots themselves stay **read-only, seeded data** — no
  therapy/slot create/edit/delete UI or API is introduced this phase.

### Validation and error handling

- Every new/changed endpoint returns the existing `{ "error": "..." }`
  JSON shape for `400`/`404`/`409` responses, consistent with current
  API conventions.
- Every new UI form, on a validation error (missing/invalid field),
  database error (e.g. connection failure), `404` (edit/delete of a
  since-deleted record), or `409` (slot no longer available), **re-renders
  the same form** with the entered values preserved and a clearly visible,
  human-readable error message — never a raw stack trace, a blank page,
  or a silent failure.
- No endpoint or page may throw an unhandled exception on malformed
  input, a missing record, or a database error — all failure paths
  return a handled response.

## Out of scope

- Any Agents table/entity — `agentId` stays free text (per Decisions).
- Therapy or Slot authoring (create/edit/delete), at the API or UI
  layer — both stay seeded, read-only data.
- Containerizing the Hono application itself.
- Any ORM (Prisma, Drizzle, TypeORM, Sequelize, Knex).
- Moving the Idempotency-Key cache into the database.
- Authentication/authorization of any kind.
- Deployment/hosting configuration.
- Client-side JavaScript frameworks or a build step (React, Vue, Svelte,
  Vite) — server-rendered HTML only, per Decisions.
- Pagination, search, filtering, or sorting beyond the existing "newest
  first" / "available only" behavior.

## Decisions

- **Database:** PostgreSQL 16, accessed via plain `pg` (node-postgres).
  No ORM — chosen to keep the codebase's dependency footprint and
  learning-focused transparency consistent with `specs/tech-stack.md`'s
  "keep dependencies minimal" principle, and because the schema (4
  small tables, simple CRUD + one category-match query) doesn't justify
  an ORM's migration/codegen machinery.
- **Docker scope:** Docker Compose runs **only** PostgreSQL. The Hono
  app continues to run directly on the host via `npm start` — this keeps
  the existing dev workflow (`npm install && npm start`) unchanged and
  avoids adding a `Dockerfile`/image-build step for the app this phase.
- **Agents:** `agentId` remains a plain text column, not a foreign key
  to a real entity — matches current behavior exactly; no new table.
- **Update HTTP method:** `PATCH` (not `PUT`) for both ailments and
  appointments, since updates are partial (a subset of fields) rather
  than full-resource replacement.
- **Delete response:** `204 No Content` with an empty body, following
  standard REST convention — chosen because there's no natural response
  body for a deleted resource and this keeps the two new `DELETE`
  endpoints consistent with each other.
- **Transactions:** any write touching more than one row/table in a way
  that must succeed or fail together runs inside a single `pg`
  transaction (`BEGIN`/`COMMIT`/`ROLLBACK`):
  - Appointment create: check slot availability + insert appointment +
    mark slot taken.
  - Appointment update when `slotId` changes: release old slot + reserve
    new slot + update appointment row.
  - Appointment delete: delete appointment row + release its slot.
- **UI routing:** new server-rendered UI pages live under plain paths
  distinct from the `/api/*` JSON namespace, using native HTML
  `<form method="POST">` (no client-side `fetch`, no method-override
  library):
  - `GET /ailments/new`, `POST /ailments/new` (create)
  - `GET /ailments/:id/edit`, `POST /ailments/:id/edit` (update)
  - `POST /ailments/:id/delete` (delete)
  - `GET /appointments/new`, `POST /appointments/new` (create)
  - `GET /appointments/:id/edit`, `POST /appointments/:id/edit` (update)
  - `POST /appointments/:id/delete` (delete)
  - On success, each POST redirects back to `/dashboard`. On a
    validation/database/conflict error, the same page re-renders with
    the error and previously-entered values (see Validation and error
    handling above).
- **Delete confirmation:** a plain HTML `<form>` per delete action with
  an inline `onsubmit="return confirm('...')"` attribute — vanilla
  browser `confirm()`, not a JS framework or separate script bundle —
  satisfies "requires confirmation" without violating the
  no-framework/no-build-step decision.
- **Migrations:** SQL files under `src/db/migrations/`, applied in
  filename order by a small script (`src/db/migrate.ts`) using `pg`
  directly — no `node-pg-migrate`/Knex/etc. Mirrors the pattern already
  visible (for reference only) in this repo's later, unrelated lesson
  snapshots (e.g. `Video14_Agents_replaceability/src/db/`).
- **Seeding:** a `src/db/seed.ts` script, run manually (`npm run
  db:seed` — added in this phase) after migrations, using `ON CONFLICT
  DO NOTHING` (or an equivalent existence check) so re-running it is
  safe.
- **Test database:** automated tests that exercise the database run
  against the **same local `docker compose` Postgres instance**, but a
  **separate database** (`agentclinic_test`, created by the same
  migration script against a `TEST_DATABASE_URL`), truncated between
  tests. This avoids requiring a second Postgres container while keeping
  test runs from clobbering dev data. *(Flagged as an assumption in
  `validation.md` — not explicitly specified by the approved decisions
  list; confirm before Phase 9 of `plan.md`.)*
- **`dist/`:** no change to the existing convention of committing built
  output to git — out of scope for this phase.
- **Secrets:** `.env` (real local values) is gitignored; `.env.example`
  (placeholder values only) is committed; `docker-compose.yml` never
  contains a literal password.

## Context

The MVP phase (`specs/2026-08-22-mvp-hardening/requirements.md`)
deliberately kept persistence in-memory, matching `mission.md`'s
teaching/conference-booth audience. Current stakeholder direction now
calls for real persistence, a locally-runnable database via Docker, and
full lifecycle management (create/edit/delete, not just create/list) for
the two entities agents and staff interact with most directly —
Ailments and Appointments. Therapies and Slots stay seeded/read-only, and
Agents stay unmodeled, keeping this phase's surface area limited to what
was explicitly approved rather than re-opening every deferred decision at
once.
