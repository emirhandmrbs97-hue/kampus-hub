import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { fetchPosts, addPost, addComment, toggleLike } from '../../lib/postsApi';

export default function PostsScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [newText, setNewText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
      await load();
      setupRealtime();
    })();

    return () => {
      // cleanup subscription
      try {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  async function load() {
    try {
      const p = await fetchPosts();
      setPosts(p || []);
    } catch (err: any) {
      console.error(err);
    }
  }

  function setupRealtime() {
    // subscribe to changes on posts, comments, likes and reload on change
    const channel = supabase.channel('public:posts_comments_likes');

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
      // console.log('posts event', payload);
      load();
    });

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, payload => {
      // console.log('comments event', payload);
      load();
    });

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, payload => {
      // console.log('likes event', payload);
      load();
    });

    channel.subscribe();
    subscriptionRef.current = channel;
  }

  async function handleAddPost() {
    if (!newText.trim() || !userId) return;
    const created = await addPost(newText.trim(), userId);
    if (created && created[0]) {
      setPosts(prev => [{ ...created[0], likesCount: 0, comments: [], author: { id: userId } }, ...prev]);
    }
    setNewText('');
  }

  async function handleComment(postId: string, text: string) {
    if (!text.trim() || !userId) return;
    const res = await addComment(postId, text.trim(), userId);
    if (res && res[0]) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments||[]), { ...res[0], author: { full_name: 'Siz' } }] } : p));
    }
  }

  async function handleLike(postId: string) {
    if (!userId) return;
    const res = await toggleLike(postId, userId);
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const delta = res?.action === 'liked' ? 1 : -1;
      return { ...p, likesCount: (p.likesCount || 0) + delta };
    }));
  }

  async function handleShare(post: any) {
    try {
      await Share.share({ message: post.content });
    } catch (err) {
      console.warn('Share error', err);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Akış - Yeni Gönderi</Text>
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
            <Text style={styles.postText}>{item.content}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Gönderen: {item.author?.full_name || 'Anonim'}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
                <Text>Beğen ({item.likesCount || 0})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => { /* focus comment input? simple flow: open alert or nothing */ }}>
                <Text>Yorum Yap</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
                <Text>Paylaş</Text>
              </TouchableOpacity>
            </View>

            <CommentsSection post={item} onComment={handleComment} />
          </View>
        )}
      />
    </View>
  );
}

function CommentsSection({ post, onComment }: { post: any; onComment: (id: string, t: string) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={{ marginTop: 8 }}>
      {(post.comments || []).map((c: any) => (
        <View key={c.id} style={{ paddingVertical: 4 }}>
          <Text style={{ fontWeight: '600' }}>{c.author?.full_name || c.author || 'Anonim'}</Text>
          <Text>{c.content}</Text>
        </View>
      ))}

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Yorum yaz..."
        style={styles.commentInput}
      />
      <Button
        title="Yorum Yap"
        onPress={() => {
          onComment(post.id, text);
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
  actionBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: '#f2f2f2', marginRight: 8 },
  postText: { marginBottom: 8 },
  commentInput: { borderWidth: 1, borderColor: '#eee', padding: 6, marginBottom: 6 }
});
