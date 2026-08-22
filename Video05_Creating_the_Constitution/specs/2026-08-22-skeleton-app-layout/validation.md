# Validation — Skeleton App + Basic Layout

## How to know this phase succeeded

This phase is validated by automated Vitest tests plus a manual smoke
test, per `specs/tech-stack.md`.

## Checklist

- [x] `npm test` (Vitest) passes: unit tests for `header`/`main`/`footer`,
      a test for `layout()` composing them around a title/content and
      linking `/styles.css`, and route tests for `/` and `/dashboard`.
- [x] `npm run build` completes with no TypeScript errors, and test files
      are excluded from the compiled `dist/` output.
- [x] `npm start` (or equivalent) boots the Hono server without crashing.
- [x] Visiting `/` in a browser renders the shared layout — header (with
      nav placeholder), main content area, and footer — with no console
      errors.
- [x] `/styles.css` is correctly linked in the layout's `<head>` and
      loads with a 200 response (served via static file middleware).
- [x] The home page shows an "AgentClinic" heading and a one-line
      description consistent with `specs/mission.md`.
- [x] The home page's link to `/dashboard` is present and navigates
      correctly.
- [x] Visiting `/dashboard` in a browser renders the same shared layout
      with placeholder dashboard content, with no console errors.
- [x] The two routes visibly share the same layout markup/styling (not
      independently hand-rolled pages).
- [x] No domain logic (ailments/therapies/booking), persistence, or auth
      has been introduced — scope stayed to the skeleton.

## Ready to merge when

All checklist items pass and the diff contains only what's in scope per
`requirements.md` (server bootstrap, layout, two routes, minimal
AgentClinic home page content, minimal static styling, Vitest tests). No
unrelated changes.
