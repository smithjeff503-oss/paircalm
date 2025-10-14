/*
  # Payment, Community, and Achievement System

  ## Overview
  Final systems for production-readiness:
  1. Subscription and payment system
  2. Community features and success stories  
  3. Achievement and milestone tracking

  ## New Tables

  ### `subscriptions`
  - User subscription tiers
  - Payment tracking
  - Feature access control

  ### `community_posts`
  - Anonymous community support
  - Success stories
  - Moderated discussions

  ### `achievements`
  - Milestones and badges
  - Streak records
  - Progress celebrations

  ## Security
  - RLS on all tables
  - Community posts can be anonymous
  - Achievements visible to couple only
*/

-- ============================================
-- SUBSCRIPTION & PAYMENT SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  price_monthly_usd integer NOT NULL,
  price_yearly_usd integer NOT NULL,
  features jsonb DEFAULT '{}'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES subscription_tiers(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT now() + interval '1 month',
  cancel_at_period_end boolean DEFAULT false,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_usd integer NOT NULL,
  status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  payment_method text DEFAULT 'card',
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO subscription_tiers (name, display_name, price_monthly_usd, price_yearly_usd, features, limits, sort_order) VALUES
  ('free', 'Free', 0, 0, '{"check_ins": true, "conflicts": true, "basic_insights": true}'::jsonb, '{"messages_per_month": 50, "ai_sessions_per_month": 3}'::jsonb, 0),
  ('premium', 'Premium', 1499, 14999, '{"unlimited_messages": true, "ai_coach": true, "workbook": true, "voice_messages": true, "advanced_insights": true}'::jsonb, '{}'::jsonb, 1),
  ('couples_plus', 'Couples+', 2499, 24999, '{"unlimited_everything": true, "priority_support": true, "therapist_matching": true, "custom_rituals": true}'::jsonb, '{}'::jsonb, 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMUNITY & SUCCESS STORIES
-- ============================================

CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  post_type text NOT NULL CHECK (post_type IN ('success_story', 'support_request', 'advice', 'question', 'celebration')),
  title text NOT NULL,
  content text NOT NULL,
  is_anonymous boolean DEFAULT true,
  anonymous_name text DEFAULT 'Anonymous',
  tags text[] DEFAULT ARRAY[]::text[],
  is_moderated boolean DEFAULT false,
  moderated_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_anonymous boolean DEFAULT true,
  anonymous_name text DEFAULT 'Anonymous',
  like_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT one_like_target CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL)),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);

-- ============================================
-- ACHIEVEMENTS & MILESTONES
-- ============================================

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text DEFAULT '',
  category text NOT NULL CHECK (category IN ('streak', 'ritual', 'communication', 'growth', 'crisis_recovery', 'milestone')),
  requirement_type text NOT NULL CHECK (requirement_type IN ('count', 'streak', 'percentage', 'boolean')),
  requirement_value integer NOT NULL,
  badge_color text DEFAULT '#3b82f6',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  couple_id uuid REFERENCES couples(id) ON DELETE SET NULL,
  unlocked_at timestamptz DEFAULT now(),
  progress_value integer DEFAULT 0,
  is_shared_with_partner boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS relationship_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  milestone_type text NOT NULL CHECK (milestone_type IN ('first_checkin', 'first_ritual', 'week_streak', 'month_active', 'year_anniversary', 'conflict_resolved', 'crisis_overcome', '100_appreciations', 'therapy_session_complete')),
  title text NOT NULL,
  description text DEFAULT '',
  achieved_at timestamptz DEFAULT now(),
  celebrated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

INSERT INTO achievement_definitions (achievement_key, name, description, category, requirement_type, requirement_value, badge_color, sort_order) VALUES
  ('first_checkin', 'First Steps', 'Completed your first check-in', 'milestone', 'boolean', 1, '#10b981', 0),
  ('week_streak', '7 Day Streak', 'Checked in for 7 days straight', 'streak', 'streak', 7, '#f59e0b', 1),
  ('month_streak', '30 Day Warrior', 'Maintained a 30-day check-in streak', 'streak', 'streak', 30, '#8b5cf6', 2),
  ('first_ritual', 'Ritual Beginner', 'Completed your first daily ritual', 'ritual', 'boolean', 1, '#06b6d4', 3),
  ('100_rituals', 'Ritual Master', 'Completed 100 rituals', 'ritual', 'count', 100, '#a855f7', 4),
  ('crisis_survivor', 'Crisis Overcome', 'Successfully navigated through a crisis period', 'crisis_recovery', 'boolean', 1, '#ef4444', 5),
  ('green_zone_champion', 'Regulation Expert', 'Spent 80% of time in green zone for a month', 'growth', 'percentage', 80, '#22c55e', 6),
  ('appreciation_giver', 'Gratitude Champion', 'Sent 50 appreciations to your partner', 'communication', 'count', 50, '#ec4899', 7)
ON CONFLICT DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts(post_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_relationship_milestones_couple ON relationship_milestones(couple_id, achieved_at DESC);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_milestones ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Subscription tiers (public read)
CREATE POLICY "Anyone can view active subscription tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Payment transactions
CREATE POLICY "Users can view own transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Community posts (public read)
CREATE POLICY "Anyone can view published community posts"
  ON community_posts FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Users can create community posts"
  ON community_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() OR author_id IS NULL);

-- Community comments (public read)
CREATE POLICY "Anyone can view comments"
  ON community_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON community_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() OR author_id IS NULL);

-- Community likes
CREATE POLICY "Users can manage own likes"
  ON community_likes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Achievement definitions (public read)
CREATE POLICY "Anyone can view active achievements"
  ON achievement_definitions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User achievements
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Relationship milestones
CREATE POLICY "Users can view milestones for their couple"
  ON relationship_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = relationship_milestones.couple_id
      AND (couples.partner_1_id = auth.uid() OR couples.partner_2_id = auth.uid())
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION check_subscription_access(
  p_user_id uuid,
  p_feature text
)
RETURNS boolean AS $$
DECLARE
  v_has_access boolean := false;
  v_tier_features jsonb;
BEGIN
  SELECT t.features INTO v_tier_features
  FROM subscriptions s
  JOIN subscription_tiers t ON s.tier_id = t.id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.current_period_end > now()
  LIMIT 1;

  IF v_tier_features IS NOT NULL THEN
    v_has_access := COALESCE((v_tier_features->p_feature)::boolean, false);
  END IF;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id uuid,
  p_achievement_key text,
  p_couple_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_achievement_id uuid;
  v_exists boolean;
BEGIN
  SELECT id INTO v_achievement_id
  FROM achievement_definitions
  WHERE achievement_key = p_achievement_key
    AND is_active = true;

  IF v_achievement_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = v_achievement_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    INSERT INTO user_achievements (user_id, achievement_id, couple_id)
    VALUES (p_user_id, v_achievement_id, p_couple_id);

    PERFORM create_notification(
      p_user_id,
      'streak_milestone',
      'Achievement Unlocked!',
      'You earned a new achievement',
      'normal',
      '/profile',
      NULL,
      NULL
    );

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
