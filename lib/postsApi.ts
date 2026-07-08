import { supabase } from './supabaseClient';

export async function fetchPosts() {
  // fetch posts with related author (profiles), comments (with author), and likes
  const { data, error } = await supabase
    .from('posts')
    .select(`id, content, created_at, author:profiles(id, full_name, avatar_url), comments:comments(id, content, created_at, author:profiles(id, full_name)), likes:likes(id, user_id)`) 
    .order('created_at', { ascending: false });
  if (error) throw error;
  const posts = (data || []).map((p: any) => ({
    ...p,
    likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
    comments: p.comments || [],
    author: p.author || null
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
  // safer toggle: check if like exists then delete, otherwise insert
  const { data: existing, error: selErr } = await supabase
    .from('likes')
    .select('id')
    .match({ post_id: postId, user_id: userId })
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing && existing.id) {
    const { error: delErr } = await supabase
      .from('likes')
      .delete()
      .match({ post_id: postId, user_id: userId });
    if (delErr) throw delErr;
    return { action: 'unliked' };
  } else {
    const { error: insErr } = await supabase
      .from('likes')
      .insert([{ post_id: postId, user_id: userId }]);
    if (insErr) throw insErr;
    return { action: 'liked' };
  }
}
