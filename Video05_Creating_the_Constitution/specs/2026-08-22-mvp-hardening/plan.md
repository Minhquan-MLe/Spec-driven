# Plan — MVP Verification & Hardening

Numbered task groups, organized in the order they should run. Complete
each group before moving to the next.

## 1. Baseline

1.1. Run `npm run build` and `npm test` to confirm the tree is green
     before making any changes.
1.2. Run `npm start` locally.

## 2. Browser verification (`claude-in-chrome`)

2.1. Open `/` in a browser tab; resize to mobile (~375px), tablet
     (~768px), and desktop (~1280px) widths; screenshot each.
2.2. Open `/dashboard` at the same three widths; screenshot each. Note
     any horizontal overflow, clipped table content, or unstyled
     elements.
2.3. Exercise the full agent loop via the API (`curl` or the browser):
     report an ailment, list its matching therapies, list available
     slots, book an appointment against one.
2.4. Reload `/dashboard` at all three widths and confirm the ailment,
     matching therapy, and new appointment from 2.3 are visible and
     legible at each width.

## 3. Fix findings (only if 2.2/2.4 surfaced a problem)

3.1. If dashboard tables overflow the viewport at mobile width, wrap each
     `<table>` in a container with `overflow-x: auto` (or the equivalent
     Pico-friendly pattern) so only the table scrolls, not the page.
3.2. Re-screenshot the affected page/width to confirm the fix.
3.3. If no problems were found in step 2, skip this group entirely and
     say so in the validation notes.

## 4. Close the roadmap's open decision

4.1. Add a short note to `specs/roadmap.md` under Phase 2 (or immediately
     below it) recording that persistence, auth, and deployment were
     revisited for the MVP and intentionally left unchanged, with a
     one-line rationale (see `requirements.md`).

## 5. Regression check

5.1. Re-run `npm run build` and `npm test` after any fix from group 3.
5.2. Re-screenshot `/` at all three widths to confirm Phase 1's layout is
     unaffected by any change from group 3.

## 6. Wrap-up

6.1. Confirm the diff only touches what's in scope per `requirements.md`
     (styling fix if needed, roadmap note) — no unrelated changes.
6.2. Run the `/changelog` skill to record this work in `CHANGELOG.md`.
