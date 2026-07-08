import React, { useState } from 'react';
import { View, Button, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabaseClient';

export default function NotesUpload({ route }: any) {
  // If you use expo-router, you can get params; otherwise use auth user id
  const userId = route?.params?.userId ?? null;
  const [msg, setMsg] = useState('');

  async function pickAndUpload() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (res.type !== 'success') return setMsg('Dosya seçimi iptal edildi.');
    if (!res.name.toLowerCase().endsWith('.pdf')) return setMsg('Sadece PDF dosyası yükleyin.');

    try {
      const fileResp = await fetch(res.uri);
      const blob = await fileResp.blob();
      const filename = res.name;
      const id = userId ?? 'anonymous';
      const filePath = `notes/${id}/${Date.now()}-${filename}`;

      const { error: uploadError } = await supabase.storage.from('notes').upload(filePath, blob, {
        contentType: 'application/pdf',
      });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('notes').insert([{
        author: userId,
        file_path: filePath,
        filename
      }]);
      if (dbError) throw dbError;

      setMsg('Yükleme başarılı');
    } catch (err: any) {
      console.error(err);
      setMsg('Yükleme hatası: ' + err.message);
    }
  }

  return (
    <View style={{ padding: 16 }}>
      <Button title="PDF Seç ve Yükle" onPress={pickAndUpload} />
      <Text style={{ marginTop: 12 }}>{msg}</Text>
    </View>
  );
}
