import React, { useEffect, useState } from 'react';
import { View, Text, Button, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { fetchListings, toggleFavorite, markListingStatus, deleteListing } from '../../lib/marketApi';
import { supabase } from '../../lib/supabaseClient';

export default function MarketDetail({ route, navigation }: any) {
  const listingId = route?.params?.id;
  const [listing, setListing] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(()=>{ (async ()=>{ const { data } = await supabase.auth.getUser(); setUserId(data?.user?.id ?? null); await load(); })(); }, []);

  async function load() {
    try {
      const rows = await fetchListings({ limit: 50 });
      const item = rows.find((r:any)=>r.id === listingId);
      setListing(item);
    } catch (e) { console.warn(e); }
  }

  async function handleFavorite() {
    if (!userId) return Alert.alert('Oturum açın');
    const res = await toggleFavorite(listingId, userId);
    Alert.alert(res.action === 'favorited' ? 'Favorilere eklendi' : 'Favoriden çıkarıldı');
    load();
  }

  async function handleMarkSold() {
    try { await markListingStatus(listingId, 'sold'); Alert.alert('İlan satıldı olarak işaretlendi'); load(); } catch(e:any){ Alert.alert('Hata', e.message); }
  }

  async function handleDelete() {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (listing.author?.id !== uid) return Alert.alert('Yetkisiz');
      await deleteListing(listingId);
      Alert.alert('Silindi');
      navigation.goBack();
    } catch (e:any) { Alert.alert('Hata', e.message || 'Silme hatası'); }
  }

  if (!listing) return <View style={{ padding:12 }}><Text>Yükleniyor...</Text></View>;

  return (
    <ScrollView style={{ padding:12 }}>
      <ScrollView horizontal pagingEnabled>
        {listing.photos.map((p:any,i:number)=> (
          <Image key={i} source={{ uri: supabase.storage.from('market-photos').getPublicUrl(p.file_path).data.publicUrl }} style={{ width:400, height:300 }} />
        ))}
      </ScrollView>
      <Text style={{ fontWeight:'700', fontSize:18, marginTop:8 }}>{listing.title}</Text>
      <Text style={{ fontSize:16, color:'#2b8' }}>{listing.price} TL</Text>
      <Text>{listing.category} • {listing.condition}</Text>
      <Text>{listing.city} • {listing.university}</Text>
      <Text style={{ marginTop:8 }}>{listing.description}</Text>
      <View style={{ marginTop:12 }}>
        <Text>Satıcı: {listing.author?.full_name || listing.author?.username}</Text>
        <Image source={{ uri: listing.author?.avatar_url }} style={{ width:48, height:48, borderRadius:24 }} />
      </View>

      <View style={{ marginTop:12 }}>
        <Button title="Favorilere Ekle" onPress={handleFavorite} />
        <Button title="Satıldı olarak işaretle" onPress={handleMarkSold} />
        {userId === listing.author?.id ? <Button title="Sil" color="red" onPress={handleDelete} /> : null}
        <Button title="Satıcıya Mesaj" onPress={()=> navigation.navigate('Conversation', { id: null, to: listing.author?.id })} />
      </View>

      <View style={{ marginTop:16 }}>
        <Text style={{ fontWeight:'600' }}>Satıcının diğer ilanları</Text>
        {(listing.author?.id) ? (
          <TouchableOpacity onPress={()=> navigation.navigate('MarketList', { author: listing.author.id })}><Text>Hepsini gör</Text></TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}
