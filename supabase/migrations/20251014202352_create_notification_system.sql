/*
  # Notification System

  ## Overview
  Creates a comprehensive notification system for:
  - Crisis alerts
  - Ritual reminders  
  - Partner messages
  - Appreciation notifications
  - Safety check alerts
  - Intervention notifications

  ## New Tables

  ### `notifications`
  - Stores all user notifications
  - Tracks delivery and read status
  - Links to related entities
  
  ### `notification_preferences`
  - User preferences for notification types
  - Delivery methods (email, push, in-app)
  - Quiet hours

  ## Security
  - Users can only see their own notifications
  - Users can only update their own preferences
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('crisis_alert', 'ritual_reminder', 'partner_message', 'appreciation', 'safety_check', 'intervention', 'partner_zone_change', 'conflict_alert', 'streak_milestone')),
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url text DEFAULT '',
  related_entity_type text CHECK (related_entity_type IN ('crisis_intervention', 'ritual', 'message', 'appreciation_deposit', 'safety_check', 'conflict')),
  related_entity_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  crisis_alerts_enabled boolean DEFAULT true,
  ritual_reminders_enabled boolean DEFAULT true,
  partner_messages_enabled boolean DEFAULT true,
  appreciation_enabled boolean DEFAULT true,
  safety_checks_enabled boolean DEFAULT true,
  interventions_enabled boolean DEFAULT true,
  partner_zone_changes_enabled boolean DEFAULT true,
  conflict_alerts_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  quiet_hours_start time DEFAULT '22:00',
  quiet_hours_end time DEFAULT '07:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Notification preferences policies
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text DEFAULT 'normal',
  p_action_url text DEFAULT '',
  p_related_entity_type text DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
  v_prefs record;
  v_should_send boolean := true;
BEGIN
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;

  IF v_prefs IS NULL THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id);
    v_should_send := true;
  ELSE
    v_should_send := CASE p_type
      WHEN 'crisis_alert' THEN v_prefs.crisis_alerts_enabled
      WHEN 'ritual_reminder' THEN v_prefs.ritual_reminders_enabled
      WHEN 'partner_message' THEN v_prefs.partner_messages_enabled
      WHEN 'appreciation' THEN v_prefs.appreciation_enabled
      WHEN 'safety_check' THEN v_prefs.safety_checks_enabled
      WHEN 'intervention' THEN v_prefs.interventions_enabled
      WHEN 'partner_zone_change' THEN v_prefs.partner_zone_changes_enabled
      WHEN 'conflict_alert' THEN v_prefs.conflict_alerts_enabled
      ELSE true
    END;
  END IF;

  IF v_should_send THEN
    INSERT INTO notifications (
      user_id, type, title, message, priority, action_url,
      related_entity_type, related_entity_id
    )
    VALUES (
      p_user_id, p_type, p_title, p_message, p_priority, p_action_url,
      p_related_entity_type, p_related_entity_id
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND is_read = false;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send notification on new crisis intervention
CREATE OR REPLACE FUNCTION notify_on_crisis_intervention()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_1_id uuid;
  v_partner_2_id uuid;
BEGIN
  SELECT partner_1_id, partner_2_id
  INTO v_partner_1_id, v_partner_2_id
  FROM couples
  WHERE id = NEW.couple_id;

  PERFORM create_notification(
    v_partner_1_id,
    'intervention',
    NEW.title,
    NEW.message,
    NEW.severity,
    '/crisis',
    'crisis_intervention',
    NEW.id
  );

  IF v_partner_2_id IS NOT NULL THEN
    PERFORM create_notification(
      v_partner_2_id,
      'intervention',
      NEW.title,
      NEW.message,
      NEW.severity,
      '/crisis',
      'crisis_intervention',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_crisis_intervention ON crisis_interventions;
CREATE TRIGGER trigger_notify_crisis_intervention
  AFTER INSERT ON crisis_interventions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_crisis_intervention();

-- Trigger to send notification on new message
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_id uuid;
  v_sender_name text;
BEGIN
  SELECT CASE 
    WHEN NEW.sender_id = (SELECT partner_1_id FROM couples WHERE id = NEW.couple_id) 
    THEN (SELECT partner_2_id FROM couples WHERE id = NEW.couple_id)
    ELSE (SELECT partner_1_id FROM couples WHERE id = NEW.couple_id)
  END INTO v_receiver_id;

  SELECT full_name INTO v_sender_name
  FROM user_profiles
  WHERE id = NEW.sender_id;

  IF v_receiver_id IS NOT NULL THEN
    PERFORM create_notification(
      v_receiver_id,
      'partner_message',
      'New message from ' || COALESCE(v_sender_name, 'your partner'),
      LEFT(NEW.content, 100),
      'normal',
      '/messages',
      'message',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON couple_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON couple_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();

-- Trigger to send notification on appreciation
CREATE OR REPLACE FUNCTION notify_on_appreciation()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name text;
BEGIN
  SELECT full_name INTO v_sender_name
  FROM user_profiles
  WHERE id = NEW.sender_id;

  PERFORM create_notification(
    NEW.receiver_id,
    'appreciation',
    COALESCE(v_sender_name, 'Your partner') || ' sent you appreciation',
    NEW.content,
    'normal',
    '/rituals',
    'appreciation_deposit',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_appreciation ON appreciation_deposits;
CREATE TRIGGER trigger_notify_appreciation
  AFTER INSERT ON appreciation_deposits
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_appreciation();
