/*
  # Therapist Profiles and Credentials Schema

  ## Overview
  This migration creates tables for therapist-specific information including credentials,
  specializations, availability, and verification status.

  ## New Tables
  
  ### `therapist_profiles`
  - `id` (uuid, primary key) - References profiles.id
  - `license_number` (text, unique) - Professional license number
  - `license_state` (text) - State of licensure
  - `license_expiry` (date) - License expiration date
  - `years_experience` (integer) - Years of practice
  - `bio` (text) - Professional biography
  - `hourly_rate` (decimal) - Standard session rate
  - `verification_status` (text) - pending, verified, rejected
  - `verified_at` (timestamptz) - Verification timestamp
  - `is_accepting_clients` (boolean) - Currently accepting new clients
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `specializations`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text, unique) - Specialization name (e.g., "Anxiety", "Depression")
  - `description` (text) - Brief description
  - `created_at` (timestamptz) - Creation timestamp

  ### `therapist_specializations`
  - `id` (uuid, primary key) - Unique identifier
  - `therapist_id` (uuid) - References therapist_profiles
  - `specialization_id` (uuid) - References specializations
  - `created_at` (timestamptz) - Assignment timestamp

  ### `therapist_availability`
  - `id` (uuid, primary key) - Unique identifier
  - `therapist_id` (uuid) - References therapist_profiles
  - `day_of_week` (integer) - 0=Sunday, 6=Saturday
  - `start_time` (time) - Availability start time
  - `end_time` (time) - Availability end time
  - `is_active` (boolean) - Currently active
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Therapists can manage their own profiles and availability
  - Clients can view verified therapist profiles

  ## Indexes
  - Index on verification_status for filtering
  - Index on is_accepting_clients for quick searches
  - Composite index on therapist_availability for scheduling queries
*/

-- Create specializations table
CREATE TABLE IF NOT EXISTS specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create therapist_profiles table
CREATE TABLE IF NOT EXISTS therapist_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  license_number text UNIQUE,
  license_state text DEFAULT '',
  license_expiry date,
  years_experience integer DEFAULT 0,
  bio text DEFAULT '',
  hourly_rate decimal(10,2) DEFAULT 0.00,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  is_accepting_clients boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create therapist_specializations junction table
CREATE TABLE IF NOT EXISTS therapist_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  specialization_id uuid NOT NULL REFERENCES specializations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(therapist_id, specialization_id)
);

-- Create therapist_availability table
CREATE TABLE IF NOT EXISTS therapist_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CHECK (end_time > start_time)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_therapist_profiles_verification ON therapist_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_therapist_profiles_accepting ON therapist_profiles(is_accepting_clients);
CREATE INDEX IF NOT EXISTS idx_therapist_availability_lookup ON therapist_availability(therapist_id, day_of_week, is_active);
CREATE INDEX IF NOT EXISTS idx_therapist_specializations_therapist ON therapist_specializations(therapist_id);

-- Insert common specializations
INSERT INTO specializations (name, description) VALUES
  ('Anxiety', 'Treatment for anxiety disorders and stress management'),
  ('Depression', 'Support for depressive disorders and mood management'),
  ('Trauma & PTSD', 'Trauma-informed care and PTSD treatment'),
  ('Relationship Issues', 'Couples and relationship counseling'),
  ('Grief & Loss', 'Support through bereavement and loss'),
  ('Stress Management', 'Techniques for managing daily stress'),
  ('Self-Esteem', 'Building confidence and self-worth'),
  ('Career Counseling', 'Professional and career guidance'),
  ('Family Conflict', 'Family therapy and conflict resolution'),
  ('Addiction', 'Substance abuse and addiction recovery')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_availability ENABLE ROW LEVEL SECURITY;

-- Therapist profiles policies
CREATE POLICY "Therapists can view own profile"
  ON therapist_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Therapists can update own profile"
  ON therapist_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Clients can view verified therapist profiles"
  ON therapist_profiles FOR SELECT
  TO authenticated
  USING (verification_status = 'verified');

CREATE POLICY "Therapists can insert own profile"
  ON therapist_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Specializations policies
CREATE POLICY "Authenticated users can view specializations"
  ON specializations FOR SELECT
  TO authenticated
  USING (true);

-- Therapist specializations policies
CREATE POLICY "Therapists can manage own specializations"
  ON therapist_specializations FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Authenticated users can view therapist specializations"
  ON therapist_specializations FOR SELECT
  TO authenticated
  USING (true);

-- Therapist availability policies
CREATE POLICY "Therapists can manage own availability"
  ON therapist_availability FOR ALL
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Authenticated users can view verified therapist availability"
  ON therapist_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM therapist_profiles tp
      WHERE tp.id = therapist_availability.therapist_id
      AND tp.verification_status = 'verified'
    )
  );

-- Trigger to update updated_at on therapist_profiles
DROP TRIGGER IF EXISTS update_therapist_profiles_updated_at ON therapist_profiles;
CREATE TRIGGER update_therapist_profiles_updated_at
  BEFORE UPDATE ON therapist_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();