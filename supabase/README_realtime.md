# Realtime and Notifications README

This repo includes migrations and scripts to set up the Supabase resources used by the app.

What I added for you:
- supabase/migrations/001_create_tables_and_rls.sql: creates tables and RLS policies
- supabase/migrations/002_notifications_triggers.sql: triggers/functions to create notifications for comments/likes/messages
- scripts/create_buckets_and_setup.js and scripts/setup_realtime_and_run_sql.js: create storage buckets and guide running migrations

Important: I cannot run migrations or create buckets on your Supabase project without your service_role key or DATABASE_URL. For security, do NOT commit your service_role key to the repo. Instead, run the provided scripts locally with environment variables.

Quick run guide (recommended):
1) Create a local .env with these values (do NOT commit this file):

SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DATABASE_URL=postgresql://postgres:password@db.host:5432/postgres  # optional if you have it

2) Install dependencies (if not already):
npm install @supabase/supabase-js dotenv pg

3) Run bucket creation and setup script:
node scripts/setup_realtime_and_run_sql.js

4) Run SQL migrations with psql (recommended) or via supabase CLI:
psql "$DATABASE_URL" -f supabase/migrations/001_create_tables_and_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/002_notifications_triggers.sql

5) Verify in Supabase dashboard:
- Storage > Buckets: avatars, notes, market-photos, stories
- Database > Tables: profiles, listings, notes, stories, messages, notifications
- Check RLS policies in Table Editor

If you want, I can also:
- Add realtime example subscriber code to the frontend (subscribe to messages and notifications)
- Add a GitHub Action that runs migrations using repo secrets (not recommended for service_role key exposure)

Tell me which of the optional follow-ups you want me to add, or run the scripts locally and paste logs if you want me to debug. 
