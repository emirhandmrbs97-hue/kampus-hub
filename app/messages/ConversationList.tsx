// app/messages/ConversationList.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { supabase } from '../../lib/supabaseClient';

export default function ConversationList({ navigation, currentUserId }: any) {
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('conversation_members')
        .select('conversation_id, conversation:conversations(id, title, is_group), user:profiles(id, full_name, avatar_url)')
        .eq('user_id', currentUserId);
      if (data) {
        setConversations(data.map((d: any) => d.conversation));
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={conversations}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Conversation', { id: item.id })} style={styles.row}>
            <Image source={{ uri: item.avatar_url || '' }} style={styles.avatar} />
            <Text style={{ flex: 1 }}>{item.title || 'Sohbet'}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', padding: 12 }, avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 } });
