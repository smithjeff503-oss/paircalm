import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          phone_number: string | null;
          timezone: string;
          onboarding_completed: boolean;
          attachment_style: 'anxious' | 'avoidant' | 'secure' | 'fearful-avoidant' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          phone_number?: string | null;
          timezone?: string;
          onboarding_completed?: boolean;
          attachment_style?: 'anxious' | 'avoidant' | 'secure' | 'fearful-avoidant' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone_number?: string | null;
          timezone?: string;
          onboarding_completed?: boolean;
          attachment_style?: 'anxious' | 'avoidant' | 'secure' | 'fearful-avoidant' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      couples: {
        Row: {
          id: string;
          partner_1_id: string;
          partner_2_id: string | null;
          status: 'pending' | 'active' | 'paused' | 'ended';
          connection_date: string | null;
          subscription_tier: 'free' | 'premium' | 'annual';
          subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';
          subscription_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
