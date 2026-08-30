-- Appointment time slots. "taken" is the source of truth for whether a
-- slot is available; appointments.slot_id (see 004) is the other half
-- of that relationship.
CREATE TABLE IF NOT EXISTS slots (
  id SERIAL PRIMARY KEY,
  time_slot TIMESTAMPTZ NOT NULL UNIQUE,
  taken BOOLEAN NOT NULL DEFAULT false
);
