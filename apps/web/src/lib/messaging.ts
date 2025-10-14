import { supabase } from './supabase';

export interface CoupleMessage {
  id: string;
  couple_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent' | 'read' | 'archived';
  scheduled_send_at?: string;
  sent_at?: string;
  read_at?: string;
  sender_zone_at_send?: 'green' | 'yellow' | 'red';
  sender_heart_rate_at_send?: number;
  receiver_zone_at_send?: 'green' | 'yellow' | 'red';
  tone_analysis?: ToneAnalysis;
  is_template: boolean;
  template_id?: string;
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  category: 'repair' | 'support' | 'appreciation' | 'boundary' | 'request';
  title: string;
  content: string;
  recommended_for_zones: string[];
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: 'heart' | 'hug' | 'acknowledge' | 'pause' | 'support';
  created_at: string;
}

export interface ToneAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  escalationRisk: boolean;
  gottmanWarnings: string[];
  tone: string;
  suggestions: string[];
  shouldDelay: boolean;
  delayReason?: string;
  rewriteSuggestion?: string;
}

export interface SafetyCheck {
  id: string;
  message_id: string;
  check_type: 'zone_warning' | 'escalation_risk' | 'tone_analysis';
  severity: 'low' | 'medium' | 'high';
  warning_message: string;
  suggested_action: string;
  was_acknowledged: boolean;
  user_proceeded_anyway: boolean;
  created_at: string;
}

export interface PartnerStatus {
  userId: string;
  name: string;
  zone?: 'green' | 'yellow' | 'red';
  readinessScore?: number;
  lastCheckIn?: string;
}

export const messagingService = {
  async getCouple(userId: string) {
    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching couple:', error);
      return null;
    }

    return data;
  },

  async getMessages(coupleId: string): Promise<CoupleMessage[]> {
    const { data, error } = await supabase
      .from('couple_messages')
      .select('*')
      .eq('couple_id', coupleId)
      .in('status', ['sent', 'read'])
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  },

  async sendMessage(
    coupleId: string,
    senderId: string,
    receiverId: string,
    content: string,
    options?: {
      scheduledSendAt?: string;
      senderZone?: 'green' | 'yellow' | 'red';
      senderHeartRate?: number;
      receiverZone?: 'green' | 'yellow' | 'red';
      toneAnalysis?: ToneAnalysis;
      templateId?: string;
      replyToId?: string;
    }
  ): Promise<CoupleMessage | null> {
    const messageData: any = {
      couple_id: coupleId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      status: options?.scheduledSendAt ? 'scheduled' : 'sent',
      sent_at: options?.scheduledSendAt ? null : new Date().toISOString(),
      scheduled_send_at: options?.scheduledSendAt,
      sender_zone_at_send: options?.senderZone,
      sender_heart_rate_at_send: options?.senderHeartRate,
      receiver_zone_at_send: options?.receiverZone,
      tone_analysis: options?.toneAnalysis || {},
      is_template: !!options?.templateId,
      template_id: options?.templateId,
      reply_to_id: options?.replyToId,
    };

    const { data, error } = await supabase
      .from('couple_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return data;
  },

  async markAsRead(messageId: string): Promise<boolean> {
    const { error } = await supabase.rpc('mark_message_read', {
      message_id: messageId,
    });

    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }

    return true;
  },

  async addReaction(
    messageId: string,
    userId: string,
    reaction: 'heart' | 'hug' | 'acknowledge' | 'pause' | 'support'
  ): Promise<boolean> {
    const { error } = await supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: userId,
      reaction,
    });

    if (error) {
      console.error('Error adding reaction:', error);
      return false;
    }

    return true;
  },

  async removeReaction(messageId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing reaction:', error);
      return false;
    }

    return true;
  },

  async getReactions(messageId: string): Promise<MessageReaction[]> {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error fetching reactions:', error);
      return [];
    }

    return data || [];
  },

  async getTemplates(zone?: string): Promise<MessageTemplate[]> {
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('is_active', true)
      .order('category');

    if (zone) {
      query = query.contains('recommended_for_zones', [zone]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return data || [];
  },

  async analyzeTone(
    message: string,
    context?: {
      senderZone?: string;
      receiverZone?: string;
      senderHeartRate?: number;
      recentConflicts?: number;
    }
  ): Promise<ToneAnalysis | null> {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/message-tone-analysis`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          senderZone: context?.senderZone,
          receiverZone: context?.receiverZone,
          senderHeartRate: context?.senderHeartRate,
          recentConflicts: context?.recentConflicts,
        }),
      });

      if (!response.ok) {
        console.error('Tone analysis API error:', response.status);
        return null;
      }

      const analysis: ToneAnalysis = await response.json();
      return analysis;
    } catch (error) {
      console.error('Error analyzing tone:', error);
      return null;
    }
  },

  async createSafetyCheck(
    messageId: string,
    checkType: 'zone_warning' | 'escalation_risk' | 'tone_analysis',
    severity: 'low' | 'medium' | 'high',
    warningMessage: string,
    suggestedAction: string
  ): Promise<boolean> {
    const { error } = await supabase.from('message_safety_checks').insert({
      message_id: messageId,
      check_type: checkType,
      severity,
      warning_message: warningMessage,
      suggested_action: suggestedAction,
    });

    if (error) {
      console.error('Error creating safety check:', error);
      return false;
    }

    return true;
  },

  async acknowledgeSafetyCheck(checkId: string, proceeded: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('message_safety_checks')
      .update({
        was_acknowledged: true,
        user_proceeded_anyway: proceeded,
      })
      .eq('id', checkId);

    if (error) {
      console.error('Error acknowledging safety check:', error);
      return false;
    }

    return true;
  },

  async getPartnerStatus(userId: string, partnerId: string): Promise<PartnerStatus | null> {
    const [profileData, checkInData] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', partnerId)
        .maybeSingle(),
      supabase
        .from('check_ins')
        .select('nervous_system_zone, readiness_score, created_at')
        .eq('user_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileData.error || !profileData.data) {
      return null;
    }

    return {
      userId: partnerId,
      name: profileData.data.full_name || 'Partner',
      zone: checkInData.data?.nervous_system_zone,
      readinessScore: checkInData.data?.readiness_score,
      lastCheckIn: checkInData.data?.created_at,
    };
  },

  subscribeToMessages(coupleId: string, callback: (message: CoupleMessage) => void) {
    const channel = supabase
      .channel('couple_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'couple_messages',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          callback(payload.new as CoupleMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'couple_messages',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          callback(payload.new as CoupleMessage);
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribeFromMessages(channel: any) {
    supabase.removeChannel(channel);
  },
};
