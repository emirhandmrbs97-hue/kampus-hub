// app/components/ShareModal.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, FlatList, TextInput, TouchableOpacity, Button, Image, StyleSheet } from 'react-native';
import { fetchFollowing, sharePostToUsers } from '../../lib/shareApi';
import { supabase } from '../../lib/supabaseClient';

export default function ShareModal({ visible, onClose, postId, currentUserId }: any) {
  const [list, setList] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const following = await fetchFollowing(currentUserId);
        setList(following || []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [visible]);

  const filtered = list.filter(u => (u.full_name || u.username || '').toLowerCase().includes(query.toLowerCase()));

  function toggle(id: string) {
    setSelected(s => ({ ...s, [id]: !s[id] }));
  }

  async function send() {
    const recipients = Object.keys(selected).filter(k => selected[k]);
    if (!recipients.length) return alert('En az bir kişi seçin');
    try {
      await sharePostToUsers(postId, currentUserId, recipients);
      alert('Gönderildi');
      onClose();
    } catch (e: any) {
      console.warn(e);
      alert('Gönderme hatası: ' + e.message);
    }
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Paylaş</Text>
        <TextInput placeholder="Ara" value={query} onChangeText={setQuery} style={{ borderWidth: 1, padding: 8, marginVertical: 8 }} />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)}>
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              <Text style={{ flex: 1 }}>{item.full_name || item.username || 'Anonim'}</Text>
              <Text>{selected[item.id] ? '✓' : ''}</Text>
            </TouchableOpacity>
          )}
        />
        <Button title="Gönder" onPress={send} />
        <Button title="İptal" onPress={onClose} color="#888" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }, avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 } });
