import React, { useState } from 'react';
import { View, Text, Button, TextInput, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { uploadNoteFile, createNoteRecord } from '../../lib/notesApi';
import { supabase } from '../../lib/supabaseClient';

export default function NotesUpload({ navigation }: any) {
  const [course, setCourse] = useState('');
  const [section, setSection] = useState('');
  const [classNumber, setClassNumber] = useState('1');
  const [semester, setSemester] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (res.type !== 'success') return;
    if (!res.name.toLowerCase().endsWith('.pdf')) return Alert.alert('Sadece PDF dosyası seçebilirsiniz');
    if (res.size && res.size > 20 * 1024 * 1024) return Alert.alert('Dosya 20MB üzerinde olamaz');
    setFile(res);
  }

  async function submit() {
    if (!course || !section || !semester || !title || !file) return Alert.alert('Lütfen gerekli alanları doldurun ve bir PDF seçin');
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) throw new Error('Kullanıcı oturumu yok');

      const uploaded = await uploadNoteFile(file.uri, file.name, file.mimeType || 'application/pdf');
      const record = await createNoteRecord({
        author: userId,
        course,
        section,
        class: parseInt(classNumber, 10),
        semester,
        title,
        description,
        file_path: uploaded.path,
        filename: uploaded.filename,
      });

      Alert.alert('Not yüklendi');
      navigation.navigate('NotesList');
    } catch (err: any) {
      Alert.alert('Yükleme hatası', err.message || 'Hata');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text> Ders adı</Text>
      <TextInput value={course} onChangeText={setCourse} style={{ borderWidth: 1, padding: 8 }} />
      <Text> Bölüm</Text>
      <TextInput value={section} onChangeText={setSection} style={{ borderWidth: 1, padding: 8 }} />
      <Text> Sınıf</Text>
      <TextInput value={classNumber} onChangeText={setClassNumber} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />
      <Text> Dönem</Text>
      <TextInput value={semester} onChangeText={setSemester} style={{ borderWidth: 1, padding: 8 }} />
      <Text> Not başlığı</Text>
      <TextInput value={title} onChangeText={setTitle} style={{ borderWidth: 1, padding: 8 }} />
      <Text> Kısa açıklama</Text>
      <TextInput value={description} onChangeText={setDescription} style={{ borderWidth: 1, padding: 8 }} multiline />

      <Button title={file ? `Seçili: ${file.name}` : 'PDF Seç'} onPress={pickFile} />
      {loading ? <ActivityIndicator /> : <Button title="Yükle" onPress={submit} />}
    </View>
  );
}
