import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadPhoto, createListing } from '../../lib/marketApi';
import { supabase } from '../../lib/supabaseClient';

const CATEGORIES = [
  'İkinci El Eşyalar','Günlük Kiralık Evler','Öğrenci Ev Arkadaşı','Giyim','Ayakkabı','Elektronik','Telefon','Bilgisayar','Tablet','Kitap','Ders Kitapları','Mobilya','Ev Eşyaları','Beyaz Eşya','Bisiklet','Motosiklet','Otomobil','Spor Malzemeleri','Müzik Aletleri','Etkinlik Biletleri','Diğer'
];

export default function MarketUpload({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState('');
  const [university, setUniversity] = useState('');
  const [condition, setCondition] = useState('İyi');
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    if (photos.length >= 10) return Alert.alert('En fazla 10 fotoğraf ekleyebilirsiniz');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (res.cancelled) return;
    setPhotos(p => [...p, res.uri]);
  }

  async function submit() {
    if (!title || !price || !category) return Alert.alert('Lütfen başlık, fiyat ve kategori girin');
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) throw new Error('Oturum yok');

      const uploadedPaths: string[] = [];
      for (let i=0;i<photos.length;i++) {
        const uri = photos[i];
        const filename = uri.split('/').pop() || `photo-${i}.jpg`;
        const path = await uploadPhoto(uri, filename);
        uploadedPaths.push(path);
      }

      await createListing({ author: userId, title, description, price: parseFloat(price), category, city, university, condition, photos: uploadedPaths });
      Alert.alert('İlan oluşturuldu');
      navigation.navigate('MarketList');
    } catch (e:any) { Alert.alert('Hata', e.message || 'Oluşturma hatası'); }
    setLoading(false);
  }

  return (
    <ScrollView style={{ padding: 12 }}>
      <Text>Başlık</Text>
      <TextInput value={title} onChangeText={setTitle} style={{ borderWidth:1, padding:8 }} />
      <Text>Açıklama</Text>
      <TextInput value={description} onChangeText={setDescription} style={{ borderWidth:1, padding:8 }} multiline />
      <Text>Fiyat</Text>
      <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" style={{ borderWidth:1, padding:8 }} />
      <Text>Kategori</Text>
      {CATEGORIES.map(c=> (
        <Button key={c} title={c} onPress={()=>setCategory(c)} color={category===c? '#2b8': undefined} />
      ))}
      <Text>Şehir</Text>
      <TextInput value={city} onChangeText={setCity} style={{ borderWidth:1, padding:8 }} />
      <Text>Üniversite</Text>
      <TextInput value={university} onChangeText={setUniversity} style={{ borderWidth:1, padding:8 }} />
      <Text>Durum</Text>
      <Button title={condition} onPress={()=>{ const opts = ['Sıfır','Az Kullanılmış','İyi','Orta']; const next = opts[(opts.indexOf(condition)+1)%opts.length]; setCondition(next); }} />

      <Text style={{ marginTop:12 }}>Fotoğraflar (max 10)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {photos.map((p,i)=> (
          <Image key={i} source={{ uri: p }} style={{ width:80, height:80, margin:6 }} />
        ))}
      </View>
      <Button title="Fotoğraf Ekle" onPress={pickImage} />

      <Button title="İlan Oluştur" onPress={submit} disabled={loading} />
    </ScrollView>
  );
}
