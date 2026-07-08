import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, Image, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabaseClient';

export default function ProfileEdit({ route }: any) {
  const userId = route?.params?.userId ?? null;
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!userId) return;
      const { data, error } = await supabase.from('profiles').select('full_name, bio, avatar_url').eq('id', userId).single();
      if (error) return console.warn(error);
      if (data) {
        setName(data.full_name ?? '');
        setBio(data.bio ?? '');
        setAvatarUrl(data.avatar_url ?? null);
      }
    }
    load();
  }, [userId]);

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (res.cancelled) return;
    const response = await fetch(res.uri);
    const blob = await response.blob();
    const ext = res.uri.split('.').pop();
    const filePath = `avatars/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { contentType: blob.type });
    if (uploadError) return alert('Yükleme hatası: ' + uploadError.message);

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
  }

  async function save() {
    if (!userId) return alert('Kullanıcı bulunamadı');
    const { error } = await supabase.from('profiles').upsert({ id: userId, full_name: name, bio, avatar_url: avatarUrl });
    if (error) return alert('Kaydetme hatası: ' + error.message);
    alert('Kaydedildi');
  }

  return (
    <View style={{ padding: 16 }}>
      {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} /> : null}
      <Button title="Avatar Seç" onPress={pickAvatar} />
      <TextInput placeholder="İsim" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8, marginTop: 8 }} />
      <TextInput placeholder="Bio" value={bio} onChangeText={setBio} multiline style={{ borderWidth: 1, padding: 8, marginTop: 8, minHeight: 80 }} />
      <Button title="Kaydet" onPress={save} />
    </View>
  );
}
