/*
  # AI Coaching System Schema

  ## Overview
  This migration creates tables for AI-powered conflict coaching sessions,
  messages, and pattern tracking for personalized relationship guidance.

  ## New Tables

  ### `coaching_sessions`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - References user_profiles.id (who started the session)
  - `couple_id` (uuid) - References couples.id (optional, for relationship context)
  - `session_type` (text) - conflict, check_in, general, crisis
  - `topic` (text) - Main topic discussed
  - `status` (text) - active, completed, abandoned
  - `started_at` (timestamptz) - Session start time
  - `ended_at` (timestamptz) - Session end time
  - `user_heart_rate_start` (integer) - HR at session start
  - `user_readiness_score` (integer) - Readiness at session start
  - `nervous_system_zone` (text) - Zone at session start
  - `outcome` (text) - Session outcome notes
  - `effectiveness_rating` (integer) - User rating 1-5
  - `created_at` (timestamptz) - Creation timestamp

  ### `coaching_messages`
  - `id` (uuid, primary key) - Unique identifier
  - `session_id` (uuid) - References coaching_sessions.id
  - `role` (text) - user, assistant, system
  - `content` (text) - Message content
  - `context_data` (jsonb) - Additional context (biometrics, suggestions)
  - `created_at` (timestamptz) - Creation timestamp

  ### `coaching_techniques`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Technique name
  - `category` (text) - de_escalation, communication, repair, grounding
  - `description` (text) - Technique description
  - `instructions` (text) - Step-by-step instructions
  - `recommended_for_zones` (text[]) - Zones this works for
  - `is_active` (boolean) - Currently available
  - `created_at` (timestamptz) - Creation timestamp

  ### `technique_usage`
  - `id` (uuid, primary key) - Unique identifier
  - `session_id` (uuid) - References coaching_sessions.id
  - `technique_id` (uuid) - References coaching_techniques.id
  - `was_helpful` (boolean) - User feedback
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Creation timestamp

  ### `conflict_patterns`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `pattern_type` (text) - criticism, contempt, defensiveness, stonewalling, topic_recurring
  - `description` (text) - Pattern description
  - `frequency` (integer) - How often detected
  - `first_detected` (timestamptz) - First occurrence
  - `last_detected` (timestamptz) - Most recent occurrence
  - `severity` (text) - low, medium, high
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Users can view and manage their own coaching sessions
  - Couples can view patterns detected for their relationship
  - Techniques are read-only for all authenticated users

  ## Indexes
  - Index on coaching_sessions by user_id and status
  - Index on coaching_messages by session_id
  - Index on technique_usage for analytics
  - Index on conflict_patterns by couple_id
*/

-- Create coaching_sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  session_type text NOT NULL DEFAULT 'general' CHECK (session_type IN ('conflict', 'check_in', 'general', 'crisis')),
  topic text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  user_heart_rate_start integer,
  user_readiness_score integer,
  nervous_system_zone text CHECK (nervous_system_zone IN ('green', 'yellow', 'red')),
  outcome text DEFAULT '',
  effectiveness_rating integer CHECK (effectiveness_rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);

-- Create coaching_messages table
CREATE TABLE IF NOT EXISTS coaching_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  context_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create coaching_techniques table
CREATE TABLE IF NOT EXISTS coaching_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('de_escalation', 'communication', 'repair', 'grounding')),
  description text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  recommended_for_zones text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create technique_usage table
CREATE TABLE IF NOT EXISTS technique_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  technique_id uuid NOT NULL REFERENCES coaching_techniques(id) ON DELETE CASCADE,
  was_helpful boolean,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create conflict_patterns table
CREATE TABLE IF NOT EXISTS conflict_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  pattern_type text NOT NULL CHECK (pattern_type IN ('criticism', 'contempt', 'defensiveness', 'stonewalling', 'topic_recurring')),
  description text NOT NULL DEFAULT '',
  frequency integer DEFAULT 1,
  first_detected timestamptz DEFAULT now(),
  last_detected timestamptz DEFAULT now(),
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user ON coaching_sessions(user_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_couple ON coaching_sessions(couple_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_messages_session ON coaching_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_technique_usage_session ON technique_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_technique_usage_technique ON technique_usage(technique_id);
CREATE INDEX IF NOT EXISTS idx_conflict_patterns_couple ON conflict_patterns(couple_id, last_detected DESC);

-- Insert common coaching techniques
INSERT INTO coaching_techniques (name, category, description, instructions, recommended_for_zones) VALUES
  ('20-Minute Break', 'de_escalation', 'Take a structured break to allow nervous systems to regulate', 'Agree to pause for exactly 20 minutes. Go to separate spaces. Focus on calming activities (walk, breathe, listen to music). Return when the timer ends.', ARRAY['yellow', 'red']),
  ('Gentle Startup', 'communication', 'Start difficult conversations with softness instead of criticism', 'Begin with "I feel..." instead of "You always...". State your need clearly. Avoid blame. Use a calm tone.', ARRAY['green', 'yellow']),
  ('Taking Responsibility', 'repair', 'Acknowledge your part in the conflict', 'Say: "My part in this was..." or "I take responsibility for...". Avoid defending. Focus on your actions only.', ARRAY['green', 'yellow']),
  ('Box Breathing', 'grounding', '4-4-4-4 breathing technique to calm the nervous system', 'Breathe in for 4 seconds. Hold for 4 seconds. Breathe out for 4 seconds. Hold for 4 seconds. Repeat 5 times.', ARRAY['yellow', 'red']),
  ('I Feel Statements', 'communication', 'Express feelings without blame', 'Use the format: "I feel [emotion] when [situation] because [reason]. I need [request]." Avoid "you" statements.', ARRAY['green', 'yellow']),
  ('The Repair Checklist', 'repair', 'Structured Gottman repair attempt', 'Choose a phrase: "I feel scared", "Please say that again", "This is important to me", "I need to calm down", "Can we take a break?"', ARRAY['yellow', 'red']),
  ('Grounding 5-4-3-2-1', 'grounding', 'Sensory grounding exercise', 'Name 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, 1 thing you taste.', ARRAY['yellow', 'red']),
  ('Softened Startup', 'communication', 'Complain without blame', 'Start with appreciation: "I really appreciate when you...". State the problem: "I notice...". End with a need: "What I need is...".', ARRAY['green'])
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE technique_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_patterns ENABLE ROW LEVEL SECURITY;

-- Coaching sessions policies
CREATE POLICY "Users can view own coaching sessions"
  ON coaching_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own coaching sessions"
  ON coaching_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coaching sessions"
  ON coaching_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Coaching messages policies
CREATE POLICY "Users can view messages for their sessions"
  ON coaching_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = coaching_messages.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their sessions"
  ON coaching_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = coaching_messages.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

-- Coaching techniques policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view active techniques"
  ON coaching_techniques FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Technique usage policies
CREATE POLICY "Users can view technique usage for their sessions"
  ON technique_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = technique_usage.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create technique usage for their sessions"
  ON technique_usage FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = technique_usage.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update technique usage for their sessions"
  ON technique_usage FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = technique_usage.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = technique_usage.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

-- Conflict patterns policies
CREATE POLICY "Users can view patterns for their couple"
  ON conflict_patterns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = conflict_patterns.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conflict_patterns_updated_at ON conflict_patterns;
CREATE TRIGGER update_conflict_patterns_updated_at
  BEFORE UPDATE ON conflict_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
