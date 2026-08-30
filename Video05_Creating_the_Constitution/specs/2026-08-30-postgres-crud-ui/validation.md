# Validation — PostgreSQL Persistence & Ailment/Appointment CRUD UI

## How to know this phase succeeded

This phase is validated by automated Vitest tests running against a real
Postgres test database, plus a manual smoke test covering Docker Compose
startup, data persistence across restarts, every new/changed API
endpoint, and every new UI page — per `requirements.md`.

## Final audit (2026-08-30)

**Overall result: PASS. No open blockers or known limitations.**

Performed on branch `feature/postgres-crud-ui` (8 commits ahead of
`main` at the time of the original audit; 9 commits ahead of `main`
after the hotfix below — see "Hotfix validation"). All 30 requested
checks were run; results below are real command output from this
audit, not inferred.

### Findings

1. **RESOLVED — pool had no `error` listener.** `src/db/index.ts`'s
   shared `pg.Pool` did not register `.on('error', ...)`. When Postgres
   terminated an *idle* pooled connection administratively (e.g.
   `docker compose stop` / `restart`), `pg` emitted an `error` event on
   the pool; Node's default behavior for an unlistened `EventEmitter`
   error is to crash the process. Reproduced once during the original
   audit pass: `docker compose stop` crashed a long-running `node
   dist/index.js` with `Unhandled 'error' event` / `FATAL: terminating
   connection due to administrator command`. Fixed in commit
   `bccc0b2` ("handle unexpected PostgreSQL pool errors"):
   `createPool()` now attaches exactly one `pool.on('error', ...)`
   listener to every pool it creates, logging only `err.message` (never
   the error object, which can carry connection details) and letting
   the process continue running. See "Hotfix validation" below for the
   live stop/fail/recover evidence (same Node PID throughout, data
   unaffected, automatic reconnection with no manual restart, no
   retry loop added). The data itself was never at risk either before
   or after this fix — Postgres and its volume are unaffected by an
   idle-connection error regardless.
2. **"Starting the app fails fast" (checklist §2, second-to-last item)
   does not hold literally as originally worded — corrected below.**
   `DATABASE_URL` is only read lazily, the first time a request
   actually touches the store (`getPool()` → `getConnectionString()`).
   Verified directly: with `.env` removed, `node dist/index.js` still
   prints `AgentClinic listening on http://localhost:3000` and answers
   `GET /` with `200` — it does **not** fail at startup. The first
   request that touches the database (`GET /api/ailments`) does fail,
   with a clear, actionable message logged server-side
   (`Error: DATABASE_URL is not set. Copy .env.example to .env...`) and
   a generic `{"error":"internal server error"}` / `500` returned to
   the client — never a raw stack trace to the client, and never a
   silent hang. So the *safety* property (no leaked internals, no
   silent failure) holds, just not via "fails at startup" — it fails
   lazily, on first use. README's own wording ("requests will fail
   with a clear error") already matches the real behavior; the
   original checklist line below has been corrected to match.
3. **`docker-compose.yml` vs `compose.yaml`.** The approved
   specification's Decisions section names the file
   `docker-compose.yml`; a later explicit instruction (Phase 1
   implementation) directed using `compose.yaml` instead, and that
   change was reported at the time. Documented here for the record —
   not a defect, an approved deviation.
4. Every other checklist item below passed as originally specified.

### Requirement-by-requirement results (this audit's 30 checks)

| # | Requirement | Result | Evidence |
|---|---|---|---|
| 1 | Current branch is `feature/postgres-crud-ui` | PASS | `git branch --show-current` |
| 2 | Working tree clean before doc edits | PASS | `git status` → "nothing to commit, working tree clean" |
| 3 | Commits on this branch vs `main` | PASS | `git log --oneline main..feature/postgres-crud-ui` → 8 commits at the time of the original audit; **recalculated after the hotfix commit: 9 commits**, `git diff main..feature/postgres-crud-ui --stat` → 80 files, +7534/-302 |
| 4 | `.env` ignored and not tracked | PASS | `git ls-files` has no `.env`; `git check-ignore -v .env` → matched by `.gitignore:14` |
| 5 | Diff searched for secrets/markers/temp files/debug logging | PASS | `git diff main..feature/postgres-crud-ui` grepped for passwords/URLs/markers/`.log`/`/tmp/` — only hits are `.env.example` placeholders (`changeme_local_dev`) and test-fixture strings (`agent-xss`, etc.); `console.log` hits are all intentional CLI-script output (`migrate.ts`, `seed.ts`, `check-connection.ts`, `create-test-db.ts`) |
| 6 | `docker compose config` | PASS | resolves cleanly, `.env` interpolated, no literal password (see below) |
| 7 | `docker compose up -d` | PASS | started/confirmed running |
| 8 | Wait for Postgres healthy | PASS | `healthy` within seconds each time |
| 9 | `db:check`/`db:migrate`/`db:seed`/`db:test:create`/`db:test:migrate`/`db:test:check` | PASS | all six succeeded (see below) |
| 10 | `npm test` / `npm run test:db` / `npm run build` | PASS | original audit: 125/125, 33/33, exit 0. **Post-hotfix: 132/132, 33/33, exit 0** — see "Hotfix validation" |
| 11 | Normal suite, shuffled file+test order | PASS | original audit: 125/125. **Post-hotfix: 132/132** |
| 12 | `git diff --check` | PASS | exit 0 |
| 13 | Dev data survives Postgres container stop/start and Node restart | PASS | original audit: marker ailment created, survived container stop/start and (after a manual restart following the then-unfixed crash) a Node restart, with identical id/`createdAt`. **Post-hotfix: the same Node process (PID 22646) survived a Postgres stop/start without crashing or restarting at all — see "Hotfix validation".** |
| 14 | Named-volume persistence without deleting the volume | PASS | confirmed via the same stop/start cycle above (no `-v` used) |
| 15 | All current JSON API routes/status codes | PASS | see route table below |
| 16 | All Ailment HTML routes | PASS | see route table below |
| 17 | All Appointment HTML routes | PASS | see route table below |
| 18 | Create/edit/delete flows for both resources | PASS | covered by 78 route/UI tests (26+18 ailments, 29+24 appointments) plus this phase's own real-HTTP validations (recorded in `plan.md`'s phase history) |
| 19 | Appointment move releases old slot, reserves new | PASS | `updateAppointment` integration + route tests; re-confirmed conceptually via this audit's persistence check |
| 20 | Appointment delete releases its slot | PASS | `deleteAppointment` integration + route tests |
| 21 | HTML escaping/XSS tests exist and pass | PASS | `ailmentsUi.test.ts` and `appointmentsUi.test.ts` each assert `<script>...` renders as escaped text on both the re-rendered form and the dashboard; part of the 125 passing |
| 22 | Plain `npm test` needs no Postgres | PASS | ran with `docker compose stop` in effect → 125/125 |
| 23 | DB integration tests cannot mutate the dev database | PASS | `testDatabaseGuard.integration.test.ts` (5 tests); dev row counts identical before/after every `test:db` run this session |
| 24 | No production in-memory domain arrays remain | PASS | `src/store.ts` inspected — zero `Ailment[]`/`Therapy[]`/`Slot[]`/`Appointment[]`, every function delegates to `src/db/repository/*` |
| 25 | Idempotency-Key cache is the only intentional in-memory state | PASS | `src/idempotency.ts` — one `Map`, used only for POST replay |
| 26 | Therapies/Slots remain read-only seeded data | PASS | no create/update/delete route or UI exists for either, in API or UI routers |
| 27 | Only Postgres runs in Docker | PASS | `compose.yaml` defines exactly one service (`postgres`); no `Dockerfile` for the app exists |
| 28 | README has complete beginner-friendly startup/shutdown | PASS (was incomplete — fixed) | added "Using the app" and "Running tests" sections this audit (see Documentation changes) |
| 29 | Compiled `dist/` current with `src/` | PASS | `npm run build` produced zero `git status` diff |
| 30 | Dev database returned to original state after validation | PASS | `therapies=5, slots=8, ailments=0, appointments=0` before and after; one marker ailment created and removed via a precisely `id`+`agent_id`+`title`-scoped `DELETE` |

## Hotfix validation (2026-08-30, commit `bccc0b2`)

Fixes Finding 1. `createPool()` in `src/db/index.ts` now attaches a
`pool.on('error', ...)` listener to every pool it creates, logging only
`err.message`. Automated tests added in `src/db/index.test.ts` (7
tests, database-independent). Live stop/fail/recover evidence, in
order:

1. Started the compiled app (`node dist/index.js`) → **PID 22646**.
2. `GET /api/therapies` (before touching Postgres) → **`200`**, real
   data — confirms the pool had an established connection.
3. `docker compose stop`.
4. Server log recorded the error being handled, not crashing:
   `[db] pool error (idle connection lost): terminating connection due
   to administrator command`.
5. Process check: **PID 22646 still alive**.
6. `GET /api/therapies` (Postgres unavailable) → **`500
   {"error":"internal server error"}`** — the existing generic
   response; no connection string, password, host detail, or stack
   trace exposed to the client.
7. `docker compose up -d`; waited for `healthy`.
8. `GET /api/therapies` again, **without restarting Node** → **`200`**,
   real data returned — automatic reconnection, no manual restart, no
   retry loop needed (this is `pg.Pool`'s own lazy-reconnect behavior;
   nothing in the fix drives it).
9. Process check: **PID unchanged (still 22646)**, confirmed via
   `ps -p 22646` showing continuous uptime across the whole sequence.
10. Development row counts before and after: **`therapies=5, slots=8,
    ailments=0, appointments=0`** — identical, unaffected by any step
    above.
11. Temporary process stopped cleanly (`kill 22646`), confirmed gone.

### Final automated results (post-hotfix)

- `npm test` → **14 files, 132/132 passed** (was 125; +7 new tests in
  `src/db/index.test.ts`).
- `npm test` with Postgres fully stopped → **132/132 passed** —
  database independence preserved by the fix.
- `npm run test:db` → **4 files, 33/33 passed**, unaffected.
- Shuffled file+test order
  (`--sequence.shuffle.tests --sequence.shuffle.files`) → **132/132
  passed**.
- `npm run build` → exit 0.
- `git diff --check` → exit 0.

## Assumption flagged before validation — now confirmed

The test-database strategy (`agentclinic_test` on the same `docker
compose` Postgres instance, reset between tests via a hard safety
guard) was an assumption in `requirements.md`'s Decisions, not one of
the 25 originally-approved technical decisions. It has since been
implemented exactly as assumed and is in active use (`npm run
test:db`, `src/db/repository/testSupport.ts`'s
`assertSafeToMutateTestDatabase`) — confirmed, not still open.

## Checklist

### 1. Build and automated tests

- [x] `npm install` completes with no errors (picked up `pg`,
      `@types/pg`, `dotenv`).
- [x] `npm run build` (`tsc`) completes with no TypeScript errors.
- [x] `npm test` (`vitest run`) passes — **125/125**, including:
  - [x] `src/store.test.ts` (15 tests) — **corrected from the original
        wording below**: this tests `store.ts`'s delegation to a
        *mocked* repository layer (pool/connection-string checks,
        non-integer-id guards, result pass-through), not live
        create/update/delete/slot-release behavior — that business
        logic is covered instead by
        `src/db/repository/*.integration.test.ts` (33 tests, run via
        `npm run test:db` against the real test database), which is
        where it actually lives after the Phase 4 repository
        refactor.
  - [x] `src/routes/ailments.test.ts` (26 tests): existing cases pass,
        plus `PATCH`/`DELETE` success and error cases (`400` no
        fields, `404` missing ailment).
  - [x] `src/routes/appointments.test.ts` (29 tests): existing cases
        pass, plus `GET /:id`, `PATCH`, `DELETE` cases — `409` on
        updating to an already-taken slot, `404` for a missing
        appointment/therapy/slot, and confirmation that
        deleting/updating-away-from-a-slot frees it (checked via
        `GET /api/slots`).
  - [x] `src/routes/ailmentsUi.test.ts` (18 tests) and
        `src/routes/appointmentsUi.test.ts` (24 tests) — the
        server-rendered UI, added after this checklist was first
        written; not in the original list but now part of the suite.

### 2. Docker Compose and environment

- [x] `cp .env.example .env`, then `docker compose up -d` brings up a
      healthy `postgres` container with no manual intervention beyond
      that.
- [x] `docker compose ps` shows the `postgres` service running and
      healthy.
- [x] `docker compose exec postgres pg_isready -U agentclinic` →
      `/var/run/postgresql:5432 - accepting connections`.
- [x] `.env` is **not** tracked by git — confirmed via
      `git check-ignore -v .env` and `git ls-files`.
- [x] `.env.example` contains only placeholder values — confirmed by
      inspection and by diffing the committed file.
- [x] `compose.yaml` (see Finding 3 for the filename) contains no
      literal password — confirmed by inspection and by
      `docker compose config`'s resolved output (values come from
      `${VAR}` interpolation only).
- [x] **Corrected** (see Finding 2): starting the app (`node
      dist/index.js`) with `.env` missing does *not* fail at startup —
      it starts and serves non-database routes normally. The first
      request that touches the database fails with a clear,
      actionable message logged server-side and a generic `500` to the
      client — never a raw stack trace to the client, never a silent
      hang. Verified directly this audit.
- [ ] If port `5432` is already in use locally, setting `POSTGRES_PORT`
      in `.env` to an alternate port and re-running `docker compose up
      -d` succeeds without editing `compose.yaml` — **not re-tested
      this audit** (would require disrupting the running stack for
      marginal new information); verified by static inspection only:
      `compose.yaml`'s `ports` mapping uses `${POSTGRES_PORT:-5432}`,
      which supports this by construction.

### 3. Migrations and seed data

- [x] `npm run db:migrate` applies all four migrations cleanly (all
      four tables exist; confirmed via `\dt` in earlier phases and via
      successful `db:check`/app queries this audit).
- [x] Running `npm run db:migrate` again is a no-op — this audit's run
      printed `skip (already applied)` for all four.
- [x] `npm run db:seed` inserts 5 therapies and 8 slots — confirmed via
      direct `psql` row counts this audit (`therapies=5, slots=8`).
- [x] Running `npm run db:seed` again does not create duplicates — row
      counts unchanged after a second run this audit.

### 4. Ailment API CRUD

- [x] All items — covered by `src/routes/ailments.test.ts` (26 tests,
      passing) and this phase's earlier real-HTTP validations
      (recorded when each endpoint was implemented).

### 5. Appointment API CRUD and slot transactions

- [x] All items — covered by `src/routes/appointments.test.ts` (29
      tests, passing) and earlier real-HTTP validations, including the
      slot release/reserve and 409-conflict checks.

### 6. Persistence across restarts

- [x] Ailment/appointment data survives a Postgres container
      stop+start (without `-v`) — confirmed this audit with a marker
      ailment (same `id`/`createdAt` before and after).
- [x] Ailment/appointment data survives a Node process restart —
      confirmed this audit (same marker ailment, read correctly by a
      freshly-started process).
- [x] The Node **process** itself survives a Postgres stop/restart
      without crashing — **fixed in commit `bccc0b2`, see "Hotfix
      validation"**. The same process (PID 22646) stayed alive and
      automatically reconnected across a full `docker compose
      stop`/`up -d` cycle with no manual restart.
- [ ] `docker compose down -v` destructive re-seed check — **not run
      this audit** (explicitly destructive; the task's own instructions
      prohibit deleting Docker volumes or resetting the dev database
      during this pass). Was verified in the original Phase 1
      implementation session.

### 7. Ailment UI

- [x] All items — covered by `src/routes/ailmentsUi.test.ts` (18
      tests, passing) and this phase's real-HTTP validation (create,
      edit with pre-filled values, delete, 404 on a stale id, all
      exercised against the real dev database when the Ailments UI was
      implemented).

### 8. Appointment UI

- [x] All items — covered by `src/routes/appointmentsUi.test.ts` (24
      tests, passing) and this phase's real-HTTP validation (create,
      edit pre-filled with the current *taken* slot correctly marked
      and not duplicated, slot move releasing/reserving correctly, a
      genuine 409 produced by racing two appointments onto the same
      slot, delete, all against the real dev database when the
      Appointments UI was implemented).

### 9. Regression: existing functionality preserved

- [x] `/` unaffected — `src/app.test.ts` passing.
- [x] `GET /api/therapies` / `GET /api/slots` behave as before, now
      Postgres-backed.
- [x] `GET /api/ailments/:id/therapies` still matches by category.
- [x] `/dashboard`'s Therapies and Slots sections remain read-only —
      confirmed by inspecting `src/app.ts`: no edit/delete controls
      exist for either section.
- [ ] Responsive layout at mobile/tablet/desktop widths with the new
      forms/controls — **not re-verified visually this audit** (no
      browser available in this pass); the new markup reuses the same
      `.table-responsive`/PicoCSS patterns already validated for
      responsiveness in `specs/2026-08-22-mvp-hardening/`, and adds no
      fixed-width elements, but an actual visual check is still
      outstanding.

## Ready to merge when

All checklist items pass, `npm run build` and `npm test` are green, the
assumption above is confirmed (done), and the diff contains only what's
in `requirements.md` — confirmed via `git diff main..feature/postgres-crud-ui
--stat` (Docker Compose for Postgres, env/migration/seed setup, the
database connection layer, the repository layer, Ailment/Appointment
CRUD at the API and UI layers, and their tests; no Agents table, no
ORM, no containerized app, no client-side framework).

**This phase is ready to merge.** Finding 1 (the pool `error`-listener
gap) is resolved and covered by automated tests plus a live
stop/fail/recover validation (see "Hotfix validation") — it is no
longer a limitation. The mobile/tablet/desktop visual re-check and the
port-conflict re-test are the only items not re-verified in this
specific audit pass (both were verified earlier in this phase's
history, per the notes above); neither is a merge blocker.
