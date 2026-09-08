# Validation — AgentClinic UI Polish

## Automated tests

1. Ailment new/edit form displays "Agent Name" (`ailmentsUi.test.ts`).
2. Appointment new/edit form displays "Agent Name" (`appointmentsUi.test.ts`).
3. Both forms still submit through `name="agentId"` (existing assertions,
   unchanged, re-verified still passing).
4. Dashboard Appointments header displays "Agent Name" (`app.test.ts`).
5. `formatSlotLabel()` produces `YYYY-MM-DD HH:MM UTC` for a valid ISO input,
   and returns `'Unknown'` (does not throw) for an invalid one
   (`dateFormat.test.ts`).
6. Dashboard shows the formatted UTC time for a booked appointment
   (`app.test.ts`).
7. Dashboard does not contain a raw `.000Z`-suffixed timestamp when an
   appointment exists (`app.test.ts`).
8. `/dashboard`'s rendered body uses `class="content content--wide"`
   (`app.test.ts`); `main(content, { wide: true })` renders that class
   directly (`main.test.ts`).
9. `/` (home) and other non-dashboard pages render `class="content"` without
   `content--wide` (`app.test.ts`); `main(content)` (no options) keeps
   rendering plain `class="content"` (`main.test.ts`, existing case kept).
10. `styles.css` no longer hardcodes `#14213d` on `.content a`; `.content--wide`
    exists with a larger `max-width`; `.actions` is `nowrap` by default and
    `wrap` again inside the `max-width: 480px` media query
    (`styles.test.ts`).

Existing tests that must keep passing unmodified in intent (only extended,
never weakened): the full `app.test.ts`, `routes/*.test.ts`,
`components/*.test.ts`, `layout.test.ts`, `styles.test.ts` suites, and the
`db/repository/*.integration.test.ts` suite (unaffected — no repository code
changes in this phase).

## Commands

From `Video05_Creating_the_Constitution/`:

```bash
npm test
npm run build
```

```bash
npm run test:db   # only if TEST_DATABASE_URL / a reachable Postgres test DB is available
```

No database credentials are to be echoed by any of these commands' output;
if any command would require printing `.env` contents to run, that step is
skipped and reported instead of worked around.

### Result (2026-09-08, after Docker Desktop was started)

`docker compose up -d` brought the existing `postgres` container to
`Up ... (healthy)`. `.env` was created (with the user's explicit
confirmation) as an unmodified copy of `.env.example` — no invented
values. `npm run test:db` then ran against the real
`agentclinic_test` database: **4 test files, 33 tests, all passed**
(`appointments.integration.test.ts`, `ailments.integration.test.ts`,
`testDatabaseGuard.integration.test.ts`,
`therapiesAndSlots.integration.test.ts`). `npm test` (mocked unit suite)
and `npm run build` were re-run at the same time and remained
green/clean (146/146, no type errors).

## Manual browser verification checklist

1. Home page in light mode — "Go to dashboard" link readable.
2. Home page in dark mode (`prefers-color-scheme: dark`) — link readable,
   passes the contrast fix.
3. Keyboard-tab to "Go to dashboard" — focus ring visible.
4. Dashboard with zero ailments — placeholder row unchanged.
5. Dashboard with exactly one ailment — row height compact, Edit/Delete on
   one line, columns aligned with header.
6. Dashboard with multiple ailments — unchanged/still aligned.
7. Dashboard with a realistic appointment — Time column shows
   `YYYY-MM-DD HH:MM UTC`, not a raw ISO string.
8. Dashboard at ≥1280px width — no horizontal scrollbar on the Appointments
   table with realistic seed data; Therapy names fully readable; Edit/Delete
   on one line.
9. Dashboard at ~768px — layout still usable; `.content--wide`'s 960px cap
   naturally narrows to the viewport; `.table-responsive` fallback available
   if content still doesn't fit.
10. Dashboard at ≤480px — narrow-screen media query applies: header wraps,
    `.actions` may wrap Edit/Delete again if needed, content not clipped.

Each item's outcome (performed and passed / performed and failed / not
performed because no browser was available in this environment) is recorded
in the final implementation report rather than assumed.

### Result: user-confirmed (2026-09-08)

No browser was ever connected to the implementing agent's own tooling in
this environment (confirmed via `list_connected_browsers` returning an
empty list), so the agent could not perform this checklist itself at any
point — the earlier report stated that plainly rather than claiming it.

The **user** subsequently ran the application locally (PostgreSQL started
via `docker compose up -d`, app started via `npm start`, per the session's
own commands) and manually inspected the live UI in their own browser. The
user reported: **"I manually verified the AgentClinic website in the
browser and the UI now looks correct."** This is a general confirmation
covering the checklist above, not a point-by-point sign-off against each
of the 10 individual items — no per-item detail (which viewport widths,
which color-scheme setting, etc.) was given, so none is invented here.
Recorded as the user's own verification, not the agent's.

## Acceptance criteria (pass/fail)

- [x] All six required-changes areas (§1–§6 of `requirements.md`) implemented
      exactly as scoped, with §7 (theme) left untouched beyond the specific
      fixes.
- [x] `agentId` / `agent_id` naming, migrations, repository queries, and the
      JSON API `agentId` field are byte-for-byte unchanged.
- [x] `npm test` passes with zero regressions in previously-passing tests.
- [x] `npm run build` (`tsc`) succeeds with no new type errors.
- [x] No inline `style="..."` attributes were introduced.
- [x] No `table-layout: fixed` was introduced.
- [x] No CSS framework, date library, or client-side JS framework was added
      (`package.json` dependencies unchanged).
- [x] `.table-responsive { overflow-x: auto; }` still present, unremoved.
- [x] `npm run test:db` passes against a real Postgres test database
      (33/33, once Docker/`.env` were available).
- [x] Manual browser check — user-confirmed (see "Result: user-confirmed"
      above); not independently verified by the agent, which had no
      connected browser at any point in this work.
