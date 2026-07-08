import { supabase } from './supabaseClient';

const AVATARS_BUCKET = 'avatars';
const COVERS_BUCKET = 'covers';
const STORIES_BUCKET = 'stories';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar_url, cover_url, bio, department, university, class, phone, is_private, joined_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: any) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(fileUri: string, filename: string) {
  const resp = await fetch(fileUri);
  const blob = await resp.blob();
  const path = `avatars/${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  const publicUrl = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl;
  return { path, publicUrl };
}

export async function uploadCover(fileUri: string, filename: string) {
  const resp = await fetch(fileUri);
  const blob = await resp.blob();
  const path = `covers/${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from(COVERS_BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  const publicUrl = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path).data.publicUrl;
  return { path, publicUrl };
}

export async function followUser(targetId: string, userId: string) {
  // check if target is private
  const { data: target } = await supabase.from('profiles').select('is_private').eq('id', targetId).maybeSingle();
  if (!target) throw new Error('Hedef kullanıcı bulunamadı');
  if (target.is_private) {
    // create follow request
    const { data, error } = await supabase.from('follow_requests').insert([{ requester: userId, target: targetId }]).select().maybeSingle();
    if (error) throw error;
    return { action: 'requested', data };
  }
  // otherwise create follow directly
  const { data, error } = await supabase.from('follows').insert([{ follower: userId, following: targetId }]).select().maybeSingle();
  if (error) throw error;
  return { action: 'followed', data };
}

export async function unfollowUser(targetId: string, userId: string) {
  const { error } = await supabase.from('follows').delete().match({ follower: userId, following: targetId });
  if (error) throw error;
}

export async function respondFollowRequest(requestId: string, accept: boolean) {
  // update follow_requests and if accepted create a follow
  const { data: req, error: selErr } = await supabase.from('follow_requests').select().eq('id', requestId).maybeSingle();
  if (selErr) throw selErr;
  if (!req) throw new Error('Request not found');
  if (accept) {
    const { error: insErr } = await supabase.from('follows').insert([{ follower: req.requester, following: req.target }]);
    if (insErr) throw insErr;
    await supabase.from('follow_requests').update({ status: 'accepted' }).eq('id', requestId);
    return { action: 'accepted' };
  } else {
    await supabase.from('follow_requests').update({ status: 'rejected' }).eq('id', requestId);
    return { action: 'rejected' };
  }
}

export async function getFollowers(userId: string) {
  const { data, error } = await supabase.from('follows').select('follower:profiles(id, full_name, username, avatar_url), created_at').eq('following', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getFollowing(userId: string) {
  const { data, error } = await supabase.from('follows').select('following:profiles(id, full_name, username, avatar_url), created_at').eq('follower', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProfileStats(userId: string) {
  // posts count, followers, following, total likes
  const [{ data: posts }, { data: followers }, { data: following }, { data: likes }] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact' }).eq('author', userId),
    supabase.from('follows').select('id', { count: 'exact' }).eq('following', userId),
    supabase.from('follows').select('id', { count: 'exact' }).eq('follower', userId),
    supabase.from('likes').select('id', { count: 'exact' }).eq('user_id', userId),
  ]);
  return { posts: posts?.length ?? 0, followers: followers?.length ?? 0, following: following?.length ?? 0, likes: likes?.length ?? 0 };
}
