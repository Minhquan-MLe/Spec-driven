# Validation — MVP Verification & Hardening

## How to know this succeeded

This is validated by actual browser verification (not just `curl`) of the
existing Phase 1 + Phase 2 functionality against `mission.md`'s "Success
looks like" criteria, plus confirmation that the persistence/auth/
deployment decision is recorded and the tree stays green.

## Checklist

- [ ] `npm run build` and `npm test` pass before and after any change.
- [ ] `/` renders correctly (no horizontal overflow, legible content) at
      mobile (~375px), tablet (~768px), and desktop (~1280px) widths, in
      an actual browser.
- [ ] `/dashboard` renders correctly at the same three widths.
- [ ] The full agent loop (report ailment → matching therapies → available
      slots → book appointment) was exercised, and the resulting ailment,
      therapy match, and appointment are all visible on `/dashboard` —
      confirmed by screenshot, not just JSON response inspection.
- [ ] No clipped or horizontally-overflowing content on `/dashboard` at
      the mobile width. If found, it was fixed (e.g. table overflow
      wrapper) and re-verified by screenshot.
- [ ] `specs/roadmap.md` records that persistence, auth, and deployment
      were revisited for the MVP and intentionally left unchanged.
- [ ] `CHANGELOG.md` reflects this work (via the `/changelog` skill).
- [ ] No new feature, persistence, auth, or deployment work was
      introduced — diff is limited to what's in `requirements.md`
      (verification + at most a targeted responsive fix + the roadmap
      note).

## Ready to merge when

All checklist items pass, the three viewport widths were actually
screenshotted (not assumed), and the diff contains nothing beyond a
possible responsive fix and the roadmap documentation update. At that
point the system meets `mission.md`'s "Success looks like" bar and the
`mvp` branch is ready to merge into `main`.
