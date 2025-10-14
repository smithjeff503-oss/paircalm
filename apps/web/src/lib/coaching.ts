import { supabase } from './supabase';
import { biometricService } from './biometric';

export interface CoachingSession {
  id: string;
  user_id: string;
  couple_id?: string;
  session_type: 'conflict' | 'check_in' | 'general' | 'crisis';
  topic?: string;
  status: 'active' | 'completed' | 'abandoned';
  started_at: string;
  ended_at?: string;
  user_heart_rate_start?: number;
  user_readiness_score?: number;
  nervous_system_zone?: 'green' | 'yellow' | 'red';
  outcome?: string;
  effectiveness_rating?: number;
  created_at: string;
}

export interface CoachingMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context_data?: any;
  created_at: string;
}

export interface CoachingTechnique {
  id: string;
  name: string;
  category: 'de_escalation' | 'communication' | 'repair' | 'grounding';
  description: string;
  instructions: string;
  recommended_for_zones: string[];
  is_active: boolean;
  created_at: string;
}

export interface CoachingContext {
  sessionId?: string;
  heartRate?: number;
  readinessScore?: number;
  nervousSystemZone?: 'green' | 'yellow' | 'red';
  recentConflicts?: any[];
  conflictPatterns?: any[];
  partnerReadiness?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  techniques?: CoachingTechnique[];
  context?: any;
}

export const coachingService = {
  async createSession(
    userId: string,
    sessionType: 'conflict' | 'check_in' | 'general' | 'crisis',
    context?: {
      coupleId?: string;
      topic?: string;
      heartRate?: number;
      readinessScore?: number;
      nervousSystemZone?: 'green' | 'yellow' | 'red';
    }
  ): Promise<CoachingSession | null> {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .insert({
        user_id: userId,
        couple_id: context?.coupleId,
        session_type: sessionType,
        topic: context?.topic || '',
        status: 'active',
        user_heart_rate_start: context?.heartRate,
        user_readiness_score: context?.readinessScore,
        nervous_system_zone: context?.nervousSystemZone,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating coaching session:', error);
      return null;
    }

    return data;
  },

  async endSession(
    sessionId: string,
    outcome?: string,
    effectivenessRating?: number
  ): Promise<boolean> {
    const { error } = await supabase
      .from('coaching_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        outcome: outcome || '',
        effectiveness_rating: effectivenessRating,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending coaching session:', error);
      return false;
    }

    return true;
  },

  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    contextData?: any
  ): Promise<CoachingMessage | null> {
    const { data, error } = await supabase
      .from('coaching_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        context_data: contextData || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving coaching message:', error);
      return null;
    }

    return data;
  },

  async getSessionMessages(sessionId: string): Promise<CoachingMessage[]> {
    const { data, error } = await supabase
      .from('coaching_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }

    return data || [];
  },

  async getSessions(userId: string, limit: number = 10): Promise<CoachingSession[]> {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching coaching sessions:', error);
      return [];
    }

    return data || [];
  },

  async getTechniques(zone?: string): Promise<CoachingTechnique[]> {
    let query = supabase
      .from('coaching_techniques')
      .select('*')
      .eq('is_active', true);

    if (zone) {
      query = query.contains('recommended_for_zones', [zone]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching techniques:', error);
      return [];
    }

    return data || [];
  },

  async sendMessage(
    messages: ChatMessage[],
    context: CoachingContext
  ): Promise<{ message: string; techniques: CoachingTechnique[]; context: any } | null> {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Coach API error:', errorText);
        throw new Error(`AI Coach API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message to AI coach:', error);
      return null;
    }
  },

  async buildContext(userId: string, coupleId?: string): Promise<CoachingContext> {
    const context: CoachingContext = {};

    if (biometricService.isConnected()) {
      const latestReading = biometricService.getLatestReading();
      if (latestReading?.heartRate) {
        context.heartRate = latestReading.heartRate;
      }
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const [readinessData, checkInData, conflictsData, patternsData] = await Promise.all([
      supabase
        .from('check_ins')
        .select('readiness_score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('check_ins')
        .select('nervous_system_zone')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      coupleId
        ? supabase
            .from('conflicts')
            .select('*')
            .eq('couple_id', coupleId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
        : { data: null },
      coupleId
        ? supabase
            .from('conflict_patterns')
            .select('*')
            .eq('couple_id', coupleId)
            .order('last_detected', { ascending: false })
            .limit(5)
        : { data: null },
    ]);

    if (readinessData.data?.readiness_score) {
      context.readinessScore = readinessData.data.readiness_score;
    }

    if (checkInData.data?.nervous_system_zone) {
      context.nervousSystemZone = checkInData.data.nervous_system_zone;
    }

    if (conflictsData.data) {
      context.recentConflicts = conflictsData.data;
    }

    if (patternsData.data) {
      context.conflictPatterns = patternsData.data;
    }

    if (coupleId) {
      const { data: coupleData } = await supabase
        .from('couples')
        .select('partner_1_id, partner_2_id')
        .eq('id', coupleId)
        .maybeSingle();

      if (coupleData) {
        const partnerId =
          coupleData.partner_1_id === userId ? coupleData.partner_2_id : coupleData.partner_1_id;

        const { data: partnerReadiness } = await supabase
          .from('check_ins')
          .select('readiness_score')
          .eq('user_id', partnerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (partnerReadiness?.readiness_score) {
          context.partnerReadiness = partnerReadiness.readiness_score;
        }
      }
    }

    return context;
  },

  async recordTechniqueUsage(
    sessionId: string,
    techniqueId: string,
    wasHelpful?: boolean,
    notes?: string
  ): Promise<boolean> {
    const { error } = await supabase.from('technique_usage').insert({
      session_id: sessionId,
      technique_id: techniqueId,
      was_helpful: wasHelpful,
      notes: notes || '',
    });

    if (error) {
      console.error('Error recording technique usage:', error);
      return false;
    }

    return true;
  },
};
