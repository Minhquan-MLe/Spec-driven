-- An ailment reported by an agent. agent_id stays a plain text column —
-- there is no agents table (see
-- specs/2026-08-30-postgres-crud-ui/requirements.md, "Decisions").
CREATE TABLE IF NOT EXISTS ailments (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('performance', 'reliability', 'integration', 'auth', 'other')
  ),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
