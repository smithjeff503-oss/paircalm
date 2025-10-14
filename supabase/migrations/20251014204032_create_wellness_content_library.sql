/*
  # Wellness Content Library System

  ## Overview
  Creates a comprehensive wellness content library with subscription gating:
  - Breathwork exercises
  - Guided meditations
  - Qigong classes
  - Binaural beats
  - ASMR recordings
  - Somatic exercises
  - Yoga nidra
  - Progressive muscle relaxation

  ## New Tables

  ### `wellness_content`
  - Core content metadata
  - Subscription tier requirements
  - Categories and tags
  - Duration, difficulty
  - Media URLs

  ### `wellness_categories`
  - Content organization
  - Category metadata

  ### `content_progress`
  - User completion tracking
  - Favorites and bookmarks
  - Listen/watch history

  ### `content_playlists`
  - Custom user playlists
  - Curated collections

  ## Security
  - Content visibility based on subscription tier
  - Users can only access content for their tier
  - Free tier gets limited preview content
  - Premium tiers unlock full libraries
*/

-- Create wellness categories table
CREATE TABLE IF NOT EXISTS wellness_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '',
  color text DEFAULT '#3b82f6',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create wellness content table
CREATE TABLE IF NOT EXISTS wellness_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES wellness_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  instructor_name text DEFAULT '',
  duration_minutes integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
  required_tier text NOT NULL CHECK (required_tier IN ('free', 'premium', 'couples_plus')),
  media_type text NOT NULL CHECK (media_type IN ('audio', 'video', 'audio_visual')),
  media_url text NOT NULL,
  thumbnail_url text DEFAULT '',
  preview_url text DEFAULT '',
  tags text[] DEFAULT ARRAY[]::text[],
  benefits text[] DEFAULT ARRAY[]::text[],
  recommended_for_zone text[] DEFAULT ARRAY['green', 'yellow', 'red']::text[],
  is_featured boolean DEFAULT false,
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  favorite_count integer DEFAULT 0,
  average_rating decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create content progress table
CREATE TABLE IF NOT EXISTS content_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES wellness_content(id) ON DELETE CASCADE,
  progress_seconds integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  is_favorite boolean DEFAULT false,
  last_played_at timestamptz DEFAULT now(),
  play_count integer DEFAULT 1,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Create playlists table
CREATE TABLE IF NOT EXISTS content_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create playlist items table
CREATE TABLE IF NOT EXISTS playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES content_playlists(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES wellness_content(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(playlist_id, content_id)
);

-- Insert wellness categories
INSERT INTO wellness_categories (category_key, name, description, icon, color, sort_order) VALUES
  ('breathwork', 'Breathwork', 'Pranayama and breathing exercises for regulation', '🫁', '#06b6d4', 1),
  ('meditation', 'Guided Meditation', 'Mindfulness and meditation practices', '🧘', '#8b5cf6', 2),
  ('qigong', 'Qigong Classes', 'Traditional Chinese movement and energy practices', '☯️', '#10b981', 3),
  ('binaural_beats', 'Binaural Beats', 'Frequency-based audio for brainwave entrainment', '🎵', '#f59e0b', 4),
  ('asmr', 'ASMR', 'Autonomous sensory meridian response triggers', '🎧', '#ec4899', 5),
  ('yoga_nidra', 'Yoga Nidra', 'Yogic sleep and deep relaxation', '🌙', '#6366f1', 6),
  ('somatic', 'Somatic Exercises', 'Body-based trauma release and regulation', '🤸', '#14b8a6', 7),
  ('pmr', 'Progressive Muscle Relaxation', 'Systematic tension and release', '💪', '#f97316', 8),
  ('visualization', 'Guided Visualization', 'Imagery for healing and peace', '✨', '#a855f7', 9),
  ('soundbath', 'Sound Baths', 'Healing frequencies and singing bowls', '🔔', '#84cc16', 10)
ON CONFLICT DO NOTHING;

-- Insert sample wellness content
INSERT INTO wellness_content (category_id, title, description, instructor_name, duration_minutes, difficulty, required_tier, media_type, media_url, tags, benefits, recommended_for_zone, is_featured) VALUES
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'breathwork'),
    'Box Breathing for Calm',
    '4-4-4-4 breath pattern used by Navy SEALs to regulate stress',
    'Dr. Sarah Chen',
    10,
    'beginner',
    'free',
    'audio',
    'https://example.com/box-breathing.mp3',
    ARRAY['anxiety', 'stress', 'regulation'],
    ARRAY['Reduces anxiety', 'Lowers heart rate', 'Improves focus'],
    ARRAY['yellow', 'red'],
    true
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'breathwork'),
    '4-7-8 Sleep Breath',
    'Dr. Weil''s relaxation breath for falling asleep',
    'Dr. Sarah Chen',
    15,
    'beginner',
    'free',
    'audio',
    'https://example.com/478-breath.mp3',
    ARRAY['sleep', 'insomnia', 'relaxation'],
    ARRAY['Promotes sleep', 'Calms nervous system', 'Reduces rumination'],
    ARRAY['yellow', 'red'],
    false
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'breathwork'),
    'Wim Hof Method',
    'Powerful breathing technique for energy and resilience',
    'Jake Morrison',
    30,
    'advanced',
    'premium',
    'video',
    'https://example.com/wim-hof.mp4',
    ARRAY['energy', 'cold_exposure', 'immune'],
    ARRAY['Boosts energy', 'Strengthens immune system', 'Increases resilience'],
    ARRAY['green'],
    true
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'meditation'),
    'Body Scan for Beginners',
    'Progressive awareness through the body',
    'Emma Williams',
    20,
    'beginner',
    'free',
    'audio',
    'https://example.com/body-scan.mp3',
    ARRAY['mindfulness', 'relaxation', 'body_awareness'],
    ARRAY['Reduces tension', 'Increases awareness', 'Promotes relaxation'],
    ARRAY['green', 'yellow'],
    true
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'meditation'),
    'Loving-Kindness Meditation',
    'Cultivate compassion for self and others',
    'Emma Williams',
    25,
    'intermediate',
    'premium',
    'audio',
    'https://example.com/loving-kindness.mp3',
    ARRAY['compassion', 'self_love', 'relationships'],
    ARRAY['Increases empathy', 'Reduces criticism', 'Improves relationships'],
    ARRAY['green', 'yellow'],
    true
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'qigong'),
    'Morning Qigong Flow',
    'Gentle movements to start your day with energy',
    'Master Li Wei',
    25,
    'beginner',
    'premium',
    'video',
    'https://example.com/morning-qigong.mp4',
    ARRAY['energy', 'morning', 'chi'],
    ARRAY['Increases energy', 'Improves flexibility', 'Balances chi'],
    ARRAY['green'],
    false
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'binaural_beats'),
    'Alpha Waves - Deep Relaxation',
    '10 Hz binaural beats for calm alertness',
    'SoundHealing Lab',
    60,
    'all_levels',
    'premium',
    'audio',
    'https://example.com/alpha-waves.mp3',
    ARRAY['focus', 'relaxation', 'meditation'],
    ARRAY['Enhances meditation', 'Improves focus', 'Reduces anxiety'],
    ARRAY['green', 'yellow'],
    true
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'binaural_beats'),
    'Theta Waves - Deep Sleep',
    '6 Hz binaural beats for deep restorative sleep',
    'SoundHealing Lab',
    90,
    'all_levels',
    'couples_plus',
    'audio',
    'https://example.com/theta-sleep.mp3',
    ARRAY['sleep', 'deep_rest', 'healing'],
    ARRAY['Promotes deep sleep', 'Enhances healing', 'Reduces insomnia'],
    ARRAY['yellow', 'red'],
    true
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'asmr'),
    'Gentle Rain & Whispers',
    'Soft spoken affirmations with rain sounds',
    'WhisperWave',
    45,
    'all_levels',
    'premium',
    'audio',
    'https://example.com/rain-whispers.mp3',
    ARRAY['sleep', 'relaxation', 'tingles'],
    ARRAY['Triggers ASMR', 'Promotes sleep', 'Reduces stress'],
    ARRAY['yellow', 'red'],
    false
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'yoga_nidra'),
    'Yoga Nidra for Sleep',
    'Guided journey into yogic sleep state',
    'Maya Patel',
    40,
    'beginner',
    'premium',
    'audio',
    'https://example.com/yoga-nidra-sleep.mp3',
    ARRAY['sleep', 'deep_rest', 'healing'],
    ARRAY['Promotes deep rest', 'Heals nervous system', 'Improves sleep quality'],
    ARRAY['yellow', 'red'],
    true
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'somatic'),
    'Trauma Release Exercises',
    'TRE® exercises for releasing stored tension',
    'Dr. Marcus Brown',
    30,
    'intermediate',
    'couples_plus',
    'video',
    'https://example.com/tre-exercises.mp4',
    ARRAY['trauma', 'release', 'shaking'],
    ARRAY['Releases trauma', 'Reduces tension', 'Regulates nervous system'],
    ARRAY['yellow', 'red'],
    true
  ),
  (
    (SELECT id FROM wellness_categories WHERE category_key = 'soundbath'),
    'Crystal Bowl Sound Bath',
    'Healing frequencies from crystal singing bowls',
    'Sound Temple',
    60,
    'all_levels',
    'couples_plus',
    'audio',
    'https://example.com/crystal-bowls.mp3',
    ARRAY['healing', 'meditation', 'frequencies'],
    ARRAY['Deep relaxation', 'Cellular healing', 'Chakra balancing'],
    ARRAY['green', 'yellow', 'red'],
    true
  )
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wellness_content_category ON wellness_content(category_id, is_published);
CREATE INDEX IF NOT EXISTS idx_wellness_content_tier ON wellness_content(required_tier, is_published);
CREATE INDEX IF NOT EXISTS idx_wellness_content_featured ON wellness_content(is_featured, is_published);
CREATE INDEX IF NOT EXISTS idx_content_progress_user ON content_progress(user_id, last_played_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_progress_favorites ON content_progress(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_playlists_user ON content_playlists(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE wellness_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

-- Wellness categories policies (public read)
CREATE POLICY "Anyone can view active categories"
  ON wellness_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Wellness content policies (subscription-gated)
CREATE POLICY "Users can view content for their tier"
  ON wellness_content FOR SELECT
  TO authenticated
  USING (
    is_published = true
    AND (
      required_tier = 'free'
      OR EXISTS (
        SELECT 1 FROM subscriptions s
        JOIN subscription_tiers t ON s.tier_id = t.id
        WHERE s.user_id = auth.uid()
          AND s.status = 'active'
          AND (
            (required_tier = 'premium' AND t.name IN ('premium', 'couples_plus'))
            OR (required_tier = 'couples_plus' AND t.name = 'couples_plus')
          )
      )
    )
  );

-- Content progress policies
CREATE POLICY "Users can view own progress"
  ON content_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
  ON content_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
  ON content_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Playlists policies
CREATE POLICY "Users can view own playlists and public playlists"
  ON content_playlists FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create own playlists"
  ON content_playlists FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own playlists"
  ON content_playlists FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own playlists"
  ON content_playlists FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Playlist items policies
CREATE POLICY "Users can view playlist items they have access to"
  ON playlist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_playlists cp
      WHERE cp.id = playlist_items.playlist_id
        AND (cp.user_id = auth.uid() OR cp.is_public = true)
    )
  );

CREATE POLICY "Users can manage items in own playlists"
  ON playlist_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_playlists
      WHERE content_playlists.id = playlist_items.playlist_id
        AND content_playlists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_playlists
      WHERE content_playlists.id = playlist_items.playlist_id
        AND content_playlists.user_id = auth.uid()
    )
  );

-- Function to track content view
CREATE OR REPLACE FUNCTION track_content_view(
  p_user_id uuid,
  p_content_id uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO content_progress (user_id, content_id, play_count, last_played_at)
  VALUES (p_user_id, p_content_id, 1, now())
  ON CONFLICT (user_id, content_id)
  DO UPDATE SET
    play_count = content_progress.play_count + 1,
    last_played_at = now(),
    updated_at = now();

  UPDATE wellness_content
  SET view_count = view_count + 1
  WHERE id = p_content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle favorite
CREATE OR REPLACE FUNCTION toggle_content_favorite(
  p_user_id uuid,
  p_content_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_is_favorite boolean;
  v_new_state boolean;
BEGIN
  SELECT is_favorite INTO v_is_favorite
  FROM content_progress
  WHERE user_id = p_user_id AND content_id = p_content_id;

  IF v_is_favorite IS NULL THEN
    INSERT INTO content_progress (user_id, content_id, is_favorite, last_played_at)
    VALUES (p_user_id, p_content_id, true, now());
    v_new_state := true;
  ELSE
    v_new_state := NOT v_is_favorite;
    UPDATE content_progress
    SET is_favorite = v_new_state, updated_at = now()
    WHERE user_id = p_user_id AND content_id = p_content_id;
  END IF;

  IF v_new_state THEN
    UPDATE wellness_content SET favorite_count = favorite_count + 1 WHERE id = p_content_id;
  ELSE
    UPDATE wellness_content SET favorite_count = favorite_count - 1 WHERE id = p_content_id;
  END IF;

  RETURN v_new_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update subscription tier features to include wellness content
UPDATE subscription_tiers
SET features = features || '{"wellness_library": false}'::jsonb
WHERE name = 'free';

UPDATE subscription_tiers
SET features = features || '{"wellness_library": true, "premium_content": true}'::jsonb
WHERE name = 'premium';

UPDATE subscription_tiers
SET features = features || '{"wellness_library": true, "premium_content": true, "exclusive_content": true}'::jsonb
WHERE name = 'couples_plus';
