// lib/notificationsApi.ts
import { supabase } from './supabaseClient';

export async function fetchNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, actor_id, type, post_id, comment_id, message_id, metadata, is_read, created_at, actor:profiles(id, full_name, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  if (error) throw error;
}
