# Requirements — AgentClinic UI Polish

## Phase

A narrowly-scoped follow-up to `specs/2026-08-30-postgres-crud-ui/`, addressing six
UI issues raised in review of the current dashboard/CRUD screens. Based on
`specs/2026-08-30-postgres-crud-ui/requirements.md` and the investigation report
produced against commit `f5d2d31` on `main` (branch `feature/agentclinic-ui-polish`).
No persistence, API, or validation behavior changes — display-layer only.

## Scope

### 1. Agent label wording

- Ailment new/edit form label: "Agent ID" → "Agent Name".
- Appointment new/edit form label: "Agent ID" → "Agent Name".
- Dashboard Appointments table header: "Agent" → "Agent Name".
- Validation error copy in `ailmentsUi.ts` and `appointmentsUi.ts` that names the
  field ("Agent ID, category, title, and description are all required.", "Agent
  ID, therapy, and slot are all required.") updated to say "Agent Name" for
  consistency with the new label — these are also human-facing text naming the
  same field, not internal identifiers.
- **Unchanged:** the `name="agentId"` form field, the `agentId` TypeScript
  property, the `agentId` JSON API field, the `agent_id` Postgres column, all
  repository queries, all migrations, and all previously stored data. No
  `agents` table is introduced.

### 2. Dashboard-link contrast

- `.content a { color: #14213d; }` in `public/styles.css` hardcodes a color that
  fails WCAG AA (~1.14:1) against PicoCSS's automatic dark-mode background
  (`prefers-color-scheme: dark`, no `data-theme` attribute is set anywhere in
  the app).
- All three current uses of the plain (`role` other than `button`) anchor styled
  by `.content a` were checked: the home page's "Go to dashboard" link
  (`src/app.ts`), and the "Back to dashboard" links on the ailment/appointment
  not-found pages (`src/routes/ailmentsUi.ts`, `src/routes/appointmentsUi.ts`).
  All three share the identical bug and none depend on the fixed navy color for
  anything — removing the hardcoded override benefits all three identically
  with no negative side effect, so the fix applies to `.content a` directly
  rather than introducing a new scoped class. (Scoping to a new class was
  considered per the review guidance but rejected as unnecessary complexity: it
  would leave the other two identical links equally broken.)
- Fix must restore PicoCSS's own theme-aware link color (`var(--pico-primary)`
  driven), which meets AA in both themes (computed: light ≈5.23:1, dark
  ≈7.03:1) and preserves PicoCSS's native hover/focus color transitions (a
  hardcoded `color` — even a theme-aware-looking one — would still block
  PicoCSS's low-specificity hover-state rule; only removing the override keeps
  hover reactive).
- No new fixed, single-theme color introduced anywhere.
- The link stays a plain `<a>` (no `role="button"`) — it is navigation, and a
  normal link is the semantically correct choice.

### 3. Appointment time formatting

- Dashboard's Appointments "Time" column currently renders the raw
  `slot.timeSlot` ISO string (e.g. `2026-09-02T00:00:00.000Z`).
- `src/routes/appointmentsUi.ts` already implements the desired format via a
  private `formatSlotLabel()` (`YYYY-MM-DD HH:MM UTC`), used only for the
  New/Edit Appointment slot `<select>` — the dashboard never calls it.
- Move `formatSlotLabel` into a new shared module (`src/dateFormat.ts`) so both
  `appointmentsUi.ts` and `app.ts` (dashboard) use one implementation.
- The formatter must not throw on unparseable input — it must return a safe
  fallback string (`'Unknown'`) instead of letting `Date#toISOString()` throw a
  `RangeError` on an invalid date, since it is now an exported/shared function
  that a future caller could feed unvalidated input.
- No change to the stored value, the Postgres `TIMESTAMPTZ` column, repository
  mapping (`row.time_slot.toISOString()`), or the JSON API's `timeSlot` field
  — this is a display-only transformation of the same instant, still in UTC,
  still explicitly labeled "UTC" (no browser-local conversion).
- Dashboard output must be run through `escapeHtml()` the same as every other
  interpolated dashboard field, consistent with existing convention in
  `src/app.ts`.

### 4. Dashboard width

- The shared `.content` container (`public/styles.css`) is capped at
  `max-width: 640px` on every page, at every viewport size — there is no wider
  variant. Combined with the Appointments/Ailments tables' intrinsic content
  width, this forces horizontal scrolling even on wide desktop viewports.
- Add a dashboard-only wide modifier, `.content--wide` (`max-width: 960px`),
  applied only to `/dashboard`. All other pages (home, ailment/appointment
  forms, not-found pages) keep the existing `640px` `.content` width unchanged.
- `layout()` (`src/layout.ts`) and `main()` (`src/components/main.ts`) gain an
  optional options parameter (`{ wide?: boolean }`, default `{}` /
  `wide: false`) so every existing call site keeps compiling and behaving
  exactly as before without modification; only the `/dashboard` route passes
  `{ wide: true }`.
- `.table-responsive { overflow-x: auto; }` is preserved unchanged as a
  fallback for genuinely narrow viewports.

### 5. Actions-column wrapping

- `.actions` (applied directly to the Actions `<td>` in both the Ailments and
  Appointments tables) currently sets `flex-wrap: wrap`, unconditionally. Under
  auto table-layout, a narrow Actions column can push "Edit" and "Delete" onto
  separate lines, especially with few rows to average column widths across —
  most visibly with a single-row table.
- Default (non-narrow) behavior changes to `flex-wrap: nowrap` plus a
  `min-width` on `.actions` sized to comfortably fit both controls side by
  side, so Edit/Delete never wrap at normal desktop/tablet widths regardless of
  row count.
- Wrapping is restored only inside the existing `@media (max-width: 480px)`
  block, for genuinely narrow screens.
- `.actions form { margin: 0; }` (already correct) is preserved unchanged.
- No `table-layout: fixed` and no new fixed widths on the other (ID/Category/
  Title/Status/Agent/Therapy/Time) columns.
- Applies identically to both the Ailments and Appointments tables, since both
  reuse the same `.actions` class and markup shape.

### 6. Desktop horizontal scroll

- Not a separate code change — the combined effect of #3 (shorter Time
  column), #4 (wider `.content--wide` dashboard container), and #5 (Actions
  column no longer wrapping, so its own height/width footprint is
  predictable) is expected to keep the Appointments table's intrinsic width
  under the new 960px-based content box at desktop viewports (≥1280px), with
  `.table-responsive`'s `overflow-x: auto` remaining only as a fallback for
  narrow screens.
- No clipping or `overflow: hidden` is introduced. `.table-responsive` is not
  removed.

### 7. Theme preservation

- No changes to PicoCSS's own color tokens, button styles (`.secondary`,
  `.contrast`), status badge styling (`<mark>`), typography, or the overall
  palette.
- `.site-footer`'s hardcoded `border-top: 1px solid #ddd; color: #666;` is
  left unchanged — out of scope per the review guidance (documented as a
  possible future improvement, not addressed here since it is not a confirmed
  WCAG AA failure blocking this change).

## Out of scope

- Any `agents` table or foreign-key relationship for `agentId`.
- Renaming `agentId` / `agent_id` anywhere in code, API, or schema.
- Any database migration, seed-data change, or repository query change.
- A date-formatting library dependency (the fix reuses plain
  `Date`/`toISOString()` slicing, matching the existing `formatSlotLabel`
  approach).
- A frontend framework or client-side JavaScript.
- A full visual redesign, palette change, or footer contrast fix.
- `table-layout: fixed` (rejected — risks regressing long Title/Therapy text
  wrapping; not used unless the CSS-only `nowrap` + `min-width` approach on
  `.actions` proves insufficient in manual browser testing).

## Decisions

- **Link-contrast fix scope:** apply to `.content a` directly rather than a
  new scoped class, because all three current plain-link usages share the
  identical defect and none rely on the old color (see §2 above). Documented
  here so the decision is auditable rather than silent.
- **Dashboard wide max-width:** `960px`, the upper bound the review explicitly
  called acceptable. Chosen over a tighter fit (e.g. ~800px) because exact
  intrinsic table widths depend on browser font metrics not measurable
  headlessly in this environment; manual browser verification is recommended
  in `validation.md` to confirm whether a narrower value would also work, but
  960px is not expected to need revisiting.
- **Shared date-format module name:** `src/dateFormat.ts`, matching the
  existing convention of small single-purpose modules (`src/validation.ts`,
  `src/html.ts`).
- **Invalid-date handling:** the formatter is defensive (fallback `'Unknown'`)
  even though no current caller passes genuinely invalid input, because it
  is now a shared/exported function per the review guidance's explicit ask
  ("do not allow formatting to crash an entire page").
