import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar, uploadCover, updateProfile } from '../../lib/profileApi';
import { supabase } from '../../lib/supabaseClient';

export default function EditProfile({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [university, setUniversity] = useState('');
  const [classNum, setClassNum] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (res.cancelled) return;
    setAvatar(res.uri);
  }
  async function pickCover() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (res.cancelled) return;
    setCover(res.uri);
  }

  async function save() {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) throw new Error('Oturum yok');

      const updates: any = { full_name: fullName || undefined, username: username || undefined, bio: bio || undefined, department: department || undefined, university: university || undefined, class: classNum ? parseInt(classNum,10) : undefined, phone: phone || undefined };

      if (avatar) {
        const filename = avatar.split('/').pop() || 'avatar.jpg';
        const { publicUrl } = await uploadAvatar(avatar, filename);
        updates.avatar_url = publicUrl;
      }
      if (cover) {
        const filename = cover.split('/').pop() || 'cover.jpg';
        const { publicUrl } = await uploadCover(cover, filename);
        updates.cover_url = publicUrl;
      }

      await updateProfile(userId, updates);
      Alert.alert('Profil güncellendi');
      navigation.goBack();
    } catch (e:any) { Alert.alert('Hata', e.message || 'Güncelleme hatası'); }
  }

  return (
    <View style={{ padding:12 }}>
      <Text>Ad Soyad</Text>
      <TextInput value={fullName} onChangeText={setFullName} style={{ borderWidth:1, padding:8 }} />
      <Text>Kullanıcı adı (@)</Text>
      <TextInput value={username} onChangeText={setUsername} style={{ borderWidth:1, padding:8 }} />
      <Text>Biyografi</Text>
      <TextInput value={bio} onChangeText={setBio} style={{ borderWidth:1, padding:8 }} multiline />
      <Text>Bölüm</Text>
      <TextInput value={department} onChangeText={setDepartment} style={{ borderWidth:1, padding:8 }} />
      <Text>Üniversite</Text>
      <TextInput value={university} onChangeText={setUniversity} style={{ borderWidth:1, padding:8 }} />
      <Text>Sınıf</Text>
      <TextInput value={classNum} onChangeText={setClassNum} keyboardType="numeric" style={{ borderWidth:1, padding:8 }} />
      <Text>Telefon</Text>
      <TextInput value={phone} onChangeText={setPhone} style={{ borderWidth:1, padding:8 }} />

      <Button title="Profil Fotoğrafı Seç" onPress={pickAvatar} />
      {avatar ? <Image source={{ uri: avatar }} style={{ width:80, height:80, marginTop:8 }} /> : null}
      <Button title="Kapak Fotoğrafı Seç" onPress={pickCover} />
      {cover ? <Image source={{ uri: cover }} style={{ width:'100%', height:120, marginTop:8 }} /> : null}

      <Button title="Kaydet" onPress={save} />
    </View>
  );
}
