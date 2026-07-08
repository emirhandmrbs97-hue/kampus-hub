import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, Image, Text } from 'react-native';
import { getFollowers } from '../../lib/profileApi';
import { supabase } from '../../lib/supabaseClient';

export default function FollowersList({ route, navigation }: any) {
  const userId = route?.params?.id;
  const [list, setList] = useState<any[]>([]);

  useEffect(()=>{ (async ()=>{ if (userId) { const data = await getFollowers(userId); setList(data || []); } })(); }, []);

  return (
    <View style={{ flex:1, padding:12 }}>
      <FlatList data={list} keyExtractor={(i)=>i.follower.id} renderItem={({ item })=> (
        <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', padding:8 }} onPress={()=> navigation.navigate('Profile', { id: item.follower.id })}>
          <Image source={{ uri: item.follower.avatar_url }} style={{ width:48, height:48, borderRadius:24, marginRight:12 }} />
          <View>
            <Text style={{ fontWeight:'600' }}>{item.follower.full_name}</Text>
            <Text style={{ color:'#666' }}>@{item.follower.username}</Text>
          </View>
        </TouchableOpacity>
      )} />
    </View>
  );
}
