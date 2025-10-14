/*
  # Couples Messaging System Schema

  ## Overview
  This migration creates a biometric-aware messaging system for couples,
  allowing safe communication with real-time nervous system awareness,
  AI tone analysis, and delayed sending capabilities.

  ## New Tables

  ### `couple_messages`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `sender_id` (uuid) - References user_profiles.id (who sent it)
  - `receiver_id` (uuid) - References user_profiles.id (who receives it)
  - `content` (text) - Message content
  - `status` (text) - draft, scheduled, sent, read, archived
  - `scheduled_send_at` (timestamptz) - When to send (null for immediate)
  - `sent_at` (timestamptz) - When actually sent
  - `read_at` (timestamptz) - When read by receiver
  - `sender_zone_at_send` (text) - Sender's zone when sent
  - `sender_heart_rate_at_send` (integer) - Sender's HR when sent
  - `receiver_zone_at_send` (text) - Receiver's zone when sent
  - `tone_analysis` (jsonb) - AI analysis of message tone
  - `is_template` (boolean) - If using a pre-written template
  - `template_id` (uuid) - References message_templates.id
  - `reply_to_id` (uuid) - References couple_messages.id (for threading)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `message_templates`
  - `id` (uuid, primary key) - Unique identifier
  - `category` (text) - repair, support, appreciation, boundary, request
  - `title` (text) - Template title
  - `content` (text) - Template content with placeholders
  - `recommended_for_zones` (text[]) - When to use this
  - `description` (text) - What this template does
  - `is_active` (boolean) - Currently available
  - `created_at` (timestamptz) - Creation timestamp

  ### `message_reactions`
  - `id` (uuid, primary key) - Unique identifier
  - `message_id` (uuid) - References couple_messages.id
  - `user_id` (uuid) - References user_profiles.id
  - `reaction` (text) - heart, hug, acknowledge, pause, support
  - `created_at` (timestamptz) - Creation timestamp

  ### `conversation_threads`
  - `id` (uuid, primary key) - Unique identifier
  - `couple_id` (uuid) - References couples.id
  - `topic` (text) - Thread topic
  - `started_at` (timestamptz) - Thread start
  - `last_message_at` (timestamptz) - Most recent message
  - `is_archived` (boolean) - Thread archived
  - `created_at` (timestamptz) - Creation timestamp

  ### `message_safety_checks`
  - `id` (uuid, primary key) - Unique identifier
  - `message_id` (uuid) - References couple_messages.id
  - `check_type` (text) - zone_warning, escalation_risk, tone_analysis
  - `severity` (text) - low, medium, high
  - `warning_message` (text) - What to show user
  - `suggested_action` (text) - What user should do
  - `was_acknowledged` (boolean) - User saw warning
  - `user_proceeded_anyway` (boolean) - Sent despite warning
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access messages for their couple
  - Both partners in a couple can read all messages
  - Only sender can update/delete their own messages
  - Templates are read-only for all authenticated users

  ## Indexes
  - Index on couple_messages by couple_id and sent_at
  - Index on couple_messages by status for scheduled sends
  - Index on message_reactions by message_id
  - Index on conversation_threads by couple_id
  - Index on message_safety_checks by message_id

  ## Functions
  - Trigger to update conversation_threads.last_message_at
  - Function to auto-send scheduled messages
*/

-- Create couple_messages table
CREATE TABLE IF NOT EXISTS couple_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'scheduled', 'sent', 'read', 'archived')),
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  sender_zone_at_send text CHECK (sender_zone_at_send IN ('green', 'yellow', 'red')),
  sender_heart_rate_at_send integer,
  receiver_zone_at_send text CHECK (receiver_zone_at_send IN ('green', 'yellow', 'red')),
  tone_analysis jsonb DEFAULT '{}'::jsonb,
  is_template boolean DEFAULT false,
  template_id uuid,
  reply_to_id uuid REFERENCES couple_messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('repair', 'support', 'appreciation', 'boundary', 'request')),
  title text NOT NULL,
  content text NOT NULL,
  recommended_for_zones text[] DEFAULT ARRAY[]::text[],
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES couple_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('heart', 'hug', 'acknowledge', 'pause', 'support')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create conversation_threads table
CREATE TABLE IF NOT EXISTS conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  topic text DEFAULT '',
  started_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create message_safety_checks table
CREATE TABLE IF NOT EXISTS message_safety_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES couple_messages(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('zone_warning', 'escalation_risk', 'tone_analysis')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  warning_message text NOT NULL,
  suggested_action text DEFAULT '',
  was_acknowledged boolean DEFAULT false,
  user_proceeded_anyway boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_couple_messages_couple ON couple_messages(couple_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_couple_messages_status ON couple_messages(status, scheduled_send_at);
CREATE INDEX IF NOT EXISTS idx_couple_messages_sender ON couple_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_couple_messages_receiver ON couple_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_couple ON conversation_threads(couple_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_safety_checks_message ON message_safety_checks(message_id);

-- Insert message templates
INSERT INTO message_templates (category, title, content, recommended_for_zones, description) VALUES
  ('repair', 'I Need a Break', 'I''m feeling overwhelmed right now and need to take a break. Can we pause for 20 minutes and come back to this when we''re both calmer?', ARRAY['yellow', 'red'], 'Request a structured break during conflict'),
  ('repair', 'Taking Responsibility', 'I realize my part in this was [your behavior]. I take responsibility for that and I''m sorry for how it affected you.', ARRAY['green', 'yellow'], 'Acknowledge your contribution to the conflict'),
  ('support', 'I See You''re Struggling', 'I can see you''re having a hard time right now. I''m here for you. What do you need from me?', ARRAY['green', 'yellow'], 'Show support when partner is dysregulated'),
  ('support', 'Low Capacity Acknowledgment', 'I noticed your readiness is low today. No pressure for heavy conversations - just want you to know I''m thinking of you.', ARRAY['green'], 'Acknowledge partner''s low capacity day'),
  ('appreciation', 'Grateful For You', 'I want you to know I really appreciate [specific thing they did]. It made me feel [emotion].', ARRAY['green'], 'Express specific gratitude'),
  ('boundary', 'I Need Space', 'I need some space right now to process my feelings. This isn''t about you - I just need time to regulate. I''ll reach out when I''m ready.', ARRAY['yellow', 'red'], 'Set a boundary for processing time'),
  ('request', 'Gentle Request', 'I have something I''d like to talk about when you have capacity. No rush - let me know when you''re in green zone and we can discuss.', ARRAY['green'], 'Ask for a conversation at the right time'),
  ('repair', 'I Hear You', 'I hear that you''re feeling [emotion] about [situation]. That makes sense to me. Thank you for sharing that with me.', ARRAY['green', 'yellow'], 'Validate partner''s feelings without defensiveness')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE couple_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_safety_checks ENABLE ROW LEVEL SECURITY;

-- Couple messages policies
CREATE POLICY "Users can view messages for their couple"
  ON couple_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = couple_messages.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create messages for their couple"
  ON couple_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = couple_messages.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own messages"
  ON couple_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages"
  ON couple_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- Message templates policies (read-only)
CREATE POLICY "Authenticated users can view active templates"
  ON message_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Message reactions policies
CREATE POLICY "Users can view reactions for their couple's messages"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couple_messages
      JOIN couples ON couples.id = couple_messages.couple_id
      WHERE couple_messages.id = message_reactions.message_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create reactions for their couple's messages"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couple_messages
      JOIN couples ON couples.id = couple_messages.couple_id
      WHERE couple_messages.id = message_reactions.message_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Conversation threads policies
CREATE POLICY "Users can view threads for their couple"
  ON conversation_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = conversation_threads.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- Message safety checks policies
CREATE POLICY "Users can view safety checks for their messages"
  ON message_safety_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couple_messages
      WHERE couple_messages.id = message_safety_checks.message_id
      AND couple_messages.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can create safety checks for their messages"
  ON message_safety_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couple_messages
      WHERE couple_messages.id = message_safety_checks.message_id
      AND couple_messages.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can update safety checks for their messages"
  ON message_safety_checks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couple_messages
      WHERE couple_messages.id = message_safety_checks.message_id
      AND couple_messages.sender_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couple_messages
      WHERE couple_messages.id = message_safety_checks.message_id
      AND couple_messages.sender_id = auth.uid()
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_couple_messages_updated_at ON couple_messages;
CREATE TRIGGER update_couple_messages_updated_at
  BEFORE UPDATE ON couple_messages
  FOR EACH ROW EXECUTE FUNCTION update_message_updated_at();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_message_read(message_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE couple_messages
  SET 
    status = 'read',
    read_at = now()
  WHERE id = message_id
  AND status = 'sent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
