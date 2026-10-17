-- Solar dashboard schema (PostgreSQL / Neon)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS paired_devices (
  id UUID PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES paired_devices (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  username TEXT,
  encrypted_credentials TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_provider_connections_device ON provider_connections (device_id);
