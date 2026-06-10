// The ONLY chat data interface. UI never imports supabase-js for chat — it
// calls these. Reads/writes go directly to Supabase under RLS (anon/linked
// session). Realtime via .channel(). See the design spec for the model.
import { supabase, ensureSession } from './supabase';

const need = () => {
  if (!supabase) throw new Error('Chat not configured');
};

export const getMyUserId = () => ensureSession();

// ---- conversations ----
export const getOrCreateDM = async (otherUserId) => {
  need();
  await ensureSession();
  const { data, error } = await supabase.rpc('get_or_create_dm', { other_user_id: otherUserId });
  if (error) throw error;
  return data; // conversation id
};

const findOrCreateConversation = async (match, insert) => {
  need();
  await ensureSession();
  const { data: found } = await supabase
    .from('conversations').select('id').match(match).maybeSingle();
  if (found) return found.id;
  const { data: made, error } = await supabase
    .from('conversations').insert(insert).select('id').single();
  if (error) {
    // lost an insert race → re-read
    const { data: again } = await supabase
      .from('conversations').select('id').match(match).maybeSingle();
    if (again) return again.id;
    throw error;
  }
  return made.id;
};

export const getGroupConversation = (groupKey, title) =>
  findOrCreateConversation({ kind: 'group', group_key: groupKey },
    { kind: 'group', group_key: groupKey, title });

export const getSubjectConversation = (subjectType, subjectId, title) =>
  findOrCreateConversation({ kind: 'subject', subject_type: subjectType, subject_id: String(subjectId) },
    { kind: 'subject', subject_type: subjectType, subject_id: String(subjectId), title });

export const joinConversation = async (conversationId) => {
  need();
  const uid = await ensureSession();
  await supabase.from('conversation_participants')
    .upsert({ conversation_id: conversationId, user_id: uid }, { onConflict: 'conversation_id,user_id' });
};

// ---- messages ----
export const listMessages = async (conversationId, { parentId = null, limit = 200 } = {}) => {
  need();
  await ensureSession();
  let q = supabase.from('messages')
    .select('id,conversation_id,parent_id,author_id,author_name,author_photo,body,created_at,deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  q = parentId === null ? q.is('parent_id', null) : q.eq('parent_id', parentId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

// For feed surfaces: fetch all rows (posts + comments) so buildThread can nest.
export const listThread = async (conversationId, { limit = 500 } = {}) => {
  need();
  await ensureSession();
  const { data, error } = await supabase.from('messages')
    .select('id,conversation_id,parent_id,author_id,author_name,author_photo,body,created_at,deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

export const sendMessage = async (conversationId, { body, parentId = null, author }) => {
  need();
  const uid = await ensureSession();
  const row = {
    conversation_id: conversationId,
    parent_id: parentId,
    author_id: uid,
    author_name: author?.name || 'Mama',
    author_photo: author?.photo || null,
    body: body.trim(),
  };
  const { data, error } = await supabase.from('messages').insert(row).select().single();
  if (error) throw error;
  return data;
};

// ---- reactions ----
export const listReactions = async (messageIds = []) => {
  need();
  if (!messageIds.length) return [];
  await ensureSession();
  const { data, error } = await supabase.from('message_reactions')
    .select('message_id,user_id,kind').in('message_id', messageIds);
  if (error) throw error;
  return data || [];
};

export const toggleReaction = async (messageId) => {
  need();
  const uid = await ensureSession();
  const { data: existing } = await supabase.from('message_reactions')
    .select('message_id').eq('message_id', messageId).eq('user_id', uid).maybeSingle();
  if (existing) {
    await supabase.from('message_reactions').delete()
      .eq('message_id', messageId).eq('user_id', uid);
    return false;
  }
  await supabase.from('message_reactions')
    .insert({ message_id: messageId, user_id: uid, kind: 'like' });
  return true;
};

// ---- read state ----
export const markRead = async (conversationId) => {
  need();
  const uid = await ensureSession();
  await supabase.from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId).eq('user_id', uid);
};

// ---- realtime ----
// handlers: { onMessage(row), onReaction(row, eventType) }. Returns unsubscribe.
export const subscribe = (conversationId, handlers = {}) => {
  if (!supabase) return () => {};
  const ch = supabase.channel(`conv:${conversationId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => handlers.onMessage?.(payload.new || payload.old, payload.eventType))
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      (payload) => handlers.onReaction?.(payload.new || payload.old, payload.eventType))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
};
