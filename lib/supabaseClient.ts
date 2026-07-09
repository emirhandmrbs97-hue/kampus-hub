import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Resolve config from multiple locations to be robust across environments:
// - expo app config: Constants.expoConfig?.extra (managed app)
// - legacy: Constants.manifest?.extra
// - process.env (when running in shells or CI)
function resolveSupabaseConfig() {
  const manifest = (Constants as any).expoConfig ?? (Constants as any).manifest ?? {};
  const extra = manifest?.extra ?? {};

  const SUPABASE_URL =
    extra?.EXPO_PUBLIC_SUPABASE_URL ??
    extra?.SUPABASE_URL ??
    process.env?.EXPO_PUBLIC_SUPABASE_URL ??
    process.env?.SUPABASE_URL ??
    '';

  const SUPABASE_ANON_KEY =
    extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    extra?.SUPABASE_ANON_KEY ??
    process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env?.SUPABASE_ANON_KEY ??
    '';

  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

const { SUPABASE_URL, SUPABASE_ANON_KEY } = resolveSupabaseConfig();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    `Supabase configuration is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in app.json (expo.extra) or as environment variables.`
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  // keep sessions non-persistent in RN by default
  auth: { persistSession: false }
});

// Safely upsert profile on auth change. If auth is unavailable, do nothing.
try {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = (session as any)?.user;
    if (!user) return;
    try {
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: (user.user_metadata as any)?.full_name ?? user.email ?? null,
          username: (user.user_metadata as any)?.preferred_username ?? null,
          avatar_url: (user.user_metadata as any)?.avatar_url ?? null,
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('Failed to upsert profile on auth state change', e);
    }
  });
} catch (e) {
  console.warn('Auth listener setup failed', e);
}
