import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: boolean;
  read_at?: string;
  delivered_at?: string;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  crisis_alerts_enabled: boolean;
  ritual_reminders_enabled: boolean;
  partner_messages_enabled: boolean;
  appreciation_enabled: boolean;
  safety_checks_enabled: boolean;
  interventions_enabled: boolean;
  partner_zone_changes_enabled: boolean;
  conflict_alerts_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_unread_count', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return data || 0;
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      return false;
    }

    return true;
  },

  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }

    if (!data) {
      const { data: newPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating preferences:', insertError);
        return null;
      }

      return newPrefs;
    }

    return data;
  },

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('notification_preferences')
      .update({ ...preferences, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating preferences:', error);
      return false;
    }

    return true;
  },

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
