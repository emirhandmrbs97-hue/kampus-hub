import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL = (Constants?.manifest as any)?.extra?.SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = (Constants?.manifest as any)?.extra?.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or ANON KEY is not set. Set SUPABASE_URL and SUPABASE_ANON_KEY in app config or .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Automatically create / upsert a profile record when a user signs in.
// This ensures profiles.id matches the authenticated user's id so RLS policies work correctly.
try {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session?.user;
    if (!user) return;
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata as any)?.full_name ?? user.email,
        username: (user.user_metadata as any)?.preferred_username ?? null,
        avatar_url: (user.user_metadata as any)?.avatar_url ?? null,
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Failed to upsert profile on auth state change', e);
    }
  });
} catch (e) {
  // on environments without auth support this may fail silently
  // but we should not crash the app
  console.warn('Auth listener setup failed', e);
}
