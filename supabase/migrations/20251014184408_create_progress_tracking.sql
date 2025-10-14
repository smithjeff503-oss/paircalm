/*
  # Progress Tracking and Assessment Schema

  ## Overview
  This migration creates tables for tracking client progress, assessments,
  goals, and wellness metrics over time.

  ## New Tables
  
  ### `client_goals`
  - `id` (uuid, primary key) - Unique identifier
  - `client_id` (uuid) - References profiles.id
  - `therapist_id` (uuid) - References therapist_profiles.id
  - `title` (text) - Goal title
  - `description` (text) - Goal description
  - `target_date` (date) - Target completion date
  - `status` (text) - active, completed, cancelled
  - `completed_at` (timestamptz) - Completion timestamp
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `goal_progress`
  - `id` (uuid, primary key) - Unique identifier
  - `goal_id` (uuid) - References client_goals.id
  - `progress_percentage` (integer) - Progress 0-100
  - `notes` (text) - Progress notes
  - `recorded_by` (uuid) - References profiles.id (client or therapist)
  - `created_at` (timestamptz) - Creation timestamp

  ### `assessments`
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Assessment name (e.g., "PHQ-9", "GAD-7")
  - `description` (text) - Assessment description
  - `category` (text) - anxiety, depression, wellness, etc.
  - `is_active` (boolean) - Currently available
  - `created_at` (timestamptz) - Creation timestamp

  ### `assessment_questions`
  - `id` (uuid, primary key) - Unique identifier
  - `assessment_id` (uuid) - References assessments.id
  - `question_text` (text) - Question text
  - `question_order` (integer) - Display order
  - `response_type` (text) - scale, yes_no, text
  - `scale_min` (integer) - Minimum scale value
  - `scale_max` (integer) - Maximum scale value
  - `created_at` (timestamptz) - Creation timestamp

  ### `assessment_responses`
  - `id` (uuid, primary key) - Unique identifier
  - `client_id` (uuid) - References profiles.id
  - `assessment_id` (uuid) - References assessments.id
  - `total_score` (integer) - Total assessment score
  - `completed_at` (timestamptz) - Completion timestamp
  - `created_at` (timestamptz) - Creation timestamp

  ### `question_responses`
  - `id` (uuid, primary key) - Unique identifier
  - `assessment_response_id` (uuid) - References assessment_responses.id
  - `question_id` (uuid) - References assessment_questions.id
  - `response_value` (text) - User's response
  - `created_at` (timestamptz) - Creation timestamp

  ### `wellness_check_ins`
  - `id` (uuid, primary key) - Unique identifier
  - `client_id` (uuid) - References profiles.id
  - `mood_rating` (integer) - 1-10 mood scale
  - `anxiety_level` (integer) - 1-10 anxiety scale
  - `sleep_quality` (integer) - 1-10 sleep scale
  - `energy_level` (integer) - 1-10 energy scale
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Clients can view and manage their own goals and progress
  - Therapists can view and manage goals for their clients
  - Clients can complete assessments and view their results
  - Clients can track their own wellness check-ins

  ## Indexes
  - Index on client_goals by client_id and status
  - Index on assessment_responses by client_id
  - Index on wellness_check_ins by client_id and created_at
*/

-- Create client_goals table
CREATE TABLE IF NOT EXISTS client_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  target_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create goal_progress table
CREATE TABLE IF NOT EXISTS goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES client_goals(id) ON DELETE CASCADE,
  progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  notes text DEFAULT '',
  recorded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('anxiety', 'depression', 'wellness', 'stress', 'general')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create assessment_questions table
CREATE TABLE IF NOT EXISTS assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_order integer NOT NULL DEFAULT 0,
  response_type text NOT NULL DEFAULT 'scale' CHECK (response_type IN ('scale', 'yes_no', 'text')),
  scale_min integer DEFAULT 0,
  scale_max integer DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

-- Create assessment_responses table
CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  total_score integer DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create question_responses table
CREATE TABLE IF NOT EXISTS question_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_response_id uuid NOT NULL REFERENCES assessment_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  response_value text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create wellness_check_ins table
CREATE TABLE IF NOT EXISTS wellness_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood_rating integer NOT NULL CHECK (mood_rating BETWEEN 1 AND 10),
  anxiety_level integer NOT NULL CHECK (anxiety_level BETWEEN 1 AND 10),
  sleep_quality integer NOT NULL CHECK (sleep_quality BETWEEN 1 AND 10),
  energy_level integer NOT NULL CHECK (energy_level BETWEEN 1 AND 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_goals_client ON client_goals(client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_goals_therapist ON client_goals(therapist_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON goal_progress(goal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id, question_order);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_client ON assessment_responses(client_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_responses_assessment ON question_responses(assessment_response_id);
CREATE INDEX IF NOT EXISTS idx_wellness_check_ins_client ON wellness_check_ins(client_id, created_at DESC);

-- Insert common assessments
INSERT INTO assessments (name, description, category) VALUES
  ('PHQ-9', 'Patient Health Questionnaire for Depression', 'depression'),
  ('GAD-7', 'Generalized Anxiety Disorder Assessment', 'anxiety'),
  ('PSS', 'Perceived Stress Scale', 'stress'),
  ('WHO-5', 'World Health Organization Well-Being Index', 'wellness')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE client_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_check_ins ENABLE ROW LEVEL SECURITY;

-- Client goals policies
CREATE POLICY "Clients can view own goals"
  ON client_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Therapists can view client goals"
  ON client_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can create client goals"
  ON client_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Clients can update own goals"
  ON client_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Therapists can update client goals"
  ON client_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

-- Goal progress policies
CREATE POLICY "Users can view progress for their goals"
  ON goal_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_goals
      WHERE client_goals.id = goal_progress.goal_id
      AND (client_goals.client_id = auth.uid() OR client_goals.therapist_id = auth.uid())
    )
  );

CREATE POLICY "Users can create progress for their goals"
  ON goal_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = recorded_by
    AND EXISTS (
      SELECT 1 FROM client_goals
      WHERE client_goals.id = goal_progress.goal_id
      AND (client_goals.client_id = auth.uid() OR client_goals.therapist_id = auth.uid())
    )
  );

-- Assessments policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view active assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view assessment questions"
  ON assessment_questions FOR SELECT
  TO authenticated
  USING (true);

-- Assessment responses policies
CREATE POLICY "Clients can view own assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Therapists can view client assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.client_id = assessment_responses.client_id
      AND appointments.therapist_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create own assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

-- Question responses policies
CREATE POLICY "Users can view question responses for accessible assessments"
  ON question_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses
      WHERE assessment_responses.id = question_responses.assessment_response_id
      AND (
        assessment_responses.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM appointments
          WHERE appointments.client_id = assessment_responses.client_id
          AND appointments.therapist_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Clients can create question responses"
  ON question_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_responses
      WHERE assessment_responses.id = question_responses.assessment_response_id
      AND assessment_responses.client_id = auth.uid()
    )
  );

-- Wellness check-ins policies
CREATE POLICY "Clients can manage own wellness check-ins"
  ON wellness_check_ins FOR ALL
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Therapists can view client wellness check-ins"
  ON wellness_check_ins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.client_id = wellness_check_ins.client_id
      AND appointments.therapist_id = auth.uid()
    )
  );

-- Triggers
DROP TRIGGER IF EXISTS update_client_goals_updated_at ON client_goals;
CREATE TRIGGER update_client_goals_updated_at
  BEFORE UPDATE ON client_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();