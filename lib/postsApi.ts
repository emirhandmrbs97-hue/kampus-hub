import { supabase } from './supabaseClient';

export async function fetchPosts() {
  // fetch posts with related comments and likes
  const { data, error } = await supabase
    .from('posts')
    .select(`id, content, created_at, author, comments(id, content, created_at, author), likes(id, user_id)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // normalize likesCount from likes array
  const posts = (data || []).map((p: any) => ({
    ...p,
    likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
    comments: p.comments || []
  }));
  return posts;
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
