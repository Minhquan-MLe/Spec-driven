# Plan — AgentClinic UI Polish

## Phase 1: Shared date formatting

1. Create `src/dateFormat.ts` exporting `formatSlotLabel(timeSlot: string): string`,
   moved from `src/routes/appointmentsUi.ts`, with an added guard: if
   `new Date(timeSlot)` is invalid (`Number.isNaN(date.getTime())`), return
   `'Unknown'` instead of calling `.toISOString()` (which throws on an invalid
   date).
2. Update `src/routes/appointmentsUi.ts` to import `formatSlotLabel` from
   `../dateFormat` and delete its local definition. No other change to that
   file's behavior.
3. Add `src/dateFormat.test.ts`: valid-input formatting, and the invalid-input
   fallback.

## Phase 2: Agent label wording

4. `src/components/ailmentForm.ts:55` — label text "Agent ID" → "Agent Name"
   (attribute `for="agentId"` and the `<input name="agentId">` unchanged).
5. `src/components/appointmentForm.ts:81` — same change.
6. `src/app.ts` (dashboard Appointments `<thead>`) — `<th>Agent</th>` →
   `<th>Agent Name</th>`.
7. `src/routes/ailmentsUi.ts:60` and `src/routes/appointmentsUi.ts:131,207` —
   validation-error copy "Agent ID, ..." → "Agent Name, ...".
8. Update `src/routes/ailmentsUi.test.ts` / `src/routes/appointmentsUi.test.ts`
   to assert the visible "Agent Name" label text is present alongside the
   existing `name="agentId"` assertions (kept, unchanged).
9. Update `src/app.test.ts` dashboard test to assert the Appointments header
   reads "Agent Name".

## Phase 3: Dashboard link contrast

10. `public/styles.css` — delete the `.content a { color: #14213d; }` rule
    entirely, letting PicoCSS's own theme-aware `:where(a:not([role=button]))`
    rule (and its hover/focus variants) apply to all three current plain-link
    usages.
11. `src/styles.test.ts` — add a regression assertion that `.content a` no
    longer hardcodes `#14213d` (or any literal hex color), guarding against
    the bug being reintroduced.

## Phase 4: Dashboard width

12. `src/components/main.ts` — change signature to
    `main(content: string, options: { wide?: boolean } = {})`; render
    `class="content content--wide"` when `options.wide` is true, else
    `class="content"` (current behavior, unchanged for every existing call).
13. `src/layout.ts` — change signature to
    `layout(title: string, content: string, options: { wide?: boolean } = {})`,
    passing `options` through to `main()`. All existing two-argument call
    sites keep compiling and behaving identically.
14. `src/app.ts` — the `/dashboard` route's `c.html(layout(...))` call passes
    `{ wide: true }` as the third argument. No other call site changes.
15. `public/styles.css` — add `.content--wide { max-width: 960px; }` near the
    existing `.content` rule.
16. `src/components/main.test.ts` — add a case for `main(content, { wide: true })`
    producing `<main class="content content--wide">`, alongside the existing
    default-case test (kept, unchanged).
17. `src/app.test.ts` — add assertions that `/dashboard`'s body contains
    `class="content content--wide"` and that `/` (home page) contains
    `<main class="content">` without `content--wide`.

## Phase 5: Actions column + appointment time on the dashboard

18. `public/styles.css` — change `.actions` from `flex-wrap: wrap` to
    `flex-wrap: nowrap`, and add a `min-width` (`12rem`) so the Edit+Delete
    pair always has room. Add `flex-wrap: wrap;` back for `.actions` inside
    the existing `@media (max-width: 480px)` block only.
19. `src/styles.test.ts` — add assertions: `.actions` is `nowrap` at the
    top level, and `wrap` is restored inside the `480px` media query.
20. `src/app.ts` — import `formatSlotLabel` from `./dateFormat`; in the
    appointment-row template, replace
    `escapeHtml(slot?.timeSlot ?? 'Unknown')` with
    `escapeHtml(slot ? formatSlotLabel(slot.timeSlot) : 'Unknown')` (keeps the
    existing "Unknown" fallback for a missing slot without ever feeding that
    literal through the formatter).
21. `src/app.test.ts` — extend the existing "renders ailments, therapies, and
    appointments" test to assert the dashboard body matches
    `/\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/` for the appointment's time and does
    **not** contain `.000Z` (regression guard for the raw-ISO bug).

## Phase 6: Verification

22. Run `npm test` (unit suite, mocked store) from
    `Video05_Creating_the_Constitution/`.
23. Run `npm run build` (`tsc`) to confirm the new optional-parameter
    signatures type-check across all call sites.
24. Run `npm run test:db` only if a reachable Postgres test database is
    configured in this environment; state plainly if it is not available
    rather than skipping silently.
25. Manual browser verification per `validation.md`'s checklist, to the extent
    a browser is available in this environment; state plainly which checks
    could not be performed.

## Files touched (expected)

- `src/dateFormat.ts` (new)
- `src/dateFormat.test.ts` (new)
- `src/routes/appointmentsUi.ts`
- `src/components/ailmentForm.ts`
- `src/components/appointmentForm.ts`
- `src/app.ts`
- `src/routes/ailmentsUi.ts`
- `public/styles.css`
- `src/layout.ts`
- `src/components/main.ts`
- `src/app.test.ts`
- `src/components/main.test.ts`
- `src/routes/ailmentsUi.test.ts`
- `src/routes/appointmentsUi.test.ts`
- `src/styles.test.ts`
- `specs/2026-09-07-agentclinic-ui-polish/*.md` (this spec)

Not touched: any file under `src/db/` (migrations, repository, seed), any
`VideoNN_*` lesson snapshot, `docker-compose.yml`, `.env*`, `dist/`.
