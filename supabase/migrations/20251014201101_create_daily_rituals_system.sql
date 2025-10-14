/*
  # Daily Relationship Rituals System

  ## Overview
  This migration creates a system for daily and weekly relationship rituals
  that help couples build connection during calm moments and prevent conflicts
  through consistent positive interactions.

  ## New Tables

  ### `rituals`
  - `id` (uuid, primary key) - Unique identifier
  - `type` (text) - morning_checkin, gratitude_exchange, appreciation, connection_bid, weekly_meeting, kiss_reminder, evening_wind down
  - `title` (text) - Ritual title
  - `description` (text) - What this ritual does
  - `prompt` (text) - The prompt/question to answer
  - `frequency` (text) - daily, weekly, custom
  - `recommended_time` (text) - Best time to do this
  - `duration_minutes` (integer) - How long it takes
  - `category` (text) - connection, appreciation, reflection, planning
  - `is_active` (boolean) - Available for use
  - `created_at` (timestamptz) - Creation timestamp

  ### `ritual_completions`
  - `id` (uuid, primary key) - Unique identifier
  - `ritual_id` (uuid) - References rituals.id
  - `couple_id` (uuid) - References couples.id
  - `user_id` (uuid) - References user_profiles.id
  - `response` (text) - User's response/completion
  - `mood` (text) - happy, grateful, calm, energized, reflective
  - `shared_with_partner` (boolean) - If partner can see
  - `partner_response` (text) - Partner's reaction/response
  - `completed_at` (timestamptz) - When completed
  - `created_at` (timestamptz) - Creation timestamp

  ### `connection_bids`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `sender_id` (uuid) - References user_profiles.id (who made the bid)
  - `receiver_id` (uuid) - References user_profiles.id (who received it)
  - `bid_type` (text) - conversation, affection, humor, support, activity
  - `content` (text) - What was the bid
  - `response` (text) - turn_toward, turn_away, turn_against
  - `response_details` (text) - How they responded
  - `responded_at` (timestamptz) - When they responded
  - `created_at` (timestamptz) - When bid was made

  ### `weekly_meetings`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `scheduled_for` (timestamptz) - When meeting is scheduled
  - `status` (text) - scheduled, completed, skipped
  - `appreciations` (jsonb) - What each partner appreciated this week
  - `conflicts_reviewed` (jsonb) - Conflicts discussed
  - `goals_set` (jsonb) - Goals for next week
  - `connection_score` (integer) - How connected they felt (1-10)
  - `notes` (text) - Additional notes
  - `completed_at` (timestamptz) - When meeting finished
  - `duration_minutes` (integer) - How long it took
  - `created_at` (timestamptz) - Creation timestamp

  ### `ritual_streaks`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `ritual_id` (uuid) - References rituals.id
  - `current_streak` (integer) - Current streak count
  - `longest_streak` (integer) - Best streak ever
  - `last_completed_at` (timestamptz) - Last completion
  - `total_completions` (integer) - Total times completed
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update

  ### `appreciation_deposits`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `sender_id` (uuid) - References user_profiles.id
  - `receiver_id` (uuid) - References user_profiles.id
  - `deposit_type` (text) - specific_appreciation, quality_time, act_of_service, physical_affection, gift
  - `content` (text) - What was appreciated/done
  - `emotional_bank_value` (integer) - How much this deposits (1-10)
  - `acknowledged` (boolean) - Partner saw it
  - `acknowledged_at` (timestamptz) - When acknowledged
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access data for their couple
  - Rituals are publicly readable
  - Both partners can complete rituals
  - Connection bids visible to both partners

  ## Indexes
  - Index on ritual_completions by couple_id and completed_at
  - Index on connection_bids by couple_id and created_at
  - Index on weekly_meetings by couple_id and scheduled_for
  - Index on ritual_streaks by couple_id and ritual_id
  - Index on appreciation_deposits by couple_id and created_at

  ## Functions
  - Function to update streak when ritual is completed
  - Function to calculate emotional bank account balance
*/

-- Create rituals table
CREATE TABLE IF NOT EXISTS rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('morning_checkin', 'gratitude_exchange', 'appreciation', 'connection_bid', 'weekly_meeting', 'kiss_reminder', 'evening_winddown')),
  title text NOT NULL,
  description text DEFAULT '',
  prompt text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'custom')),
  recommended_time text DEFAULT '',
  duration_minutes integer DEFAULT 5,
  category text NOT NULL CHECK (category IN ('connection', 'appreciation', 'reflection', 'planning')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create ritual_completions table
CREATE TABLE IF NOT EXISTS ritual_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id uuid NOT NULL REFERENCES rituals(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  response text DEFAULT '',
  mood text CHECK (mood IN ('happy', 'grateful', 'calm', 'energized', 'reflective')),
  shared_with_partner boolean DEFAULT true,
  partner_response text DEFAULT '',
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create connection_bids table
CREATE TABLE IF NOT EXISTS connection_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  bid_type text NOT NULL CHECK (bid_type IN ('conversation', 'affection', 'humor', 'support', 'activity')),
  content text NOT NULL,
  response text CHECK (response IN ('turn_toward', 'turn_away', 'turn_against')),
  response_details text DEFAULT '',
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create weekly_meetings table
CREATE TABLE IF NOT EXISTS weekly_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped')),
  appreciations jsonb DEFAULT '{}'::jsonb,
  conflicts_reviewed jsonb DEFAULT '[]'::jsonb,
  goals_set jsonb DEFAULT '[]'::jsonb,
  connection_score integer CHECK (connection_score >= 1 AND connection_score <= 10),
  notes text DEFAULT '',
  completed_at timestamptz,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

-- Create ritual_streaks table
CREATE TABLE IF NOT EXISTS ritual_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  ritual_id uuid NOT NULL REFERENCES rituals(id) ON DELETE CASCADE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_completed_at timestamptz,
  total_completions integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(couple_id, ritual_id)
);

-- Create appreciation_deposits table
CREATE TABLE IF NOT EXISTS appreciation_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  deposit_type text NOT NULL CHECK (deposit_type IN ('specific_appreciation', 'quality_time', 'act_of_service', 'physical_affection', 'gift')),
  content text NOT NULL,
  emotional_bank_value integer DEFAULT 5 CHECK (emotional_bank_value >= 1 AND emotional_bank_value <= 10),
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ritual_completions_couple ON ritual_completions(couple_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ritual_completions_user ON ritual_completions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_bids_couple ON connection_bids(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_meetings_couple ON weekly_meetings(couple_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_ritual_streaks_couple ON ritual_streaks(couple_id, ritual_id);
CREATE INDEX IF NOT EXISTS idx_appreciation_deposits_couple ON appreciation_deposits(couple_id, created_at DESC);

-- Insert default rituals
INSERT INTO rituals (type, title, description, prompt, frequency, recommended_time, duration_minutes, category) VALUES
  ('morning_checkin', 'Morning Check-In', 'Start your day connected', 'What''s one thing you''re looking forward to today?', 'daily', '7:00 AM', 2, 'connection'),
  ('gratitude_exchange', 'Daily Gratitude', 'Share what you appreciate', 'What''s one thing you appreciate about your partner today?', 'daily', 'Anytime', 3, 'appreciation'),
  ('appreciation', 'Specific Appreciation', 'Express detailed gratitude', 'Share something specific your partner did that made you feel loved', 'daily', 'Evening', 5, 'appreciation'),
  ('kiss_reminder', '6-Second Kiss', 'Gottman''s research-backed ritual', 'Take 6 seconds for a meaningful kiss with your partner', 'daily', 'Morning & Evening', 1, 'connection'),
  ('evening_winddown', 'Evening Wind-Down', 'End your day together', 'What was a high and a low from your day?', 'daily', '9:00 PM', 10, 'reflection'),
  ('weekly_meeting', 'Weekly Relationship Meeting', 'Review the week and plan ahead', 'Discuss appreciations, conflicts, and goals for the week', 'weekly', 'Sunday 6:00 PM', 30, 'planning'),
  ('connection_bid', 'Turn Towards Moments', 'Track your bids for connection', 'What bid for connection did you make or receive today?', 'daily', 'Evening', 3, 'connection')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ritual_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ritual_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appreciation_deposits ENABLE ROW LEVEL SECURITY;

-- Rituals policies (public read)
CREATE POLICY "Anyone can view active rituals"
  ON rituals FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Ritual completions policies
CREATE POLICY "Users can view ritual completions for their couple"
  ON ritual_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = ritual_completions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create ritual completions for their couple"
  ON ritual_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = ritual_completions.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own ritual completions"
  ON ritual_completions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Connection bids policies
CREATE POLICY "Users can view connection bids for their couple"
  ON connection_bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = connection_bids.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create connection bids for their couple"
  ON connection_bids FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = connection_bids.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update connection bids they received"
  ON connection_bids FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Weekly meetings policies
CREATE POLICY "Users can view weekly meetings for their couple"
  ON weekly_meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = weekly_meetings.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create weekly meetings for their couple"
  ON weekly_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = weekly_meetings.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update weekly meetings for their couple"
  ON weekly_meetings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = weekly_meetings.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = weekly_meetings.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Ritual streaks policies
CREATE POLICY "Users can view ritual streaks for their couple"
  ON ritual_streaks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = ritual_streaks.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Appreciation deposits policies
CREATE POLICY "Users can view appreciation deposits for their couple"
  ON appreciation_deposits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = appreciation_deposits.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create appreciation deposits for their couple"
  ON appreciation_deposits FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = appreciation_deposits.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can acknowledge appreciation deposits for themselves"
  ON appreciation_deposits FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Function to update streak when ritual completed
CREATE OR REPLACE FUNCTION update_ritual_streak(p_couple_id uuid, p_ritual_id uuid)
RETURNS void AS $$
DECLARE
  v_last_completed timestamptz;
  v_current_streak integer;
  v_longest_streak integer;
  v_total_completions integer;
  v_days_since_last integer;
BEGIN
  -- Get or create streak record
  INSERT INTO ritual_streaks (couple_id, ritual_id, current_streak, longest_streak, total_completions)
  VALUES (p_couple_id, p_ritual_id, 0, 0, 0)
  ON CONFLICT (couple_id, ritual_id) DO NOTHING;
  
  -- Get current streak data
  SELECT last_completed_at, current_streak, longest_streak, total_completions
  INTO v_last_completed, v_current_streak, v_longest_streak, v_total_completions
  FROM ritual_streaks
  WHERE couple_id = p_couple_id AND ritual_id = p_ritual_id;
  
  -- Calculate days since last completion
  IF v_last_completed IS NULL THEN
    v_days_since_last := 999;
  ELSE
    v_days_since_last := EXTRACT(DAY FROM (now() - v_last_completed));
  END IF;
  
  -- Update streak
  IF v_days_since_last <= 1 THEN
    -- Continue streak
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Streak broken, restart
    v_current_streak := 1;
  END IF;
  
  -- Update longest streak if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Increment total completions
  v_total_completions := v_total_completions + 1;
  
  -- Update the record
  UPDATE ritual_streaks
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    total_completions = v_total_completions,
    last_completed_at = now(),
    updated_at = now()
  WHERE couple_id = p_couple_id AND ritual_id = p_ritual_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate emotional bank account balance
CREATE OR REPLACE FUNCTION get_emotional_bank_balance(p_couple_id uuid, p_days integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
  v_balance integer := 0;
BEGIN
  -- Sum appreciation deposits
  SELECT COALESCE(SUM(emotional_bank_value), 0)
  INTO v_balance
  FROM appreciation_deposits
  WHERE couple_id = p_couple_id
    AND created_at >= now() - (p_days || ' days')::interval;
  
  -- Subtract conflicts (each conflict -5 points)
  v_balance := v_balance - (
    SELECT COUNT(*) * 5
    FROM conflicts
    WHERE couple_id = p_couple_id
      AND created_at >= now() - (p_days || ' days')::interval
  );
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
