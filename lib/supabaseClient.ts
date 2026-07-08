import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL = (Constants?.manifest as any)?.extra?.SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = (Constants?.manifest as any)?.extra?.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or ANON KEY is not set. Set SUPABASE_URL and SUPABASE_ANON_KEY in app config or .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
