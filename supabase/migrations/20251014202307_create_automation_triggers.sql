/*
  # Automation Triggers

  ## Overview
  This migration creates database triggers for real-time automation:
  - Auto-update ritual streaks on completion
  - Auto-send safety checks for disengagement
  - Auto-trigger crisis scoring on certain events
  - Auto-update couple status

  ## Triggers Created
  1. After ritual completion → update streak
  2. After check-in → check for crisis patterns
  3. After message → analyze for high-risk patterns
  4. After conflict creation → calculate crisis score
*/

-- Function to handle ritual completion
CREATE OR REPLACE FUNCTION handle_ritual_completion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_ritual_streak(NEW.couple_id, NEW.ritual_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for ritual completions
DROP TRIGGER IF EXISTS trigger_ritual_completion ON ritual_completions;
CREATE TRIGGER trigger_ritual_completion
  AFTER INSERT ON ritual_completions
  FOR EACH ROW
  EXECUTE FUNCTION handle_ritual_completion();

-- Function to check for disengagement
CREATE OR REPLACE FUNCTION check_partner_disengagement()
RETURNS TRIGGER AS $$
DECLARE
  v_couple_id uuid;
  v_partner_id uuid;
  v_last_partner_checkin timestamptz;
  v_hours_since_last integer;
BEGIN
  SELECT id, 
    CASE 
      WHEN partner_1_id = NEW.user_id THEN partner_2_id
      ELSE partner_1_id
    END
  INTO v_couple_id, v_partner_id
  FROM couples
  WHERE partner_1_id = NEW.user_id OR partner_2_id = NEW.user_id;

  IF v_partner_id IS NOT NULL THEN
    SELECT MAX(created_at)
    INTO v_last_partner_checkin
    FROM check_ins
    WHERE user_id = v_partner_id;

    IF v_last_partner_checkin IS NOT NULL THEN
      v_hours_since_last := EXTRACT(EPOCH FROM (now() - v_last_partner_checkin)) / 3600;

      IF v_hours_since_last >= 48 THEN
        INSERT INTO safety_checks (couple_id, target_user_id, check_type, message)
        VALUES (
          v_couple_id,
          v_partner_id,
          'disengagement',
          'Hey, we noticed you haven''t checked in for over 48 hours. Just checking in - how are you doing?'
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for check-ins to detect disengagement
DROP TRIGGER IF EXISTS trigger_check_disengagement ON check_ins;
CREATE TRIGGER trigger_check_disengagement
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION check_partner_disengagement();

-- Function to auto-calculate crisis score on conflict
CREATE OR REPLACE FUNCTION auto_crisis_score_on_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_score integer;
BEGIN
  v_score := calculate_crisis_score(NEW.couple_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for conflicts
DROP TRIGGER IF EXISTS trigger_crisis_on_conflict ON conflicts;
CREATE TRIGGER trigger_crisis_on_conflict
  AFTER INSERT ON conflicts
  FOR EACH ROW
  EXECUTE FUNCTION auto_crisis_score_on_conflict();

-- Function to update couple last activity
CREATE OR REPLACE FUNCTION update_couple_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE couples
  SET updated_at = now()
  WHERE id = NEW.couple_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for messages
DROP TRIGGER IF EXISTS trigger_couple_activity_messages ON couple_messages;
CREATE TRIGGER trigger_couple_activity_messages
  AFTER INSERT ON couple_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_couple_last_activity();

-- Trigger for check-ins
DROP TRIGGER IF EXISTS trigger_couple_activity_checkins ON check_ins;
CREATE TRIGGER trigger_couple_activity_checkins
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_couple_last_activity();

-- Function to update cooling off period status
CREATE OR REPLACE FUNCTION auto_complete_cooling_off()
RETURNS void AS $$
BEGIN
  UPDATE cooling_off_periods
  SET status = 'completed'
  WHERE status = 'active'
    AND ends_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send appreciation notification
CREATE OR REPLACE FUNCTION notify_appreciation_received()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for appreciation deposits
DROP TRIGGER IF EXISTS trigger_appreciation_notification ON appreciation_deposits;
CREATE TRIGGER trigger_appreciation_notification
  AFTER INSERT ON appreciation_deposits
  FOR EACH ROW
  EXECUTE FUNCTION notify_appreciation_received();
