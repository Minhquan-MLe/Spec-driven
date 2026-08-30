-- An appointment books one agent into one therapy at one slot.
--
-- The UNIQUE constraint on slot_id stops two appointments from ever
-- sharing the same slot at the database level, independent of whatever
-- application-level check runs above it (see
-- specs/2026-08-30-postgres-crud-ui/requirements.md, "Slot reservation
-- and release").
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  therapy_id INTEGER NOT NULL REFERENCES therapies (id),
  slot_id INTEGER NOT NULL UNIQUE REFERENCES slots (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
