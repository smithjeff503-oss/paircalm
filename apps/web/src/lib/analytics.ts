import { supabase } from './supabase';

export interface CheckInData {
  id: string;
  nervous_system_zone: 'green' | 'yellow' | 'red';
  stress_level: number;
  emotional_state: string[];
  physical_sensations: string[];
  created_at: string;
  heart_rate?: number;
}

export interface BiometricData {
  id: string;
  reading_type: string;
  heart_rate?: number;
  hrv?: number;
  readiness_score?: number;
  sleep_score?: number;
  recorded_at: string;
  data_source: string;
}

export interface ConflictData {
  id: string;
  severity: string;
  topic: string;
  start_time: string;
  end_time?: string;
  resolved: boolean;
  created_at: string;
}

export interface ZoneTrend {
  date: string;
  green: number;
  yellow: number;
  red: number;
}

export interface BiometricTrend {
  date: string;
  avgHeartRate?: number;
  avgHrv?: number;
  readiness?: number;
  sleepScore?: number;
}

export interface ConflictPattern {
  date: string;
  count: number;
  severity: string;
  topics: string[];
}

export interface CorrelationInsight {
  type: 'high_risk' | 'low_risk' | 'pattern';
  message: string;
  confidence: number;
}

export const analyticsService = {
  async getCheckInTrends(userId: string, days: number = 30): Promise<ZoneTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('wellness_check_ins')
      .select('nervous_system_zone, stress_level, created_at')
      .eq('client_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!data) return [];

    const trendMap = new Map<string, { green: number; yellow: number; red: number; total: number }>();

    data.forEach((item: any) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      const current = trendMap.get(date) || { green: 0, yellow: 0, red: 0, total: 0 };

      if (item.nervous_system_zone === 'green') current.green++;
      else if (item.nervous_system_zone === 'yellow') current.yellow++;
      else if (item.nervous_system_zone === 'red') current.red++;

      current.total++;
      trendMap.set(date, current);
    });

    return Array.from(trendMap.entries()).map(([date, counts]) => ({
      date,
      green: Math.round((counts.green / counts.total) * 100),
      yellow: Math.round((counts.yellow / counts.total) * 100),
      red: Math.round((counts.red / counts.total) * 100),
    }));
  },

  async getBiometricTrends(userId: string, days: number = 30): Promise<BiometricTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('biometric_readings')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (!data) return [];

    const trendMap = new Map<string, {
      heartRates: number[];
      hrvs: number[];
      readiness: number[];
      sleepScores: number[];
    }>();

    data.forEach((item: any) => {
      const date = new Date(item.recorded_at).toISOString().split('T')[0];
      const current = trendMap.get(date) || {
        heartRates: [],
        hrvs: [],
        readiness: [],
        sleepScores: [],
      };

      if (item.heart_rate) current.heartRates.push(item.heart_rate);
      if (item.hrv) current.hrvs.push(item.hrv);
      if (item.readiness_score) current.readiness.push(item.readiness_score);
      if (item.sleep_score) current.sleepScores.push(item.sleep_score);

      trendMap.set(date, current);
    });

    return Array.from(trendMap.entries()).map(([date, values]) => ({
      date,
      avgHeartRate: values.heartRates.length > 0
        ? Math.round(values.heartRates.reduce((a, b) => a + b, 0) / values.heartRates.length)
        : undefined,
      avgHrv: values.hrvs.length > 0
        ? Math.round(values.hrvs.reduce((a, b) => a + b, 0) / values.hrvs.length)
        : undefined,
      readiness: values.readiness.length > 0
        ? Math.round(values.readiness.reduce((a, b) => a + b, 0) / values.readiness.length)
        : undefined,
      sleepScore: values.sleepScores.length > 0
        ? Math.round(values.sleepScores.reduce((a, b) => a + b, 0) / values.sleepScores.length)
        : undefined,
    }));
  },

  async getConflictPatterns(coupleId: string, days: number = 30): Promise<ConflictPattern[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('conflicts')
      .select('severity, topic, start_time, created_at')
      .eq('couple_id', coupleId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!data) return [];

    const patternMap = new Map<string, { count: number; severities: string[]; topics: string[] }>();

    data.forEach((item: any) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      const current = patternMap.get(date) || { count: 0, severities: [], topics: [] };

      current.count++;
      current.severities.push(item.severity);
      if (item.topic) current.topics.push(item.topic);

      patternMap.set(date, current);
    });

    return Array.from(patternMap.entries()).map(([date, info]) => ({
      date,
      count: info.count,
      severity: info.severities[0] || 'low',
      topics: [...new Set(info.topics)],
    }));
  },

  async getCorrelationInsights(userId: string, coupleId: string | null): Promise<CorrelationInsight[]> {
    const insights: CorrelationInsight[] = [];
    const days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [checkIns, biometrics, conflicts] = await Promise.all([
      supabase
        .from('wellness_check_ins')
        .select('nervous_system_zone, stress_level, created_at')
        .eq('client_id', userId)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('biometric_readings')
        .select('readiness_score, recorded_at')
        .eq('user_id', userId)
        .eq('reading_type', 'readiness')
        .gte('recorded_at', startDate.toISOString()),
      coupleId
        ? supabase
            .from('conflicts')
            .select('created_at, severity')
            .eq('couple_id', coupleId)
            .gte('created_at', startDate.toISOString())
        : { data: null },
    ]);

    const checkInData = checkIns.data || [];
    const biometricData = biometrics.data || [];
    const conflictData = conflicts.data || [];

    const latestReadiness = biometricData[biometricData.length - 1]?.readiness_score;
    if (latestReadiness !== undefined && latestReadiness < 60) {
      insights.push({
        type: 'high_risk',
        message: `Your readiness is ${latestReadiness}%. You're running on low capacity - consider postponing difficult conversations.`,
        confidence: 0.85,
      });
    }

    const recentRedZones = checkInData
      .filter((item: any) => item.nervous_system_zone === 'red')
      .filter((item: any) => {
        const age = Date.now() - new Date(item.created_at).getTime();
        return age < 7 * 24 * 60 * 60 * 1000;
      });

    if (recentRedZones.length >= 3) {
      insights.push({
        type: 'high_risk',
        message: `You've been in the red zone ${recentRedZones.length} times this week. Your nervous system needs support.`,
        confidence: 0.9,
      });
    }

    if (conflictData.length > 0 && biometricData.length > 0) {
      let lowReadinessConflicts = 0;

      conflictData.forEach((conflict: any) => {
        const conflictDate = new Date(conflict.created_at);
        const nearbyReadiness = biometricData.find((b: any) => {
          const readingDate = new Date(b.recorded_at);
          const diff = Math.abs(conflictDate.getTime() - readingDate.getTime());
          return diff < 24 * 60 * 60 * 1000;
        });

        if (nearbyReadiness && nearbyReadiness.readiness_score < 65) {
          lowReadinessConflicts++;
        }
      });

      if (lowReadinessConflicts > 0 && conflictData.length > 0) {
        const percentage = Math.round((lowReadinessConflicts / conflictData.length) * 100);
        if (percentage >= 60) {
          insights.push({
            type: 'pattern',
            message: `${percentage}% of your conflicts happen when readiness is below 65. Recovery matters for relationship health.`,
            confidence: 0.75,
          });
        }
      }
    }

    const greenZoneCount = checkInData.filter((item: any) => item.nervous_system_zone === 'green').length;
    const totalCheckIns = checkInData.length;

    if (totalCheckIns > 10 && greenZoneCount / totalCheckIns > 0.7) {
      insights.push({
        type: 'low_risk',
        message: `You're in the green zone ${Math.round((greenZoneCount / totalCheckIns) * 100)}% of the time. Your regulation is strong!`,
        confidence: 0.8,
      });
    }

    return insights;
  },

  async getEmotionalPatterns(userId: string, days: number = 30): Promise<Map<string, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('wellness_check_ins')
      .select('emotional_state')
      .eq('client_id', userId)
      .gte('created_at', startDate.toISOString());

    const emotionCount = new Map<string, number>();

    if (data) {
      data.forEach((item: any) => {
        if (item.emotional_state && Array.isArray(item.emotional_state)) {
          item.emotional_state.forEach((emotion: string) => {
            emotionCount.set(emotion, (emotionCount.get(emotion) || 0) + 1);
          });
        }
      });
    }

    return emotionCount;
  },

  async getStressLevelStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('wellness_check_ins')
      .select('stress_level')
      .eq('client_id', userId)
      .gte('created_at', startDate.toISOString());

    if (!data || data.length === 0) {
      return { average: 0, min: 0, max: 0, trend: 'stable' };
    }

    const levels = data.map((item: any) => item.stress_level);
    const average = levels.reduce((a: number, b: number) => a + b, 0) / levels.length;
    const min = Math.min(...levels);
    const max = Math.max(...levels);

    const firstHalf = levels.slice(0, Math.floor(levels.length / 2));
    const secondHalf = levels.slice(Math.floor(levels.length / 2));
    const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length;

    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (secondAvg < firstAvg - 0.5) trend = 'improving';
    else if (secondAvg > firstAvg + 0.5) trend = 'worsening';

    return { average: Math.round(average * 10) / 10, min, max, trend };
  },

  async getPartnerReadinessComparison(coupleId: string, partner1Id: string, partner2Id: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const [partner1Data, partner2Data] = await Promise.all([
      supabase
        .from('biometric_readings')
        .select('readiness_score, recorded_at')
        .eq('user_id', partner1Id)
        .eq('reading_type', 'readiness')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('biometric_readings')
        .select('readiness_score, recorded_at')
        .eq('user_id', partner2Id)
        .eq('reading_type', 'readiness')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      partner1: partner1Data.data?.readiness_score || null,
      partner2: partner2Data.data?.readiness_score || null,
      combinedCapacity:
        partner1Data.data?.readiness_score && partner2Data.data?.readiness_score
          ? Math.round((partner1Data.data.readiness_score + partner2Data.data.readiness_score) / 2)
          : null,
    };
  },

  async getRelationshipMetrics(coupleId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('relationship_metrics')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    if (error) {
      console.error('Error fetching relationship metrics:', error);
      return [];
    }

    return data || [];
  },
};

export interface TherapistProfile {
  id: string;
  full_name: string;
  credentials: string;
  specializations: string[];
  bio: string;
  years_experience: number;
  session_rate_usd: number;
  rating: number;
  total_sessions: number;
}

export interface TherapySession {
  id: string;
  therapist_id: string;
  couple_id: string;
  scheduled_for: string;
  duration_minutes: number;
  status: string;
  session_type: string;
}

export const therapistService = {
  async getTherapists(): Promise<TherapistProfile[]> {
    const { data, error } = await supabase
      .from('therapist_profiles')
      .select('*')
      .eq('is_accepting_clients', true)
      .order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching therapists:', error);
      return [];
    }

    return data || [];
  },

  async bookSession(
    therapistId: string,
    coupleId: string,
    scheduledFor: string,
    sessionType: string
  ): Promise<TherapySession | null> {
    const { data, error } = await supabase
      .from('therapy_sessions')
      .insert({
        therapist_id: therapistId,
        couple_id: coupleId,
        scheduled_for: scheduledFor,
        session_type: sessionType,
      })
      .select()
      .single();

    if (error) {
      console.error('Error booking session:', error);
      return null;
    }

    return data;
  },

  async getSessions(coupleId: string): Promise<TherapySession[]> {
    const { data, error } = await supabase
      .from('therapy_sessions')
      .select('*')
      .eq('couple_id', coupleId)
      .order('scheduled_for', { ascending: false});

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    return data || [];
  },
};

export interface WorkbookExercise {
  id: string;
  category: string;
  title: string;
  description: string;
  instructions: string;
  prompts: string[];
  estimated_duration_minutes: number;
  difficulty: string;
  requires_both_partners: boolean;
}

export interface ExerciseCompletion {
  id: string;
  exercise_id: string;
  couple_id: string;
  partner_1_responses: Record<string, string>;
  partner_2_responses: Record<string, string>;
  shared_insights: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

export const workbookService = {
  async getExercises(): Promise<WorkbookExercise[]> {
    const { data, error } = await supabase
      .from('workbook_exercises')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching exercises:', error);
      return [];
    }

    return data || [];
  },

  async startExercise(exerciseId: string, coupleId: string): Promise<ExerciseCompletion | null> {
    const { data, error } = await supabase
      .from('exercise_completions')
      .insert({
        exercise_id: exerciseId,
        couple_id: coupleId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting exercise:', error);
      return null;
    }

    return data;
  },

  async updateCompletion(
    completionId: string,
    responses: Record<string, string>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('exercise_completions')
      .update({ partner_1_responses: responses })
      .eq('id', completionId);

    if (error) {
      console.error('Error updating completion:', error);
      return false;
    }

    return true;
  },

  async getCompletions(coupleId: string): Promise<ExerciseCompletion[]> {
    const { data, error } = await supabase
      .from('exercise_completions')
      .select('*')
      .eq('couple_id', coupleId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching completions:', error);
      return [];
    }

    return data || [];
  },
};
