/*
  # Therapy Sessions and Appointments Schema

  ## Overview
  This migration creates tables for managing therapy sessions, appointments,
  and session-related data like notes and recordings.

  ## New Tables
  
  ### `appointments`
  - `id` (uuid, primary key) - Unique identifier
  - `client_id` (uuid) - References profiles.id (client)
  - `therapist_id` (uuid) - References therapist_profiles.id
  - `scheduled_at` (timestamptz) - Appointment date and time
  - `duration_minutes` (integer) - Session duration
  - `status` (text) - scheduled, confirmed, completed, cancelled, no_show
  - `cancellation_reason` (text) - Reason if cancelled
  - `cancelled_by` (uuid) - Who cancelled (references profiles.id)
  - `cancelled_at` (timestamptz) - Cancellation timestamp
  - `meeting_url` (text) - Video call link
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `session_notes`
  - `id` (uuid, primary key) - Unique identifier
  - `appointment_id` (uuid) - References appointments.id
  - `therapist_id` (uuid) - References therapist_profiles.id
  - `content` (text) - Session notes (encrypted in production)
  - `is_private` (boolean) - Private to therapist only
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `session_recordings`
  - `id` (uuid, primary key) - Unique identifier
  - `appointment_id` (uuid) - References appointments.id
  - `storage_path` (text) - Path to recording file
  - `duration_seconds` (integer) - Recording duration
  - `file_size_bytes` (bigint) - File size
  - `status` (text) - processing, available, deleted
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Clients can view and manage their own appointments
  - Therapists can view and manage appointments with their clients
  - Only therapists can create and view session notes
  - Session recordings accessible only to participants

  ## Indexes
  - Index on appointments by client_id, therapist_id, and scheduled_at
  - Index on appointments by status for filtering
  - Index on session_notes by appointment_id
*/

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  cancellation_reason text DEFAULT '',
  cancelled_by uuid REFERENCES profiles(id),
  cancelled_at timestamptz,
  meeting_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create session_notes table
CREATE TABLE IF NOT EXISTS session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create session_recordings table
CREATE TABLE IF NOT EXISTS session_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  duration_seconds integer DEFAULT 0,
  file_size_bytes bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'available', 'deleted')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_session_notes_appointment ON session_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_session_recordings_appointment ON session_recordings(appointment_id);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

-- Appointments policies
CREATE POLICY "Clients can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Therapists can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = therapist_id);

CREATE POLICY "Clients can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Therapists can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

-- Session notes policies
CREATE POLICY "Therapists can manage own session notes"
  ON session_notes FOR ALL
  TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

-- Session recordings policies
CREATE POLICY "Clients can view recordings of their sessions"
  ON session_recordings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = session_recordings.appointment_id
      AND appointments.client_id = auth.uid()
      AND session_recordings.status = 'available'
    )
  );

CREATE POLICY "Therapists can view recordings of their sessions"
  ON session_recordings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = session_recordings.appointment_id
      AND appointments.therapist_id = auth.uid()
      AND session_recordings.status = 'available'
    )
  );

CREATE POLICY "Therapists can create session recordings"
  ON session_recordings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = session_recordings.appointment_id
      AND appointments.therapist_id = auth.uid()
    )
  );

-- Triggers
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_notes_updated_at ON session_notes;
CREATE TRIGGER update_session_notes_updated_at
  BEFORE UPDATE ON session_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();