import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { getProfile, getProfileStats, getFollowers, getFollowing } from '../../lib/profileApi';
import { supabase } from '../../lib/supabaseClient';
import StoriesBar from './StoriesBar';

export default function ProfileScreen({ route, navigation }: any) {
  const userId = route?.params?.id; // if not provided, show current user
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({ posts:0, followers:0, following:0, likes:0 });
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async ()=>{ const uid = userId || (await supabase.auth.getUser()).data?.user?.id; await load(uid); })(); }, []);

  async function load(uid: string) {
    setLoading(true);
    try {
      const p = await getProfile(uid);
      setProfile(p);
      const s = await getProfileStats(uid);
      setStats(s);
    } catch (e) { console.warn(e); }
    setLoading(false);
  }

  if (loading) return <ActivityIndicator />;
  if (!profile) return <View style={{ padding:12 }}><Text>Profil bulunamadı</Text></View>;

  return (
    <ScrollView style={{ flex:1 }}>
      <Image source={{ uri: profile.cover_url || profile.avatar_url }} style={{ width:'100%', height:160 }} />
      <View style={{ padding:12, alignItems:'center' }}>
        <Image source={{ uri: profile.avatar_url }} style={{ width:100, height:100, borderRadius:50, marginTop:-50, borderWidth:3, borderColor:'#fff' }} />
        <Text style={{ fontWeight:'700', fontSize:18 }}>{profile.full_name}</Text>
        <Text style={{ color:'#666' }}>@{profile.username}</Text>
        <Text style={{ marginTop:8 }}>{profile.bio}</Text>

        <View style={{ flexDirection:'row', marginTop:12, justifyContent:'space-around', width:'100%' }}>
          <TouchableOpacity onPress={()=> navigation.navigate('UserPosts', { id: profile.id })}>
            <Text style={{ fontWeight:'700', textAlign:'center' }}>{stats.posts}</Text>
            <Text>Gönderi</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=> navigation.navigate('FollowersList', { id: profile.id })}>
            <Text style={{ fontWeight:'700', textAlign:'center' }}>{stats.followers}</Text>
            <Text>Takipçi</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=> navigation.navigate('FollowingList', { id: profile.id })}>
            <Text style={{ fontWeight:'700', textAlign:'center' }}>{stats.following}</Text>
            <Text>Takip</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ fontWeight:'700', textAlign:'center' }}>{stats.likes}</Text>
            <Text>Beğeni</Text>
          </View>
        </View>

        <View style={{ marginTop:12, flexDirection:'row', gap:8 }}>
          <Button title="Profili Düzenle" onPress={()=> navigation.navigate('EditProfile')} />
          <Button title="Ayarlar" onPress={()=> navigation.navigate('Settings')} />
        </View>

      </View>

      <StoriesBar />

      {/* Additional tabs: posts grid/list, market listings, saved, liked, notes - navigation to other screens */}
      <View style={{ padding:12 }}>
        <Button title="Gönderiler" onPress={()=> navigation.navigate('UserPosts', { id: profile.id })} />
        <Button title="İlanlar" onPress={()=> navigation.navigate('UserMarket', { id: profile.id })} />
        <Button title="Notlar" onPress={()=> navigation.navigate('UserNotes', { id: profile.id })} />
        <Button title="Kaydedilenler" onPress={()=> navigation.navigate('SavedItems', { id: profile.id })} />
      </View>
    </ScrollView>
  );
}
