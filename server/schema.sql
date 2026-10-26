CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE IF NOT EXISTS schema_version(version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL,
 role text NOT NULL CHECK(role IN ('administrator','receptionist','therapist','patient')),
 password_hash text, cognito_sub text UNIQUE, active boolean NOT NULL DEFAULT true,
 consent boolean NOT NULL DEFAULT false, reminders boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id uuid REFERENCES users(id), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms(id uuid PRIMARY KEY, name text UNIQUE NOT NULL, active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS settings(id integer PRIMARY KEY CHECK(id=1), timezone text NOT NULL DEFAULT 'America/New_York',
 open_hour integer NOT NULL DEFAULT 8 CHECK(open_hour>=0 AND open_hour<24),
 close_hour integer NOT NULL DEFAULT 18 CHECK(close_hour>0 AND close_hour<=24),
 weekdays integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
 CHECK(close_hour>open_hour));
CREATE TABLE IF NOT EXISTS delegations(patient_id uuid REFERENCES users(id), caregiver_id uuid REFERENCES users(id),
 active boolean NOT NULL DEFAULT true, PRIMARY KEY(patient_id,caregiver_id), CHECK(patient_id<>caregiver_id));
CREATE TABLE IF NOT EXISTS appointments(
 id uuid PRIMARY KEY, patient_id uuid NOT NULL REFERENCES users(id), therapist_id uuid NOT NULL REFERENCES users(id),
 room_id uuid NOT NULL REFERENCES rooms(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','cancelled')),
 channel text NOT NULL CHECK(channel IN ('patient','telephone','walk-in','caregiver','waitlist','staff')),
 treatment text NOT NULL, version integer NOT NULL DEFAULT 1, created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at),
 EXCLUDE USING gist(therapist_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (status='scheduled'),
 EXCLUDE USING gist(room_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (status='scheduled')
);
CREATE TABLE IF NOT EXISTS exceptions(id uuid PRIMARY KEY, therapist_id uuid REFERENCES users(id), room_id uuid REFERENCES rooms(id),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, reason text NOT NULL, CHECK(ends_at>starts_at));
CREATE TABLE IF NOT EXISTS waitlist(id uuid PRIMARY KEY, patient_id uuid NOT NULL REFERENCES users(id),
 preference text NOT NULL, status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','booked','removed')),
 appointment_id uuid REFERENCES appointments(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS documents(id uuid PRIMARY KEY, patient_id uuid NOT NULL REFERENCES users(id),
 uploader_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, mime text NOT NULL, size integer NOT NULL,
 storage_key uuid NOT NULL UNIQUE, sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES users(id), action text NOT NULL, entity_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reminders(id uuid PRIMARY KEY, appointment_id uuid NOT NULL REFERENCES appointments(id),
 appointment_version integer NOT NULL, due_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','suppressed','failed','ambiguous')),
 attempts integer NOT NULL DEFAULT 0, reason text, sent_at timestamptz,
 UNIQUE(appointment_id,appointment_version));
CREATE INDEX IF NOT EXISTS appointment_patient_idx ON appointments(patient_id,starts_at);
CREATE INDEX IF NOT EXISTS reminder_pending_idx ON reminders(status,due_at);
INSERT INTO settings(id) VALUES(1) ON CONFLICT DO NOTHING;
INSERT INTO schema_version(version) VALUES(1) ON CONFLICT DO NOTHING;

