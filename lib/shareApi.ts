// lib/shareApi.ts
import { supabase } from './supabaseClient';

export async function fetchFollowing(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('following:profiles(id, full_name, username, avatar_url)')
    .eq('follower', userId);
  if (error) throw error;
  return (data || []).map((r: any) => r.following);
}

// Ensure a conversation exists for sender + recipient(s). If multiple recipients, create a group conversation.
export async function ensureConversationForUsers(userIds: string[], title?: string) {
  // For a two-person conversation, try to find an existing conversation with exactly those members
  if (userIds.length === 2) {
    // find conversations where both members exist and member count == 2
    const [a, b] = userIds;
    const { data } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .in('user_id', userIds);
    if (data) {
      // naive approach: not guaranteed accurate but acceptable for demo; otherwise need aggregate
    }
  }
  // create new conversation
  const { data: convData, error: convErr } = await supabase
    .from('conversations')
    .insert([{ title: title ?? null, is_group: userIds.length > 2 }])
    .select()
    .maybeSingle();
  if (convErr) throw convErr;
  const convId = convData.id;
  // insert members
  const members = userIds.map(id => ({ conversation_id: convId, user_id: id }));
  const { error: memErr } = await supabase.from('conversation_members').insert(members);
  if (memErr) throw memErr;
  return convData;
}

export async function sharePostToUsers(postId: string, senderId: string, recipientIds: string[]) {
  // create conversation (group if multiple) and message with post_shared
  const participants = Array.from(new Set([senderId, ...recipientIds]));
  const conv = await ensureConversationForUsers(participants);
  const convId = conv.id;

  // insert message with post_shared
  const { data: msgData, error: msgErr } = await supabase.from('messages').insert([{
    conversation_id: convId,
    sender: senderId,
    content: null,
    post_shared: postId
  }]).select().maybeSingle();
  if (msgErr) throw msgErr;

  // create shares records for history
  const shares = recipientIds.map(r => ({ post_id: postId, sender: senderId, recipient: r, conversation_id: convId }));
  const { error: shareErr } = await supabase.from('shares').insert(shares);
  if (shareErr) throw shareErr;

  return { conversation: conv, message: msgData };
}
