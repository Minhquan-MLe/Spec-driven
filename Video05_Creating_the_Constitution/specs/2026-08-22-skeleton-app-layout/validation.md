# Validation — Skeleton App + Basic Layout

## How to know this phase succeeded

This phase is validated by manual smoke test — no automated test tooling
is introduced yet, per the requirements.

## Checklist

- [ ] `npm run build` completes with no TypeScript errors.
- [ ] `npm start` (or equivalent) boots the Hono server without crashing.
- [ ] Visiting `/` in a browser renders the shared layout (header, nav
      placeholder, content area) with no console errors.
- [ ] The home page shows an "AgentClinic" heading and a one-line
      description consistent with `specs/mission.md`.
- [ ] The home page's link to `/dashboard` is present and navigates
      correctly.
- [ ] Visiting `/dashboard` in a browser renders the same shared layout
      with placeholder dashboard content, with no console errors.
- [ ] The two routes visibly share the same layout markup/styling (not
      independently hand-rolled pages).
- [ ] No domain logic (ailments/therapies/booking), persistence, or auth
      has been introduced — scope stayed to the skeleton.

## Ready to merge when

All checklist items pass and the diff contains only what's in scope per
`requirements.md` (server bootstrap, layout, two routes, minimal
AgentClinic home page content, minimal static styling). No unrelated
changes.
