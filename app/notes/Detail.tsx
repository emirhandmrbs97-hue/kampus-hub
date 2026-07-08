import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, Linking } from 'react-native';
import { getNotePublicUrl, getNoteSignedUrl, incrementNoteView, incrementNoteDownload, fetchNotes, deleteNote } from '../../lib/notesApi';
import { supabase } from '../../lib/supabaseClient';
import { WebView } from 'react-native-webview';

export default function NoteDetail({ route, navigation }: any) {
  const noteId = route?.params?.id;
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
      await load();
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchNotes({ limit: 1, offset: 0 });
      const item = rows.find((r: any) => r.id === noteId);
      if (!item) {
        Alert.alert('Not bulunamadı');
        navigation.goBack();
        return;
      }
      setNote(item);

      // increment view via RPC
      try { await incrementNoteView(noteId); } catch(e){ console.warn(e); }

      // get URL (public or signed depending on bucket config)
      try {
        const url = await getNoteSignedUrl(item.file_path, 60*60);
        setPdfUrl(url);
      } catch (e) {
        try {
          const url2 = await getNotePublicUrl(item.file_path);
          setPdfUrl(url2);
        } catch (ee) { console.warn(ee); }
      }
    } catch (e) { console.warn(e); }
    setLoading(false);
  }

  async function handleDownload() {
    if (!note) return;
    try {
      await incrementNoteDownload(note.id);
      const url = await getNoteSignedUrl(note.file_path, 60*60);
      // open url in browser to download
      Linking.openURL(url);
    } catch (e: any) { Alert.alert('Hata', e.message || 'İndirme hatası'); }
  }

  async function handleDelete() {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (note.author?.id !== uid) return Alert.alert('Yetkisiz');
      await deleteNote(note.id);
      Alert.alert('Silindi');
      navigation.goBack();
    } catch (e: any) { Alert.alert('Hata', e.message || 'Silme hatası'); }
  }

  if (loading) return <ActivityIndicator />;
  if (!note) return null;

  return (
    <View style={{ flex: 1 }}>
      {pdfUrl ? (
        <WebView source={{ uri: pdfUrl }} style={{ flex: 1 }} />
      ) : (
        <View style={{ padding: 16 }}><Text>PDF yüklenemiyor</Text></View>
      )}
      <View style={{ padding: 12 }}>
        <Text style={{ fontWeight: '700' }}>{note.title}</Text>
        <Text>{note.course} • {note.section} • Sınıf {note.class} • {note.semester}</Text>
        <Text>Yükleyen: {note.author?.full_name || note.author?.username}</Text>
        <Text>İndir: {note.downloads} • Görün: {note.views}</Text>
        <Button title="İndir" onPress={handleDownload} />
        {userId === note.author?.id ? <Button title="Sil" color="red" onPress={handleDelete} /> : null}
      </View>
    </View>
  );
}
