/*
  # Partner Invitation System

  ## Overview
  Creates a complete partner invitation and connection system:
  - Unique invitation codes
  - Email invitations
  - Partner acceptance flow
  - Couple relationship management

  ## New Tables

  ### `partner_invitations`
  - Tracks invitation status
  - Unique invite codes
  - Expiration dates
  - Acceptance tracking

  ## Updates
  - Enhanced couples table functionality
  - Couple profile data

  ## Security
  - Users can only create invitations for themselves
  - Anyone can accept an invitation with valid code
  - Couples can only be viewed by partners
*/

-- Create partner_invitations table
CREATE TABLE IF NOT EXISTS partner_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  couple_id uuid REFERENCES couples(id) ON DELETE SET NULL,
  message text DEFAULT '',
  expires_at timestamptz DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Add additional fields to couples table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couples' AND column_name='relationship_start_date') THEN
    ALTER TABLE couples ADD COLUMN relationship_start_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couples' AND column_name='anniversary_date') THEN
    ALTER TABLE couples ADD COLUMN anniversary_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couples' AND column_name='couple_name') THEN
    ALTER TABLE couples ADD COLUMN couple_name text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couples' AND column_name='profile_visibility') THEN
    ALTER TABLE couples ADD COLUMN profile_visibility text DEFAULT 'both' CHECK (profile_visibility IN ('both', 'private', 'partner_only'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partner_invitations_code ON partner_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_inviter ON partner_invitations(inviter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_email ON partner_invitations(invitee_email);

-- Enable RLS
ALTER TABLE partner_invitations ENABLE ROW LEVEL SECURITY;

-- Partner invitations policies
CREATE POLICY "Users can view own invitations"
  ON partner_invitations FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid() OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create own invitations"
  ON partner_invitations FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Users can update invitations they received"
  ON partner_invitations FOR UPDATE
  TO authenticated
  USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Function to generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := substring(md5(random()::text || clock_timestamp()::text) from 1 for 8);
    v_code := upper(v_code);
    
    SELECT EXISTS(SELECT 1 FROM partner_invitations WHERE invitation_code = v_code)
    INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create partner invitation
CREATE OR REPLACE FUNCTION create_partner_invitation(
  p_inviter_id uuid,
  p_invitee_email text,
  p_message text DEFAULT ''
)
RETURNS jsonb AS $$
DECLARE
  v_code text;
  v_invitation_id uuid;
  v_couple_id uuid;
BEGIN
  SELECT id INTO v_couple_id
  FROM couples
  WHERE partner_1_id = p_inviter_id AND partner_2_id IS NULL;

  IF v_couple_id IS NULL THEN
    INSERT INTO couples (partner_1_id, status)
    VALUES (p_inviter_id, 'pending')
    RETURNING id INTO v_couple_id;
  END IF;

  v_code := generate_invitation_code();

  INSERT INTO partner_invitations (
    inviter_id,
    invitee_email,
    invitation_code,
    couple_id,
    message
  )
  VALUES (
    p_inviter_id,
    p_invitee_email,
    v_code,
    v_couple_id,
    p_message
  )
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object(
    'invitation_id', v_invitation_id,
    'couple_id', v_couple_id,
    'invitation_code', v_code,
    'invitee_email', p_invitee_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept partner invitation
CREATE OR REPLACE FUNCTION accept_partner_invitation(
  p_invitation_code text,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_invitation record;
  v_couple_id uuid;
BEGIN
  SELECT * INTO v_invitation
  FROM partner_invitations
  WHERE invitation_code = p_invitation_code
    AND status = 'pending'
    AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation code');
  END IF;

  IF v_invitation.inviter_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot accept your own invitation');
  END IF;

  UPDATE couples
  SET partner_2_id = p_user_id,
      status = 'active',
      updated_at = now()
  WHERE id = v_invitation.couple_id;

  UPDATE partner_invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by_user_id = p_user_id
  WHERE id = v_invitation.id;

  PERFORM create_notification(
    v_invitation.inviter_id,
    'partner_message',
    'Your partner accepted your invitation!',
    'You can now start using PairCalm together.',
    'high',
    '/dashboard',
    NULL,
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'couple_id', v_invitation.couple_id,
    'inviter_id', v_invitation.inviter_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invitation by code (public access for validation)
CREATE OR REPLACE FUNCTION get_invitation_by_code(p_code text)
RETURNS jsonb AS $$
DECLARE
  v_invitation record;
  v_inviter_name text;
BEGIN
  SELECT pi.*, up.full_name
  INTO v_invitation
  FROM partner_invitations pi
  JOIN user_profiles up ON pi.inviter_id = up.id
  WHERE pi.invitation_code = p_code
    AND pi.status = 'pending'
    AND pi.expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'inviter_name', v_invitation.full_name,
    'invitee_email', v_invitation.invitee_email,
    'message', v_invitation.message,
    'expires_at', v_invitation.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark expired invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE partner_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
