import React, { useEffect, useState } from 'react';
import { View, Modal, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchActiveStories, markStoryViewed, replyToStory } from '../../lib/storiesApi';
import { supabase } from '../../lib/supabaseClient';

export default function StoryViewer({ route, navigation }: any) {
  const authorId = route?.params?.authorId;
  const [stories, setStories] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async ()=>{ const all = await fetchActiveStories(); const own = all.filter((s:any)=>s.author.id === authorId).sort((a:any,b:any)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); setStories(own); setLoading(false); })(); }, []);

  useEffect(()=>{ (async ()=>{ if (!stories.length) return; try { const { data } = await supabase.auth.getUser(); const viewerId = data?.user?.id; await markStoryViewed(stories[index].id, viewerId); } catch(e){ console.warn(e); } })(); }, [stories, index]);

  if (loading) return <ActivityIndicator />;
  if (!stories.length) return <View style={{ padding:12 }}><Text>Hikâye yok</Text></View>;

  const s = stories[index];
  return (
    <View style={{ flex:1, backgroundColor:'#000' }}>
      <Image source={{ uri: supabase.storage.from('stories').getPublicUrl(s.file_path).data.publicUrl }} style={{ width:'100%', height: '70%' }} resizeMode='contain' />
      <View style={{ padding:12 }}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>{s.author.full_name}</Text>
        <Text style={{ color:'#fff' }}>{s.caption}</Text>
        <View style={{ flexDirection:'row', marginTop:12 }}>
          <TouchableOpacity onPress={()=> setIndex(i=> Math.max(0, i-1))}><Text style={{ color:'#fff' }}>Önceki</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=> setIndex(i=> Math.min(stories.length-1, i+1))}><Text style={{ color:'#fff', marginLeft:12 }}>Sonraki</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
