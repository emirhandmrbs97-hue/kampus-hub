// scripts/setup_realtime_and_run_sql.js
// Uses SERVICE_ROLE_KEY (or DATABASE_URL) to run SQL migrations and optionally enable realtime/config
// Usage: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY then: node scripts/setup_realtime_and_run_sql.js

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment before running this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Running SQL file: ${filePath}`);
  const res = await supabase.rpc('sql_execute', { p_sql: sql }).catch(() => null);
  // Many Supabase projects don't expose an rpc sql_execute; fallback to pg_client via service_role is recommended.
  if (!res) {
    console.warn('Could not run via RPC. If you have DATABASE_URL, consider running the file via psql instead.');
  }
}

async function createBucket(name, isPublic = false) {
  try {
    const { data, error } = await supabase.storage.createBucket(name, { public: isPublic });
    if (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log(`${name} already exists`);
        return;
      }
      throw error;
    }
    console.log(`Created bucket: ${name}`);
  } catch (e) {
    console.error(`Failed to create bucket ${name}:`, e.message || e);
  }
}

async function main() {
  // 1) Create buckets
  await createBucket('avatars', false);
  await createBucket('notes', false);
  await createBucket('market-photos', true);
  await createBucket('stories', false);

  // 2) Run SQL migrations if possible
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const fp = path.join(migrationsDir, f);
    console.log('Please run migration manually if automatic execution is not available:', fp);
  }

  console.log('Setup script finished. Note: Running SQL migrations may require psql/DATABASE_URL or supabase CLI.');
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
