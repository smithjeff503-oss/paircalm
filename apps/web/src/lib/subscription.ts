import { supabase } from './supabase';

export interface SubscriptionTier {
  id: string;
  name: string;
  display_name: string;
  price_monthly_usd: number;
  price_yearly_usd: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier_id: string;
  status: string;
  billing_cycle: string;
  current_period_end: string;
}

export const subscriptionService = {
  async getTiers(): Promise<SubscriptionTier[]> {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching tiers:', error);
      return [];
    }

    return data || [];
  },

  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  },

  async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_subscription_access', {
      p_user_id: userId,
      p_feature: feature,
    });

    if (error) {
      console.error('Error checking access:', error);
      return false;
    }

    return data || false;
  },
};

export interface CommunityPost {
  id: string;
  post_type: string;
  title: string;
  content: string;
  is_anonymous: boolean;
  anonymous_name: string;
  tags: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
}

export const communityService = {
  async getPosts(type?: string, limit = 20): Promise<CommunityPost[]> {
    let query = supabase
      .from('community_posts')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('post_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    return data || [];
  },

  async createPost(
    userId: string | null,
    postType: string,
    title: string,
    content: string,
    isAnonymous: boolean,
    tags: string[] = []
  ): Promise<boolean> {
    const { error } = await supabase.from('community_posts').insert({
      author_id: isAnonymous ? null : userId,
      post_type: postType,
      title,
      content,
      is_anonymous: isAnonymous,
      tags,
    });

    if (error) {
      console.error('Error creating post:', error);
      return false;
    }

    return true;
  },
};

export interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  badge_color: string;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export const achievementService = {
  async getAchievements(): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data || [];
  },

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievement_definitions(*)')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    return data || [];
  },
};
