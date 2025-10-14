import { supabase } from './supabase';

export interface WellnessCategory {
  id: string;
  category_key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface WellnessContent {
  id: string;
  category_id: string;
  title: string;
  description: string;
  instructor_name: string;
  duration_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  required_tier: 'free' | 'premium' | 'couples_plus';
  media_type: 'audio' | 'video' | 'audio_visual';
  media_url: string;
  thumbnail_url: string;
  preview_url: string;
  tags: string[];
  benefits: string[];
  recommended_for_zone: string[];
  is_featured: boolean;
  view_count: number;
  favorite_count: number;
  average_rating: number;
  created_at: string;
}

export interface ContentProgress {
  id: string;
  user_id: string;
  content_id: string;
  progress_seconds: number;
  completed: boolean;
  completed_at?: string;
  is_favorite: boolean;
  last_played_at: string;
  play_count: number;
  rating?: number;
}

export interface ContentPlaylist {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
}

export const wellnessService = {
  async getCategories(): Promise<WellnessCategory[]> {
    const { data, error } = await supabase
      .from('wellness_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return data || [];
  },

  async getContent(options?: {
    categoryId?: string;
    difficulty?: string;
    zone?: string;
    featured?: boolean;
    limit?: number;
  }): Promise<WellnessContent[]> {
    let query = supabase
      .from('wellness_content')
      .select('*')
      .eq('is_published', true);

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.difficulty) {
      query = query.eq('difficulty', options.difficulty);
    }

    if (options?.zone) {
      query = query.contains('recommended_for_zone', [options.zone]);
    }

    if (options?.featured) {
      query = query.eq('is_featured', true);
    }

    query = query.order('is_featured', { ascending: false })
      .order('view_count', { ascending: false })
      .limit(options?.limit || 50);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching content:', error);
      return [];
    }

    return data || [];
  },

  async getContentById(contentId: string): Promise<WellnessContent | null> {
    const { data, error } = await supabase
      .from('wellness_content')
      .select('*')
      .eq('id', contentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching content:', error);
      return null;
    }

    return data;
  },

  async trackView(userId: string, contentId: string): Promise<boolean> {
    const { error } = await supabase.rpc('track_content_view', {
      p_user_id: userId,
      p_content_id: contentId,
    });

    if (error) {
      console.error('Error tracking view:', error);
      return false;
    }

    return true;
  },

  async toggleFavorite(userId: string, contentId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_content_favorite', {
      p_user_id: userId,
      p_content_id: contentId,
    });

    if (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }

    return data || false;
  },

  async getProgress(userId: string, contentId: string): Promise<ContentProgress | null> {
    const { data, error } = await supabase
      .from('content_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching progress:', error);
      return null;
    }

    return data;
  },

  async updateProgress(
    userId: string,
    contentId: string,
    progressSeconds: number,
    completed = false
  ): Promise<boolean> {
    const { error } = await supabase
      .from('content_progress')
      .upsert({
        user_id: userId,
        content_id: contentId,
        progress_seconds: progressSeconds,
        completed,
        completed_at: completed ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating progress:', error);
      return false;
    }

    return true;
  },

  async getFavorites(userId: string): Promise<WellnessContent[]> {
    const { data, error } = await supabase
      .from('content_progress')
      .select('content_id, wellness_content(*)')
      .eq('user_id', userId)
      .eq('is_favorite', true)
      .order('last_played_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }

    return data?.map(item => item.wellness_content as any).filter(Boolean) || [];
  },

  async getRecentlyPlayed(userId: string, limit = 10): Promise<WellnessContent[]> {
    const { data, error } = await supabase
      .from('content_progress')
      .select('content_id, wellness_content(*)')
      .eq('user_id', userId)
      .order('last_played_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent:', error);
      return [];
    }

    return data?.map(item => item.wellness_content as any).filter(Boolean) || [];
  },

  async createPlaylist(userId: string, name: string, description = ''): Promise<ContentPlaylist | null> {
    const { data, error } = await supabase
      .from('content_playlists')
      .insert({
        user_id: userId,
        name,
        description,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating playlist:', error);
      return null;
    }

    return data;
  },

  async getPlaylists(userId: string): Promise<ContentPlaylist[]> {
    const { data, error } = await supabase
      .from('content_playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching playlists:', error);
      return [];
    }

    return data || [];
  },

  async addToPlaylist(playlistId: string, contentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('playlist_items')
      .insert({
        playlist_id: playlistId,
        content_id: contentId,
      });

    if (error) {
      console.error('Error adding to playlist:', error);
      return false;
    }

    return true;
  },
};
