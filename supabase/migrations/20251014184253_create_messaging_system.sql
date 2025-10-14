/*
  # Messaging System Schema

  ## Overview
  This migration creates tables for real-time messaging between clients and therapists,
  including conversations, messages, and read receipts.

  ## New Tables
  
  ### `conversations`
  - `id` (uuid, primary key) - Unique identifier
  - `client_id` (uuid) - References profiles.id (client)
  - `therapist_id` (uuid) - References therapist_profiles.id
  - `last_message_at` (timestamptz) - Timestamp of last message
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `messages`
  - `id` (uuid, primary key) - Unique identifier
  - `conversation_id` (uuid) - References conversations.id
  - `sender_id` (uuid) - References profiles.id
  - `content` (text) - Message content
  - `message_type` (text) - text, image, file, system
  - `attachment_url` (text) - URL to attachment if any
  - `is_edited` (boolean) - Whether message was edited
  - `edited_at` (timestamptz) - Edit timestamp
  - `created_at` (timestamptz) - Creation timestamp

  ### `message_reads`
  - `id` (uuid, primary key) - Unique identifier
  - `message_id` (uuid) - References messages.id
  - `user_id` (uuid) - References profiles.id
  - `read_at` (timestamptz) - When message was read
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access conversations they're part of
  - Users can only send messages in their conversations
  - Users can only mark their own messages as read

  ## Indexes
  - Index on conversations by client_id and therapist_id
  - Index on messages by conversation_id and created_at
  - Index on message_reads by message_id and user_id
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, therapist_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_url text DEFAULT '',
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create message_reads table
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_therapist ON conversations(therapist_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view own conversations as client"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Users can view own conversations as therapist"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = therapist_id);

CREATE POLICY "Clients can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own conversations as client"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own conversations as therapist"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations as client"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their conversations as therapist"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.therapist_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.id = messages.conversation_id
        AND (conversations.client_id = auth.uid() OR conversations.therapist_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Message reads policies
CREATE POLICY "Users can view message reads in their conversations as client"
  ON message_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reads.message_id
      AND c.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can view message reads in their conversations as therapist"
  ON message_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reads.message_id
      AND c.therapist_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reads.message_id
      AND (c.client_id = auth.uid() OR c.therapist_id = auth.uid())
    )
  );

-- Function to update last_message_at on conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation timestamp when new message is sent
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Trigger to update conversations updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();