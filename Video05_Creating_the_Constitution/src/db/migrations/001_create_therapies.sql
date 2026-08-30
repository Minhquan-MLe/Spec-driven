-- Therapies are seeded, read-only reference data (see src/db/seed.ts).
-- "categories" lists which ailment categories this therapy addresses,
-- restricted to the same fixed set the app already validates against
-- (see src/store.ts's CATEGORIES).
CREATE TABLE IF NOT EXISTS therapies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  categories TEXT[] NOT NULL CHECK (
    categories <@ ARRAY['performance', 'reliability', 'integration', 'auth', 'other']::text[]
  )
);
