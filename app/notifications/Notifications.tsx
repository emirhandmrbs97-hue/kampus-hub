// app/notifications/Notifications.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { fetchNotifications, markNotificationRead } from '../../lib/notificationsApi';
import { supabase } from '../../lib/supabaseClient';

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
      if (data?.user?.id) await load(data.user.id);
      // realtime
      const ch = supabase.channel('public:notifications:' + (data?.user?.id ?? 'anon'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${data?.user?.id}` }, payload => {
          load(data.user.id);
        }).subscribe();
      return () => supabase.removeChannel(ch);
    })();
  }, []);

  async function load(uid?: string) {
    if (!uid) return;
    const list = await fetchNotifications(uid);
    setNotifications(list || []);
  }

  async function open(notification: any) {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
    }
    // handle navigation based on type
    if (notification.type === 'comment' || notification.type === 'like') {
      navigation.navigate('PostDetail', { id: notification.post_id });
    } else if (notification.type === 'message') {
      navigation.navigate('Conversation', { id: notification.metadata?.conversation_id });
    }
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <FlatList
        data={notifications}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => open(item)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontWeight: '600' }}>{item.actor?.full_name || 'Anonim'}</Text>
            <Text>{item.type} - {item.is_read ? 'Okundu' : 'Yeni'}</Text>
            <Text style={{ color: '#666', fontSize: 12 }}>{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
