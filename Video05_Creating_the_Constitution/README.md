# AgentClinic

## Input from stakeholders

- Mary in engineering wants a reliable site with a popular stack based on TypeScript, giving agents and staff a dashboard for easy access.
- Susan in product has a set of features about agents and their ailments, therapies, and booking appointments.
- Steve in marketing wants an attractive site that works well with a modern browser.

## Running the app

```
npm install
npm run build
npm start
```

The app is then available at http://localhost:3000.

## Database (PostgreSQL, local dev)

AgentClinic's data (ailments, therapies, slots, appointments) lives in a
PostgreSQL 16 database, run locally with Docker Compose. You need
[Docker Desktop](https://www.docker.com/products/docker-desktop/) (or
another Docker Compose-compatible tool) installed and running.

1. **Copy the example environment file** (only needed once):

   ```
   cp .env.example .env
   ```

   The default values in `.env` work out of the box for local
   development. Only change `POSTGRES_PORT` if port `5432` is already
   used by something else on your machine.

2. **Start the database:**

   ```
   docker compose up -d
   ```

3. **Check it started successfully:**

   ```
   docker compose ps
   ```

   You should see the `postgres` service listed as `running (healthy)`.

   Then confirm the app can actually connect (not just that the
   container is up):

   ```
   npm run db:check
   ```

   You should see `OK: connected to the "development" database ...`. If
   `.env` is missing or `DATABASE_URL` is unset, this fails fast with a
   clear message instead of hanging or crashing.

4. **Create the database tables** (run once, and again any time a new
   migration file is added):

   ```
   npm run db:migrate
   ```

5. **Load the starter therapies and appointment slots:**

   ```
   npm run db:seed
   ```

   Both `db:migrate` and `db:seed` are safe to run more than once — they
   skip anything already applied/seeded instead of erroring or creating
   duplicates.

### Test database

Automated tests that need a real database use a **separate database**,
`agentclinic_test`, on the **same** Postgres container — not a second
container. Set it up once:

1. **Create the test database** (safe to run more than once — it skips
   creation if `agentclinic_test` already exists):

   ```
   npm run db:test:create
   ```

2. **Apply the same migrations to it:**

   ```
   npm run db:test:migrate
   ```

3. **Confirm the app can connect to it too:**

   ```
   npm run db:test:check
   ```

   You should see `OK: connected to the "test" database ...`.

This never touches the `agentclinic` (dev) database or its data — it
only adds a second, empty database alongside it on the same server.

### Repository database tests

`src/db/repository/` has a small set of functions that read/write
Postgres directly (used by a later phase, not yet by the running app).
Its integration tests connect to the **test** database and reset a few
tables between tests, so they run separately from the normal suite:

```
npm run test:db
```

This is different from plain `npm test` in two ways: it requires the
test database to exist and be migrated (steps above), and it truncates
the `ailments`/`therapies`/`slots`/`appointments` tables in
`agentclinic_test` between tests. Every test-table reset first checks
`SELECT current_database()` and refuses to run if it isn't connected to
the exact database named by `TEST_DATABASE_URL` — so even a badly
misconfigured `.env` can't cause this command to touch `agentclinic`'s
data. Plain `npm test` never loads these tests and never needs a
database at all.

To stop the database later (keeping all its data):

```
docker compose down
```

To stop the database **and permanently delete its data** (rarely what
you want — mainly useful for starting completely fresh):

```
docker compose down -v
```

**Note:** as of this phase, the running application (`npm start`) does
not read from or write to this database yet — it still uses the
in-memory store in `src/store.ts`. The database exists and is fully
set up, but wiring the app to it is a separate, later phase (see
`specs/2026-08-30-postgres-crud-ui/plan.md`).
