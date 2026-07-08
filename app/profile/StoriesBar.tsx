import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Text } from 'react-native';
import { fetchActiveStories } from '../../lib/storiesApi';
import { supabase } from '../../lib/supabaseClient';

export default function StoriesBar({ navigation }: any) {
  const [stories, setStories] = useState<any[]>([]);

  useEffect(()=>{ (async ()=>{ const s = await fetchActiveStories(); setStories(s || []); })(); }, []);

  // show unique authors with latest story
  const authorsMap: Record<string, any> = {};
  stories.forEach((st:any)=>{ if (!authorsMap[st.author.id] || new Date(authorsMap[st.author.id].created_at) < new Date(st.created_at)) authorsMap[st.author.id] = st; });
  const authors = Object.values(authorsMap);

  return (
    <View style={{ padding:8 }}>
      <ScrollView horizontal>
        {authors.map((a:any)=> (
          <TouchableOpacity key={a.author.id} onPress={()=> navigation.navigate('StoryViewer', { authorId: a.author.id })} style={{ alignItems:'center', marginRight:12 }}>
            <Image source={{ uri: a.author.avatar_url }} style={{ width:60, height:60, borderRadius:30, borderWidth:2, borderColor:'#ff0' }} />
            <Text style={{ fontSize:12 }}>{a.author.full_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
