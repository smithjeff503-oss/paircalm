import { supabase } from './supabase';

export interface CrisisScore {
  id: string;
  couple_id: string;
  score: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  factors: {
    red_zone_days: number;
    high_risk_messages: number;
    gottman_violations: number;
    disengagement_hours: number;
    conflict_frequency: number;
  };
  red_zone_days: number;
  high_risk_messages: number;
  gottman_violations: number;
  disengagement_hours: number;
  conflict_frequency: number;
  calculated_at: string;
  created_at: string;
}

export interface CrisisIntervention {
  id: string;
  couple_id: string;
  crisis_score_id?: string;
  intervention_type: 'cooling_off' | 'emergency_therapy' | 'crisis_hotline' | 'ai_session' | 'safety_check';
  severity: 'moderate' | 'high' | 'critical';
  title: string;
  message: string;
  action_required: boolean;
  action_taken?: 'acknowledged' | 'accepted' | 'declined' | 'ignored';
  expires_at?: string;
  triggered_at: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface CrisisHotline {
  id: string;
  country: string;
  name: string;
  phone: string;
  type: 'mental_health' | 'domestic_violence' | 'suicide_prevention' | 'relationship';
  description: string;
  available_24_7: boolean;
  website: string;
  is_active: boolean;
  created_at: string;
}

export interface CoolingOffPeriod {
  id: string;
  couple_id: string;
  initiated_by: string;
  reason: string;
  duration_hours: number;
  started_at: string;
  ends_at: string;
  status: 'active' | 'completed' | 'cancelled';
  early_ended_at?: string;
  early_end_reason?: string;
  created_at: string;
}

export interface SafetyCheck {
  id: string;
  couple_id: string;
  target_user_id: string;
  check_type: 'disengagement' | 'sustained_red_zone' | 'high_risk_pattern';
  message: string;
  response?: string;
  responded_at?: string;
  requires_escalation: boolean;
  created_at: string;
}

export const crisisService = {
  async calculateCrisisScore(coupleId: string): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_crisis_score', {
      p_couple_id: coupleId,
    });

    if (error) {
      console.error('Error calculating crisis score:', error);
      return 0;
    }

    return data || 0;
  },

  async getLatestCrisisScore(coupleId: string): Promise<CrisisScore | null> {
    const { data, error } = await supabase
      .from('crisis_scores')
      .select('*')
      .eq('couple_id', coupleId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching crisis score:', error);
      return null;
    }

    return data;
  },

  async getCrisisHistory(coupleId: string, limit = 30): Promise<CrisisScore[]> {
    const { data, error } = await supabase
      .from('crisis_scores')
      .select('*')
      .eq('couple_id', coupleId)
      .order('calculated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching crisis history:', error);
      return [];
    }

    return data || [];
  },

  async getActiveInterventions(coupleId: string): Promise<CrisisIntervention[]> {
    const { data, error } = await supabase
      .from('crisis_interventions')
      .select('*')
      .eq('couple_id', coupleId)
      .is('acknowledged_at', null)
      .order('triggered_at', { ascending: false });

    if (error) {
      console.error('Error fetching interventions:', error);
      return [];
    }

    return data || [];
  },

  async acknowledgeIntervention(
    interventionId: string,
    action: 'acknowledged' | 'accepted' | 'declined'
  ): Promise<boolean> {
    const { error } = await supabase
      .from('crisis_interventions')
      .update({
        action_taken: action,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', interventionId);

    if (error) {
      console.error('Error acknowledging intervention:', error);
      return false;
    }

    return true;
  },

  async createIntervention(
    coupleId: string,
    type: CrisisIntervention['intervention_type'],
    severity: CrisisIntervention['severity'],
    title: string,
    message: string,
    options?: {
      actionRequired?: boolean;
      expiresAt?: string;
      crisisScoreId?: string;
    }
  ): Promise<CrisisIntervention | null> {
    const { data, error } = await supabase
      .from('crisis_interventions')
      .insert({
        couple_id: coupleId,
        intervention_type: type,
        severity,
        title,
        message,
        action_required: options?.actionRequired || false,
        expires_at: options?.expiresAt,
        crisis_score_id: options?.crisisScoreId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating intervention:', error);
      return null;
    }

    return data;
  },

  async getCrisisHotlines(country = 'US'): Promise<CrisisHotline[]> {
    const { data, error } = await supabase
      .from('crisis_hotlines')
      .select('*')
      .eq('country', country)
      .eq('is_active', true)
      .order('type');

    if (error) {
      console.error('Error fetching hotlines:', error);
      return [];
    }

    return data || [];
  },

  async startCoolingOffPeriod(
    coupleId: string,
    userId: string,
    reason: string,
    durationHours = 24
  ): Promise<CoolingOffPeriod | null> {
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + durationHours);

    const { data, error } = await supabase
      .from('cooling_off_periods')
      .insert({
        couple_id: coupleId,
        initiated_by: userId,
        reason,
        duration_hours: durationHours,
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting cooling off period:', error);
      return null;
    }

    return data;
  },

  async getActiveCoolingOffPeriod(coupleId: string): Promise<CoolingOffPeriod | null> {
    const { data, error } = await supabase
      .from('cooling_off_periods')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching cooling off period:', error);
      return null;
    }

    return data;
  },

  async endCoolingOffPeriod(
    periodId: string,
    reason?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('cooling_off_periods')
      .update({
        status: 'completed',
        early_ended_at: new Date().toISOString(),
        early_end_reason: reason,
      })
      .eq('id', periodId);

    if (error) {
      console.error('Error ending cooling off period:', error);
      return false;
    }

    return true;
  },

  async isInCoolingOff(coupleId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_in_cooling_off', {
      p_couple_id: coupleId,
    });

    if (error) {
      console.error('Error checking cooling off status:', error);
      return false;
    }

    return data || false;
  },

  async createSafetyCheck(
    coupleId: string,
    targetUserId: string,
    checkType: SafetyCheck['check_type'],
    message: string
  ): Promise<SafetyCheck | null> {
    const { data, error } = await supabase
      .from('safety_checks')
      .insert({
        couple_id: coupleId,
        target_user_id: targetUserId,
        check_type: checkType,
        message,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating safety check:', error);
      return null;
    }

    return data;
  },

  async respondToSafetyCheck(
    checkId: string,
    response: string,
    requiresEscalation = false
  ): Promise<boolean> {
    const { error } = await supabase
      .from('safety_checks')
      .update({
        response,
        responded_at: new Date().toISOString(),
        requires_escalation: requiresEscalation,
      })
      .eq('id', checkId);

    if (error) {
      console.error('Error responding to safety check:', error);
      return false;
    }

    return true;
  },

  async getPendingSafetyChecks(userId: string): Promise<SafetyCheck[]> {
    const { data, error } = await supabase
      .from('safety_checks')
      .select('*')
      .eq('target_user_id', userId)
      .is('responded_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching safety checks:', error);
      return [];
    }

    return data || [];
  },

  async triggerInterventionsForScore(
    coupleId: string,
    score: CrisisScore
  ): Promise<CrisisIntervention[]> {
    const interventions: CrisisIntervention[] = [];

    if (score.severity === 'critical') {
      const criticalIntervention = await this.createIntervention(
        coupleId,
        'crisis_hotline',
        'critical',
        '⚠️ Critical Alert: Immediate Support Needed',
        'Your relationship health indicators suggest you may be in crisis. Please consider reaching out to a crisis hotline or emergency therapist immediately. Your safety and well-being are the top priority.',
        {
          actionRequired: true,
          crisisScoreId: score.id,
        }
      );
      if (criticalIntervention) interventions.push(criticalIntervention);

      if (score.red_zone_days >= 3) {
        const coolingOffIntervention = await this.createIntervention(
          coupleId,
          'cooling_off',
          'critical',
          'Mandatory 24-Hour Break',
          'Both partners have been in red zone for 3+ days. A mandatory 24-hour cooling-off period is strongly recommended to prevent further escalation.',
          {
            actionRequired: true,
            crisisScoreId: score.id,
          }
        );
        if (coolingOffIntervention) interventions.push(coolingOffIntervention);
      }
    } else if (score.severity === 'high') {
      if (score.high_risk_messages >= 5) {
        const messagingIntervention = await this.createIntervention(
          coupleId,
          'ai_session',
          'high',
          '⚠️ Communication Pattern Alert',
          'We\'ve detected 5+ high-risk messages in the past week. Consider taking a break from messaging and scheduling an AI coaching session to improve communication patterns.',
          {
            actionRequired: false,
            crisisScoreId: score.id,
          }
        );
        if (messagingIntervention) interventions.push(messagingIntervention);
      }

      if (score.gottman_violations >= 5) {
        const gottmanIntervention = await this.createIntervention(
          coupleId,
          'emergency_therapy',
          'high',
          'Four Horsemen Alert',
          'Multiple instances of criticism, contempt, defensiveness, or stonewalling detected. These patterns can predict relationship distress. Consider booking an emergency therapy session.',
          {
            actionRequired: false,
            crisisScoreId: score.id,
          }
        );
        if (gottmanIntervention) interventions.push(gottmanIntervention);
      }

      if (score.disengagement_hours >= 48) {
        const disengagementIntervention = await this.createIntervention(
          coupleId,
          'safety_check',
          'high',
          'Partner Disengagement Detected',
          'Your partner hasn\'t checked in for over 48 hours. We\'re sending them a safety check to make sure they\'re okay.',
          {
            actionRequired: false,
            crisisScoreId: score.id,
          }
        );
        if (disengagementIntervention) interventions.push(disengagementIntervention);
      }
    } else if (score.severity === 'moderate') {
      if (score.conflict_frequency >= 5) {
        const conflictIntervention = await this.createIntervention(
          coupleId,
          'ai_session',
          'moderate',
          'Conflict Frequency Increasing',
          'You\'ve logged 5+ conflicts this week. Consider using repair tools or scheduling an AI coaching session to work through these patterns.',
          {
            actionRequired: false,
            crisisScoreId: score.id,
          }
        );
        if (conflictIntervention) interventions.push(conflictIntervention);
      }
    }

    return interventions;
  },
};
