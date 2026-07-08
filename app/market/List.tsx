import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, Button, StyleSheet } from 'react-native';
import { fetchListings } from '../../lib/marketApi';

export default function MarketList({ navigation }: any) {
  const [listings, setListings] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('created_at');

  useEffect(()=>{ load(); }, []);

  async function load() {
    try {
      const data = await fetchListings({ q: query, category: category || undefined, city: city || undefined, minPrice: minPrice?parseFloat(minPrice):undefined, maxPrice: maxPrice?parseFloat(maxPrice):undefined, sortBy: sort });
      setListings(data || []);
    } catch (e) { console.warn(e); }
  }

  return (
    <View style={{ flex:1, padding:12 }}>
      <View style={{ marginBottom:8 }}>
        <TextInput placeholder="Ara başlık" value={query} onChangeText={setQuery} style={{ borderWidth:1, padding:8, marginBottom:6 }} />
        <TextInput placeholder="Kategori" value={category} onChangeText={setCategory} style={{ borderWidth:1, padding:8, marginBottom:6 }} />
        <TextInput placeholder="Şehir" value={city} onChangeText={setCity} style={{ borderWidth:1, padding:8, marginBottom:6 }} />
        <View style={{ flexDirection:'row', gap:8 }}>
          <TextInput placeholder="Min" value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" style={{ borderWidth:1, padding:8, flex:1 }} />
          <TextInput placeholder="Max" value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" style={{ borderWidth:1, padding:8, flex:1 }} />
        </View>
        <Button title="Filtrele" onPress={load} />
      </View>

      <FlatList
        data={listings}
        keyExtractor={(i)=>i.id}
        renderItem={({ item })=> (
          <TouchableOpacity style={styles.card} onPress={()=>navigation.navigate('MarketDetail', { id: item.id })}>
            <View style={{ flexDirection:'row', alignItems:'center' }}>
              <Image source={{ uri: item.photos?.[0]?.file_path ? supabase.storage.from('market-photos').getPublicUrl(item.photos[0].file_path).data.publicUrl : item.author?.avatar_url }} style={styles.photo} />
              <View style={{ flex:1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text>{item.price} TL • {item.category}</Text>
                <Text style={{ color:'#666' }}>{item.city} • {item.university}</Text>
                <Text style={{ color:'#666' }}>Satıcı: {item.author?.full_name || item.author?.username}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ card: { padding:12, borderWidth:1, borderColor:'#eee', borderRadius:8, marginBottom:12 }, photo: { width:100, height:80, marginRight:12 }, title: { fontWeight:'600' } });
