/*
  # Combined Migration: Analytics, Therapist Marketplace, Workbook, and Voice Messages

  ## Overview
  This migration creates all remaining systems in one file to improve efficiency:
  1. Progress Tracking & Analytics
  2. Therapist Marketplace & Sessions
  3. Conflict Resolution Workbook
  4. Voice Messages

  ## Analytics Tables

  ### `relationship_metrics`
  - Aggregate metrics calculated daily
  - Zone distribution, conflict trends, communication quality

  ## Therapist Tables

  ### `therapist_profiles`
  - Therapist directory with specializations
  
  ### `therapy_sessions`
  - Session booking and management

  ## Workbook Tables

  ### `workbook_exercises`
  - Gottman method exercises
  
  ### `exercise_completions`
  - User progress on exercises

  ## Voice Tables

  ### `voice_messages`
  - Audio messages between partners with transcription
*/

-- ============================================
-- ANALYTICS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS relationship_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  green_zone_percentage integer DEFAULT 0,
  yellow_zone_percentage integer DEFAULT 0,
  red_zone_percentage integer DEFAULT 0,
  avg_readiness_score integer DEFAULT 0,
  conflict_count integer DEFAULT 0,
  high_risk_message_count integer DEFAULT 0,
  gottman_violation_count integer DEFAULT 0,
  repair_attempt_count integer DEFAULT 0,
  repair_success_rate integer DEFAULT 0,
  avg_conflict_resolution_hours decimal DEFAULT 0,
  connection_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(couple_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_relationship_metrics_couple ON relationship_metrics(couple_id, metric_date DESC);

-- ============================================
-- THERAPIST MARKETPLACE
-- ============================================

CREATE TABLE IF NOT EXISTS therapist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  credentials text DEFAULT '',
  specializations text[] DEFAULT ARRAY[]::text[],
  bio text DEFAULT '',
  years_experience integer DEFAULT 0,
  session_rate_usd integer DEFAULT 150,
  accepts_insurance boolean DEFAULT false,
  insurance_providers text[] DEFAULT ARRAY[]::text[],
  availability_hours jsonb DEFAULT '{}'::jsonb,
  timezone text DEFAULT 'America/New_York',
  video_platform text DEFAULT 'zoom',
  is_accepting_clients boolean DEFAULT true,
  rating decimal DEFAULT 0,
  total_sessions integer DEFAULT 0,
  profile_image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS therapy_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  duration_minutes integer DEFAULT 50,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  session_type text DEFAULT 'individual' CHECK (session_type IN ('individual', 'couple', 'emergency')),
  video_link text DEFAULT '',
  pre_session_notes text DEFAULT '',
  post_session_notes text DEFAULT '',
  homework_assigned text DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_therapist_profiles_active ON therapist_profiles(is_accepting_clients);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_couple ON therapy_sessions(couple_id, scheduled_for DESC);

INSERT INTO therapist_profiles (full_name, credentials, specializations, bio, years_experience, session_rate_usd) VALUES
  ('Dr. Sarah Chen', 'PhD, LMFT', ARRAY['Gottman Method', 'EFT', 'Trauma'], 'Specializing in couples therapy with 15 years of experience helping partners build secure connections.', 15, 200),
  ('Michael Rodriguez', 'MA, LPC', ARRAY['Communication', 'Conflict Resolution'], 'Passionate about helping couples learn to communicate effectively and resolve conflicts constructively.', 8, 150),
  ('Dr. Emily Washington', 'PsyD', ARRAY['Attachment', 'Infidelity Recovery'], 'Expert in attachment theory and helping couples heal from betrayal and rebuild trust.', 12, 180)
ON CONFLICT DO NOTHING;

-- ============================================
-- CONFLICT RESOLUTION WORKBOOK
-- ============================================

CREATE TABLE IF NOT EXISTS workbook_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('dreams_within_conflict', 'perpetual_problems', 'solvable_problems', 'compromise', 'gridlock', 'repair')),
  title text NOT NULL,
  description text DEFAULT '',
  instructions text NOT NULL,
  prompts jsonb DEFAULT '[]'::jsonb,
  estimated_duration_minutes integer DEFAULT 20,
  difficulty text DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  requires_both_partners boolean DEFAULT true,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES workbook_exercises(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  partner_1_responses jsonb DEFAULT '{}'::jsonb,
  partner_2_responses jsonb DEFAULT '{}'::jsonb,
  shared_insights text DEFAULT '',
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workbook_exercises_category ON workbook_exercises(category, order_index);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_couple ON exercise_completions(couple_id, started_at DESC);

INSERT INTO workbook_exercises (category, title, description, instructions, prompts, estimated_duration_minutes, requires_both_partners) VALUES
  ('dreams_within_conflict', 'Dreams Within Conflict', 'Discover the hidden dreams behind your perpetual problems', 'Each partner answers the prompts separately, then share and discuss your deeper dreams and values.', '["What does this issue represent to you?", "What dreams or values are connected to your position?", "What would it mean to you if you had to give this up?", "How does this connect to your life story or family background?"]'::jsonb, 30, true),
  ('perpetual_problems', 'Identifying Perpetual Problems', 'Learn to distinguish perpetual problems from solvable ones', 'Review your recurring conflicts and identify which are perpetual (based on personality differences) vs solvable.', '["What issues keep coming up?", "Do these stem from personality differences or situational problems?", "Can you accept this as a perpetual problem to manage rather than solve?"]'::jsonb, 20, true),
  ('compromise', 'The Art of Compromise', 'Build a compromise on a solvable problem', 'Each partner lists their needs and flexible areas, then work together to find middle ground.', '["What do you absolutely need?", "Where can you be flexible?", "What would be a fair compromise for both of us?"]'::jsonb, 25, true),
  ('gridlock', 'Breaking Through Gridlock', 'Move from gridlock to dialogue on perpetual problems', 'Use the Gottman method to move from gridlock to productive dialogue about differences.', '["What is your dream within this conflict?", "Can you honor both dreams?", "What temporary compromise can you make?", "How can you support each other''s dreams?"]'::jsonb, 40, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- VOICE MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS voice_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  audio_url text NOT NULL,
  duration_seconds integer NOT NULL,
  transcription text DEFAULT '',
  transcription_confidence decimal DEFAULT 0,
  sender_zone_at_send text CHECK (sender_zone_at_send IN ('green', 'yellow', 'red')),
  tone_analysis jsonb DEFAULT '{}'::jsonb,
  is_listened boolean DEFAULT false,
  listened_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_messages_couple ON voice_messages(couple_id, created_at DESC);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE relationship_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workbook_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Relationship metrics
CREATE POLICY "Users can view metrics for their couple"
  ON relationship_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = relationship_metrics.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Therapist profiles (public read)
CREATE POLICY "Anyone can view active therapists"
  ON therapist_profiles FOR SELECT
  TO authenticated
  USING (is_accepting_clients = true);

-- Therapy sessions
CREATE POLICY "Users can view sessions for their couple"
  ON therapy_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = therapy_sessions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create sessions for their couple"
  ON therapy_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = therapy_sessions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Workbook exercises (public read)
CREATE POLICY "Anyone can view active exercises"
  ON workbook_exercises FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Exercise completions
CREATE POLICY "Users can view completions for their couple"
  ON exercise_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = exercise_completions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create completions for their couple"
  ON exercise_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = exercise_completions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update completions for their couple"
  ON exercise_completions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = exercise_completions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = exercise_completions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Voice messages
CREATE POLICY "Users can view voice messages for their couple"
  ON voice_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = voice_messages.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create voice messages for their couple"
  ON voice_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = voice_messages.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own voice messages or received ones"
  ON voice_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR receiver_id = auth.uid());
