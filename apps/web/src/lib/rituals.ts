import { supabase } from './supabase';

export interface Ritual {
  id: string;
  type: string;
  title: string;
  description: string;
  prompt: string;
  frequency: 'daily' | 'weekly' | 'custom';
  recommended_time: string;
  duration_minutes: number;
  category: 'connection' | 'appreciation' | 'reflection' | 'planning';
  is_active: boolean;
  created_at: string;
}

export interface RitualCompletion {
  id: string;
  ritual_id: string;
  couple_id: string;
  user_id: string;
  response: string;
  mood?: string;
  shared_with_partner: boolean;
  partner_response?: string;
  completed_at: string;
  created_at: string;
}

export interface RitualStreak {
  id: string;
  couple_id: string;
  ritual_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_at?: string;
  total_completions: number;
  created_at: string;
  updated_at: string;
}

export interface AppreciationDeposit {
  id: string;
  couple_id: string;
  sender_id: string;
  receiver_id: string;
  deposit_type: string;
  content: string;
  emotional_bank_value: number;
  acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
}

export const ritualsService = {
  async getAllRituals(): Promise<Ritual[]> {
    const { data, error } = await supabase
      .from('rituals')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching rituals:', error);
      return [];
    }

    return data || [];
  },

  async completeRitual(
    ritualId: string,
    coupleId: string,
    userId: string,
    response: string,
    mood?: string
  ): Promise<boolean> {
    const { error: insertError } = await supabase
      .from('ritual_completions')
      .insert({
        ritual_id: ritualId,
        couple_id: coupleId,
        user_id: userId,
        response,
        mood,
      });

    if (insertError) {
      console.error('Error completing ritual:', insertError);
      return false;
    }

    const { error: streakError } = await supabase.rpc('update_ritual_streak', {
      p_couple_id: coupleId,
      p_ritual_id: ritualId,
    });

    if (streakError) {
      console.error('Error updating streak:', streakError);
    }

    return true;
  },

  async getRecentCompletions(coupleId: string, days = 7): Promise<RitualCompletion[]> {
    const { data, error } = await supabase
      .from('ritual_completions')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('completed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching completions:', error);
      return [];
    }

    return data || [];
  },

  async getStreaks(coupleId: string): Promise<RitualStreak[]> {
    const { data, error } = await supabase
      .from('ritual_streaks')
      .select('*')
      .eq('couple_id', coupleId)
      .order('current_streak', { ascending: false });

    if (error) {
      console.error('Error fetching streaks:', error);
      return [];
    }

    return data || [];
  },

  async createAppreciation(
    coupleId: string,
    senderId: string,
    receiverId: string,
    type: string,
    content: string,
    value = 5
  ): Promise<boolean> {
    const { error } = await supabase
      .from('appreciation_deposits')
      .insert({
        couple_id: coupleId,
        sender_id: senderId,
        receiver_id: receiverId,
        deposit_type: type,
        content,
        emotional_bank_value: value,
      });

    if (error) {
      console.error('Error creating appreciation:', error);
      return false;
    }

    return true;
  },

  async getEmotionalBankBalance(coupleId: string, days = 30): Promise<number> {
    const { data, error } = await supabase.rpc('get_emotional_bank_balance', {
      p_couple_id: coupleId,
      p_days: days,
    });

    if (error) {
      console.error('Error fetching bank balance:', error);
      return 0;
    }

    return data || 0;
  },

  async getRecentAppreciations(coupleId: string, limit = 10): Promise<AppreciationDeposit[]> {
    const { data, error } = await supabase
      .from('appreciation_deposits')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching appreciations:', error);
      return [];
    }

    return data || [];
  },
};
