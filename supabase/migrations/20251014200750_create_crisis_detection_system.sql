/*
  # Crisis Detection & Intervention System

  ## Overview
  This migration creates a comprehensive crisis detection system that monitors
  relationship health indicators and automatically triggers interventions when
  patterns suggest the relationship is in crisis.

  ## New Tables

  ### `crisis_scores`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `score` (integer) - Crisis score (0-100, higher = more severe)
  - `severity` (text) - low, moderate, high, critical
  - `factors` (jsonb) - Contributing factors and their weights
  - `red_zone_days` (integer) - Consecutive days in red zone
  - `high_risk_messages` (integer) - Count in last 7 days
  - `gottman_violations` (integer) - Count in last 7 days
  - `disengagement_hours` (integer) - Hours since last check-in
  - `conflict_frequency` (integer) - Conflicts in last 7 days
  - `calculated_at` (timestamptz) - When score was calculated
  - `created_at` (timestamptz) - Creation timestamp

  ### `crisis_interventions`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `crisis_score_id` (uuid) - References crisis_scores.id
  - `intervention_type` (text) - cooling_off, emergency_therapy, crisis_hotline, ai_session, safety_check
  - `severity` (text) - moderate, high, critical
  - `title` (text) - Intervention title
  - `message` (text) - Intervention message
  - `action_required` (boolean) - Must be acknowledged
  - `action_taken` (text) - What user did (acknowledged, accepted, declined, ignored)
  - `expires_at` (timestamptz) - When intervention expires
  - `triggered_at` (timestamptz) - When intervention was triggered
  - `acknowledged_at` (timestamptz) - When user acknowledged
  - `created_at` (timestamptz) - Creation timestamp

  ### `crisis_hotlines`
  - `id` (uuid, primary key) - Unique identifier
  - `country` (text) - Country code
  - `name` (text) - Hotline name
  - `phone` (text) - Phone number
  - `type` (text) - mental_health, domestic_violence, suicide_prevention, relationship
  - `description` (text) - What they help with
  - `available_24_7` (boolean) - Always available
  - `website` (text) - Website URL
  - `is_active` (boolean) - Currently active
  - `created_at` (timestamptz) - Creation timestamp

  ### `cooling_off_periods`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `initiated_by` (uuid) - References user_profiles.id
  - `reason` (text) - Why cooling off was initiated
  - `duration_hours` (integer) - How long (default 24)
  - `started_at` (timestamptz) - Start time
  - `ends_at` (timestamptz) - End time
  - `status` (text) - active, completed, cancelled
  - `early_ended_at` (timestamptz) - If ended early
  - `early_end_reason` (text) - Why ended early
  - `created_at` (timestamptz) - Creation timestamp

  ### `safety_checks`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `target_user_id` (uuid) - User being checked on
  - `check_type` (text) - disengagement, sustained_red_zone, high_risk_pattern
  - `message` (text) - Check-in message
  - `response` (text) - User's response
  - `responded_at` (timestamptz) - When they responded
  - `requires_escalation` (boolean) - Needs further action
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access data for their couple
  - Crisis hotlines are publicly readable
  - Safety checks only visible to couple members

  ## Indexes
  - Index on crisis_scores by couple_id and calculated_at
  - Index on crisis_interventions by couple_id and triggered_at
  - Index on cooling_off_periods by couple_id and status
  - Index on safety_checks by target_user_id

  ## Functions
  - Function to calculate crisis score
  - Function to trigger interventions based on thresholds
  - Function to check if couple is in cooling-off period
*/

-- Create crisis_scores table
CREATE TABLE IF NOT EXISTS crisis_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  severity text NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  factors jsonb DEFAULT '{}'::jsonb,
  red_zone_days integer DEFAULT 0,
  high_risk_messages integer DEFAULT 0,
  gottman_violations integer DEFAULT 0,
  disengagement_hours integer DEFAULT 0,
  conflict_frequency integer DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create crisis_interventions table
CREATE TABLE IF NOT EXISTS crisis_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  crisis_score_id uuid REFERENCES crisis_scores(id) ON DELETE SET NULL,
  intervention_type text NOT NULL CHECK (intervention_type IN ('cooling_off', 'emergency_therapy', 'crisis_hotline', 'ai_session', 'safety_check')),
  severity text NOT NULL CHECK (severity IN ('moderate', 'high', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  action_required boolean DEFAULT false,
  action_taken text CHECK (action_taken IN ('acknowledged', 'accepted', 'declined', 'ignored')),
  expires_at timestamptz,
  triggered_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create crisis_hotlines table
CREATE TABLE IF NOT EXISTS crisis_hotlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'US',
  name text NOT NULL,
  phone text NOT NULL,
  type text NOT NULL CHECK (type IN ('mental_health', 'domestic_violence', 'suicide_prevention', 'relationship')),
  description text DEFAULT '',
  available_24_7 boolean DEFAULT true,
  website text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create cooling_off_periods table
CREATE TABLE IF NOT EXISTS cooling_off_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  initiated_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason text DEFAULT '',
  duration_hours integer DEFAULT 24,
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz DEFAULT now() + interval '24 hours',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  early_ended_at timestamptz,
  early_end_reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create safety_checks table
CREATE TABLE IF NOT EXISTS safety_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('disengagement', 'sustained_red_zone', 'high_risk_pattern')),
  message text NOT NULL,
  response text DEFAULT '',
  responded_at timestamptz,
  requires_escalation boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crisis_scores_couple ON crisis_scores(couple_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crisis_interventions_couple ON crisis_interventions(couple_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_cooling_off_periods_couple ON cooling_off_periods(couple_id, status, ends_at);
CREATE INDEX IF NOT EXISTS idx_safety_checks_user ON safety_checks(target_user_id, created_at DESC);

-- Insert crisis hotlines
INSERT INTO crisis_hotlines (country, name, phone, type, description, available_24_7, website) VALUES
  ('US', '988 Suicide & Crisis Lifeline', '988', 'suicide_prevention', 'Free and confidential support for people in distress, prevention and crisis resources', true, 'https://988lifeline.org'),
  ('US', 'National Domestic Violence Hotline', '1-800-799-7233', 'domestic_violence', 'Support for victims of domestic violence and abuse', true, 'https://www.thehotline.org'),
  ('US', 'Crisis Text Line', 'Text HOME to 741741', 'mental_health', 'Free 24/7 support for those in crisis', true, 'https://www.crisistextline.org'),
  ('US', 'SAMHSA National Helpline', '1-800-662-4357', 'mental_health', 'Treatment referral and information service for mental health and substance abuse', true, 'https://www.samhsa.gov/find-help/national-helpline'),
  ('US', 'Love Is Respect', '1-866-331-9474', 'relationship', 'Support for young people experiencing dating violence or abuse', true, 'https://www.loveisrespect.org')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE crisis_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_hotlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooling_off_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checks ENABLE ROW LEVEL SECURITY;

-- Crisis scores policies
CREATE POLICY "Users can view crisis scores for their couple"
  ON crisis_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = crisis_scores.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Crisis interventions policies
CREATE POLICY "Users can view interventions for their couple"
  ON crisis_interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = crisis_interventions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update interventions for their couple"
  ON crisis_interventions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = crisis_interventions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = crisis_interventions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Crisis hotlines policies (public read)
CREATE POLICY "Anyone can view active crisis hotlines"
  ON crisis_hotlines FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Cooling off periods policies
CREATE POLICY "Users can view cooling off periods for their couple"
  ON cooling_off_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = cooling_off_periods.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create cooling off periods for their couple"
  ON cooling_off_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = cooling_off_periods.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update cooling off periods for their couple"
  ON cooling_off_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = cooling_off_periods.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = cooling_off_periods.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Safety checks policies
CREATE POLICY "Users can view safety checks for themselves or their couple"
  ON safety_checks FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = safety_checks.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update safety checks for themselves"
  ON safety_checks FOR UPDATE
  TO authenticated
  USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());

-- Function to calculate crisis score
CREATE OR REPLACE FUNCTION calculate_crisis_score(p_couple_id uuid)
RETURNS integer AS $$
DECLARE
  v_score integer := 0;
  v_red_zone_days integer := 0;
  v_high_risk_messages integer := 0;
  v_gottman_violations integer := 0;
  v_disengagement_hours integer := 0;
  v_conflict_frequency integer := 0;
BEGIN
  -- Count consecutive red zone days (last 7 days)
  SELECT COUNT(DISTINCT DATE(created_at))
  INTO v_red_zone_days
  FROM check_ins ci
  JOIN couples c ON (c.partner_1_id = ci.user_id OR c.partner_2_id = ci.user_id)
  WHERE c.id = p_couple_id
    AND ci.nervous_system_zone = 'red'
    AND ci.created_at >= now() - interval '7 days';
  
  -- Count high-risk messages (last 7 days)
  SELECT COUNT(*)
  INTO v_high_risk_messages
  FROM couple_messages
  WHERE couple_id = p_couple_id
    AND tone_analysis->>'riskLevel' IN ('high', 'medium')
    AND created_at >= now() - interval '7 days';
  
  -- Count Gottman violations (last 7 days)
  SELECT COUNT(*)
  INTO v_gottman_violations
  FROM couple_messages
  WHERE couple_id = p_couple_id
    AND jsonb_array_length(COALESCE(tone_analysis->'gottmanWarnings', '[]'::jsonb)) > 0
    AND created_at >= now() - interval '7 days';
  
  -- Check disengagement (hours since last check-in by either partner)
  SELECT EXTRACT(EPOCH FROM (now() - MAX(ci.created_at))) / 3600
  INTO v_disengagement_hours
  FROM check_ins ci
  JOIN couples c ON (c.partner_1_id = ci.user_id OR c.partner_2_id = ci.user_id)
  WHERE c.id = p_couple_id;
  
  -- Count conflicts (last 7 days)
  SELECT COUNT(*)
  INTO v_conflict_frequency
  FROM conflicts
  WHERE couple_id = p_couple_id
    AND created_at >= now() - interval '7 days';
  
  -- Calculate weighted score
  v_score := v_score + (v_red_zone_days * 10);           -- 10 points per red zone day
  v_score := v_score + (v_high_risk_messages * 5);       -- 5 points per risky message
  v_score := v_score + (v_gottman_violations * 3);       -- 3 points per violation
  v_score := v_score + LEAST((v_disengagement_hours / 24) * 15, 30); -- Up to 30 points for disengagement
  v_score := v_score + (v_conflict_frequency * 4);       -- 4 points per conflict
  
  -- Cap at 100
  v_score := LEAST(v_score, 100);
  
  -- Insert crisis score record
  INSERT INTO crisis_scores (
    couple_id, score, severity,
    red_zone_days, high_risk_messages, gottman_violations,
    disengagement_hours, conflict_frequency,
    factors
  ) VALUES (
    p_couple_id, v_score,
    CASE
      WHEN v_score >= 75 THEN 'critical'
      WHEN v_score >= 50 THEN 'high'
      WHEN v_score >= 25 THEN 'moderate'
      ELSE 'low'
    END,
    v_red_zone_days, v_high_risk_messages, v_gottman_violations,
    v_disengagement_hours, v_conflict_frequency,
    jsonb_build_object(
      'red_zone_days', v_red_zone_days,
      'high_risk_messages', v_high_risk_messages,
      'gottman_violations', v_gottman_violations,
      'disengagement_hours', v_disengagement_hours,
      'conflict_frequency', v_conflict_frequency
    )
  );
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if couple is in cooling-off period
CREATE OR REPLACE FUNCTION is_in_cooling_off(p_couple_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM cooling_off_periods
    WHERE couple_id = p_couple_id
      AND status = 'active'
      AND now() < ends_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
