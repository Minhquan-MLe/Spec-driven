# Plan — Skeleton App + Basic Layout

Numbered task groups, organized by technical layer. Complete each group
before moving to the next.

## 1. Server bootstrap

1.1. Create the Hono app entry point (`src/index.ts` or equivalent),
     replacing the current empty scaffold.
1.2. Wire it up to `@hono/node-server` so it listens on a local port.
1.3. Update `package.json` scripts so the app can be built (`tsc`) and run
     locally (e.g. `npm start`).

## 2. Layout component

2.1. Add a shared layout function/component: header, nav placeholder,
     content area.
2.2. Keep it framework-free — plain HTML strings/JSX-via-Hono, no client
     framework.

## 3. Routes

3.1. Add `/` route rendering the shared layout.
3.2. Add `/dashboard` route rendering the shared layout with placeholder
     dashboard content.

## 4. Minimal AgentClinic home page

4.1. Replace the `/` route's placeholder content with minimal
     AgentClinic-specific content: an "AgentClinic" heading and a one-line
     description drawn from `specs/mission.md` (a clinic for AI agents to
     report ailments, find therapies, and book appointments).
4.2. Add a link from the home page to `/dashboard`.
4.3. Keep it minimal — no marketing copy, imagery, or styling beyond what's
     needed to make the homepage recognizably AgentClinic rather than a
     blank placeholder.

## 5. Static assets / minimal styling

5.1. Add a small stylesheet (served as a static asset) so the shell looks
     intentional rather than unstyled — no responsive/visual polish, just
     enough to not look broken.

## 6. Manual smoke check

6.1. Run the server locally.
6.2. Visit `/` and `/dashboard` in a browser; confirm both render the
     shared layout without errors.
6.3. Confirm the home page shows the AgentClinic heading/description and
     that its link to `/dashboard` works.
6.4. Confirm `npm run build` succeeds with no TypeScript errors.
