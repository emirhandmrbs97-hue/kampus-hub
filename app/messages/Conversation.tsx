// app/messages/Conversation.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, Button, Image, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabaseClient';

export default function ConversationScreen({ route }: any) {
  const convId = route?.params?.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
      await load();
      const channel = supabase.channel('public:messages:' + convId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, payload => {
          load();
        }).subscribe();
      return () => supabase.removeChannel(channel);
    })();
  }, [convId]);

  async function load() {
    const { data } = await supabase
      .from('messages')
      .select('id, sender, content, post_shared, created_at, sender_profile:profiles(id, full_name, avatar_url)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function send() {
    if (!userId) return;
    const { error } = await supabase.from('messages').insert([{ conversation_id: convId, sender: userId, content: text }]);
    if (error) return alert('Gönderme hatası: ' + error.message);
    setText('');
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <FlatList
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={{ uri: item.sender_profile?.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }} />
              <Text style={{ fontWeight: '600' }}>{item.sender_profile?.full_name || 'Anonim'}</Text>
              <Text style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            {item.post_shared ? (
              <View style={styles.sharedCard}>
                <Text>Gönderi önizlemesi</Text>
                <Text>{item.post_shared}</Text>
              </View>
            ) : null}
            {item.content ? <Text style={{ marginTop: 6 }}>{item.content}</Text> : null}
          </View>
        )}
      />
      <TextInput value={text} onChangeText={setText} placeholder="Mesaj yaz..." style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <Button title="Gönder" onPress={send} />
    </View>
  );
}

const styles = StyleSheet.create({ sharedCard: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginTop: 8 } });
