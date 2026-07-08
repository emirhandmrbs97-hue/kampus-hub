import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabaseClient';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setMsg('');
    if (!email || !password) return setMsg('Email ve şifre girin');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        setMsg('Giriş başarılı');
        // redirect to posts screen
        router.replace('/posts');
      } else {
        setMsg('Giriş yapılamadı');
      }
    } catch (err: any) {
      setMsg(err.message || 'Giriş hatası');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Giriş Yap</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
      <TextInput placeholder="Şifre" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      <Button title={loading ? 'Bekleyin...' : 'Giriş Yap'} onPress={signIn} disabled={loading} />
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  heading: { fontSize: 20, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8, borderRadius: 6 },
  msg: { marginTop: 12, textAlign: 'center', color: '#333' }
});
