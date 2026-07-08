import { supabase } from './supabaseClient';

export async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content, created_at, author')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPost(content: string, userId: string) {
  const { data, error } = await supabase
    .from('posts')
    .insert([{ content, author: userId }])
    .select();
  if (error) throw error;
  return data;
}

export async function addComment(postId: string, content: string, userId: string) {
  const { data, error } = await supabase
    .from('comments')
    .insert([{ post_id: postId, content, author: userId }])
    .select();
  if (error) throw error;
  return data;
}

export async function toggleLike(postId: string, userId: string) {
  // try insert; if conflict (already liked) then delete
  const { error: insertError } = await supabase
    .from('likes')
    .insert([{ post_id: postId, user_id: userId }]);
  if (!insertError) return { action: 'liked' };

  // if unique constraint failed, remove like
  const { error: delError } = await supabase
    .from('likes')
    .delete()
    .match({ post_id: postId, user_id: userId });
  if (delError) throw delError;
  return { action: 'unliked' };
}
