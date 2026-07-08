import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, Button, StyleSheet } from 'react-native';
import { fetchNotes } from '../../lib/notesApi';
import { supabase } from '../../lib/supabaseClient';

export default function NotesList({ navigation }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterClass, setFilterClass] = useState<number | undefined>(undefined);
  const [filterSemester, setFilterSemester] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await fetchNotes({ q: query, course: filterCourse || undefined, section: filterSection || undefined, classNumber: filterClass, semester: filterSemester || undefined });
      setNotes(data || []);
    } catch (e) { console.warn(e); }
  }

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [query, filterCourse, filterSection, filterClass, filterSemester]);

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={{ marginBottom: 8 }}>
        <TextInput placeholder="Ara - başlık veya ders" value={query} onChangeText={setQuery} style={{ borderWidth: 1, padding: 8, marginBottom: 6 }} />
        <TextInput placeholder="Bölüm" value={filterSection} onChangeText={setFilterSection} style={{ borderWidth: 1, padding: 8, marginBottom: 6 }} />
        <TextInput placeholder="Ders" value={filterCourse} onChangeText={setFilterCourse} style={{ borderWidth: 1, padding: 8, marginBottom: 6 }} />
        <TextInput placeholder="Sınıf (1-4)" value={filterClass ? String(filterClass) : ''} onChangeText={t => setFilterClass(t ? parseInt(t,10) : undefined)} keyboardType="numeric" style={{ borderWidth: 1, padding: 8, marginBottom: 6 }} />
        <TextInput placeholder="Dönem" value={filterSemester} onChangeText={setFilterSemester} style={{ borderWidth: 1, padding: 8 }} />
        <Button title="Filtreleri Temizle" onPress={() => { setFilterCourse(''); setFilterSection(''); setFilterClass(undefined); setFilterSemester(''); setQuery(''); }} />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('NoteDetail', { id: item.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={{ uri: item.author?.avatar_url || undefined }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>{item.course} • {item.section} • Sınıf {item.class} • {item.semester}</Text>
                <Text style={styles.uploader}>{item.author?.full_name || item.author?.username || 'Anonim'}</Text>
              </View>
            </View>
            <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#666' }}>{new Date(item.created_at).toLocaleDateString()}</Text>
              <Text style={{ color: '#666' }}>İndir: {item.downloads || 0} • Görüntüle: {item.views || 0}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ card: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 12 }, avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 }, title: { fontWeight: '600' }, meta: { color: '#666' }, uploader: { marginTop: 4, color: '#333' } });
