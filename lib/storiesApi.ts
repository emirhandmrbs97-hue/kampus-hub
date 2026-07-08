import { supabase } from './supabaseClient';

const STORIES_BUCKET = 'stories';

export async function uploadStory(fileUri: string, filename: string, mediaType: 'image'|'video') {
  const resp = await fetch(fileUri);
  const blob = await resp.blob();
  const path = `stories/${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from(STORIES_BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  // insert story record
  const { data, error: insErr } = await supabase.from('stories').insert([{ author: (await supabase.auth.getUser()).data?.user?.id, file_path: path, media_type: mediaType }]).select().maybeSingle();
  if (insErr) throw insErr;
  return data;
}

export async function fetchActiveStories() {
  const { data, error } = await supabase.from('stories').select('id, author, file_path, media_type, caption, created_at, expire_at, author:profiles(id, full_name, avatar_url)').gt('expire_at', 'now()').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markStoryViewed(storyId: string, viewerId: string) {
  const { error } = await supabase.from('story_views').insert([{ story_id: storyId, viewer: viewerId }]);
  if (error) {
    // ignore duplicate unique constraint
    if (!error.message.includes('duplicate key')) throw error;
  }
}

export async function replyToStory(storyId: string, senderId: string, message?: string, emoji?: string) {
  const { data, error } = await supabase.from('story_replies').insert([{ story_id: storyId, sender: senderId, message, emoji }]).select().maybeSingle();
  if (error) throw error;
  return data;
}
