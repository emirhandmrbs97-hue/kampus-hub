import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { fetchPosts, addPost, addComment, toggleLike } from '../../lib/postsApi';

export default function PostsScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [newText, setNewText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
      load();
    })();
  }, []);

  async function load() {
    try {
      const p = await fetchPosts();
      setPosts(p || []);
    } catch (err: any) {
      console.error(err);
    }
  }

  async function handleAddPost() {
    if (!newText.trim() || !userId) return;
    await addPost(newText.trim(), userId);
    setNewText('');
    load();
  }

  async function handleComment(postId: string, text: string) {
    if (!text.trim() || !userId) return;
    await addComment(postId, text.trim(), userId);
    load();
  }

  async function handleLike(postId: string) {
    if (!userId) return;
    await toggleLike(postId, userId);
    load();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Yeni Gönderi</Text>
      <TextInput
        style={styles.input}
        value={newText}
        onChangeText={setNewText}
        placeholder="Gönderinizi yazın..."
      />
      <Button title="Gönder" onPress={handleAddPost} />

      <Text style={[styles.heading, { marginTop: 20 }]}>Gönderiler</Text>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <Text>{item.content}</Text>
            <View style={styles.row}>
              <Button title="Beğen" onPress={() => handleLike(item.id)} />
            </View>
            <CommentsSection postId={item.id} onComment={handleComment} />
          </View>
        )}
      />
    </View>
  );
}

function CommentsSection({ postId, onComment }: { postId: string; onComment: (id: string, t: string) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={{ marginTop: 8 }}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Yorum yaz..."
        style={styles.commentInput}
      />
      <Button
        title="Yorum Yap"
        onPress={() => {
          onComment(postId, text);
          setText('');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 },
  post: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  commentInput: { borderWidth: 1, borderColor: '#eee', padding: 6, marginBottom: 6 }
});
