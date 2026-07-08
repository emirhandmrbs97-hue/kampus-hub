import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { fetchFavorites } from '../../lib/marketApi';
import { supabase } from '../../lib/supabaseClient';

export default function MarketFavorites({ navigation }: any) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(()=>{ (async ()=>{ const { data } = await supabase.auth.getUser(); setUserId(data?.user?.id ?? null); if (data?.user?.id) await load(data.user.id); })(); }, []);

  async function load(uid?: string) {
    if (!uid) return;
    const list = await fetchFavorites(uid);
    setFavorites(list || []);
  }

  return (
    <View style={{ flex:1, padding:12 }}>
      <FlatList data={favorites} keyExtractor={(i)=>i.listing.id} renderItem={({ item })=> (
        <TouchableOpacity style={{ padding:12, borderWidth:1, borderColor:'#eee', borderRadius:8, marginBottom:12 }} onPress={()=> navigation.navigate('MarketDetail', { id: item.listing.id })}>
          <View style={{ flexDirection:'row' }}>
            <Image source={{ uri: supabase.storage.from('market-photos').getPublicUrl(item.listing.photos?.[0]?.file_path || '').data.publicUrl }} style={{ width:80, height:60, marginRight:12 }} />
            <View style={{ flex:1 }}>
              <Text style={{ fontWeight:'600' }}>{item.listing.title}</Text>
              <Text>{item.listing.price} TL</Text>
              <Text style={{ color:'#666' }}>{item.listing.category}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )} />
    </View>
  );
}
