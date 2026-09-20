import { getSupabaseClient } from './supabase';

export interface CimbLivechat {
  id: string;
  user_phone: string;
  status: 'open' | 'closed' | string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface CimbMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'admin';
  sender_phone: string;
  message: string;
  message_type?: 'text';
  is_read: boolean;
  created_at: string;
}

// Local cache keys for resilience
const LOCAL_STORAGE_CHATS_KEY = 'cimb_livechat_cache_v1';
const LOCAL_STORAGE_MESSAGES_KEY = 'cimb_messages_cache_v1';

function getLocalChats(): CimbLivechat[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalChats(chats: CimbLivechat[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(chats));
  } catch {
    // Ignore quota errors
  }
}

function getLocalMessages(conversationId: string): CimbMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MESSAGES_KEY}_${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(conversationId: string, messages: CimbMessage[]) {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_MESSAGES_KEY}_${conversationId}`,
      JSON.stringify(messages)
    );
  } catch {
    // Ignore quota errors
  }
}

/**
 * ID generator matching DB default formats:
 * chat_{timestamp_ms}
 * msg_{timestamp_ms}_{random6}
 */
export function generateChatId(): string {
  return `chat_${Date.now()}`;
}

export function generateMessageId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `msg_${Date.now()}_${rand}`;
}

/**
 * Get open livechat for userPhone, or create a new one in table `cimb_livechat`
 */
export async function getOrCreateLiveChat(userPhone: string): Promise<{
  chat: CimbLivechat;
  isNew: boolean;
  error?: string | null;
  needsPolicyRun?: boolean;
}> {
  const supabase = getSupabaseClient();
  const cleanPhone = String(userPhone || '').trim();

  try {
    // 1. Check existing open livechat for this user_phone ('open' or 'active')
    const { data: existingList, error: fetchErr } = await supabase
      .from('cimb_livechat')
      .select('*')
      .eq('user_phone', cleanPhone)
      .in('status', ['open', 'active'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.warn('[LiveChat] Query cimb_livechat error:', fetchErr);
    }

    if (existingList && existingList.length > 0) {
      const openChat = existingList[0] as CimbLivechat;
      // Sync local cache
      const local = getLocalChats().filter((c) => c.id !== openChat.id);
      saveLocalChats([openChat, ...local]);
      return { chat: openChat, isNew: false };
    }

    // 2. No open chat found in DB; create a new record conforming to DB constraints
    const now = new Date().toISOString();
    const newChatPayload = {
      id: generateChatId(),
      user_phone: cleanPhone,
      status: 'open',
      created_at: now,
      updated_at: now,
      last_message_at: now,
    };

    const { data: insertedData, error: insertErr } = await supabase
      .from('cimb_livechat')
      .insert(newChatPayload)
      .select()
      .single();

    if (!insertErr && insertedData) {
      const createdChat = insertedData as CimbLivechat;
      const local = getLocalChats().filter((c) => c.id !== createdChat.id);
      saveLocalChats([createdChat, ...local]);
      return { chat: createdChat, isNew: true };
    }

    const isPolicyViolation =
      insertErr?.code === '42501' || insertErr?.message?.includes('row-level security');

    // If insert failed due to RLS or network, create resilient local chat session
    const fallbackChat: CimbLivechat = {
      id: newChatPayload.id,
      user_phone: cleanPhone,
      status: 'open',
      created_at: now,
      updated_at: now,
      last_message_at: now,
    };

    const local = getLocalChats().filter((c) => c.id !== fallbackChat.id);
    saveLocalChats([fallbackChat, ...local]);

    return {
      chat: fallbackChat,
      isNew: true,
      error: insertErr?.message || null,
      needsPolicyRun: Boolean(isPolicyViolation),
    };
  } catch (err: any) {
    console.error('[LiveChat] Unexpected error in getOrCreateLiveChat:', err);
    const now = new Date().toISOString();
    const fallbackChat: CimbLivechat = {
      id: generateChatId(),
      user_phone: cleanPhone,
      status: 'open',
      created_at: now,
      updated_at: now,
      last_message_at: now,
    };
    return { chat: fallbackChat, isNew: true, error: err?.message };
  }
}

/**
 * Fetch all messages for a given conversation_id from `cimb_messages`
 */
export async function fetchChatMessages(conversationId: string): Promise<CimbMessage[]> {
  const supabase = getSupabaseClient();
  const localCached = getLocalMessages(conversationId);

  try {
    const { data, error } = await supabase
      .from('cimb_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[LiveChat] fetchChatMessages warning:', error);
      return localCached;
    }

    if (Array.isArray(data)) {
      // Merge remote messages with any locally sent messages that haven't synced yet
      const remoteIds = new Set(data.map((m: any) => m.id));
      const unsynced = localCached.filter((m) => !remoteIds.has(m.id));
      const merged = [...(data as CimbMessage[]), ...unsynced];
      saveLocalMessages(conversationId, merged);
      return merged;
    }

    return localCached;
  } catch (err) {
    console.error('[LiveChat] Failed to fetch messages:', err);
    return localCached;
  }
}

/**
 * Send a message into table `cimb_messages` and update `cimb_livechat`
 */
export async function sendChatMessage(params: {
  conversationId: string;
  senderType: 'user' | 'agent' | 'admin' | 'bot';
  senderPhone: string;
  message: string;
}): Promise<{
  message: CimbMessage;
  error?: string | null;
  needsPolicyRun?: boolean;
}> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const newId = generateMessageId();
  const dbSenderType: 'user' | 'admin' = params.senderType === 'user' ? 'user' : 'admin';

  const msgPayload: CimbMessage = {
    id: newId,
    conversation_id: params.conversationId,
    sender_type: dbSenderType,
    sender_phone: params.senderPhone,
    message: params.message.trim(),
    message_type: 'text',
    is_read: false,
    created_at: now,
  };

  // Optimistically save locally
  const currentLocal = getLocalMessages(params.conversationId);
  const updatedLocal = [...currentLocal, msgPayload];
  saveLocalMessages(params.conversationId, updatedLocal);

  try {
    const { data, error: insertErr } = await supabase
      .from('cimb_messages')
      .insert({
        id: msgPayload.id,
        conversation_id: msgPayload.conversation_id,
        sender_type: msgPayload.sender_type,
        sender_phone: msgPayload.sender_phone,
        message: msgPayload.message,
        message_type: 'text',
        is_read: false,
        created_at: msgPayload.created_at,
      })
      .select()
      .single();

    if (!insertErr && data) {
      // Update parent livechat last_message_at
      void supabase
        .from('cimb_livechat')
        .update({
          last_message_at: now,
          updated_at: now,
        })
        .eq('id', params.conversationId);

      return { message: data as CimbMessage };
    }

    const isPolicyViolation =
      insertErr?.code === '42501' || insertErr?.message?.includes('row-level security');

    return {
      message: msgPayload,
      error: insertErr?.message || null,
      needsPolicyRun: Boolean(isPolicyViolation),
    };
  } catch (err: any) {
    return {
      message: msgPayload,
      error: err?.message || 'Ralat penghantaran mesej.',
    };
  }
}

/**
 * Subscribe in Realtime to WebSocket changes for a specific conversation in `cimb_messages`
 */
export function subscribeLiveChatMessages(
  conversationId: string,
  callbacks: {
    onNewMessage: (msg: CimbMessage) => void;
    onMessageUpdate?: (msg: CimbMessage) => void;
    onStatusChange?: (status: string) => void;
  }
): () => void {
  const supabase = getSupabaseClient();
  // Generate a strictly unique channel name per subscription instance to avoid
  // Supabase "cannot add 'postgres_changes' callbacks for ... after 'subscribe()'" error
  const uniqueToken = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const channelName = `realtime_cimb_messages_${conversationId}_${uniqueToken}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'cimb_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        if (payload?.new) {
          const newMsg = payload.new as CimbMessage;
          callbacks.onNewMessage(newMsg);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'cimb_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        if (payload?.new && callbacks.onMessageUpdate) {
          callbacks.onMessageUpdate(payload.new as CimbMessage);
        }
      }
    )
    .subscribe((status: string) => {
      callbacks.onStatusChange?.(status);
    });

  return () => {
    try {
      void supabase.removeChannel(channel);
    } catch (err) {
      console.warn('[LiveChat] Error removing message channel:', err);
    }
  };
}

/**
 * Subscribe to all livechats and messages across table `cimb_livechat` (used by Admin)
 */
export function subscribeAllLiveChats(callbacks: {
  onLivechatChange: (payload: any) => void;
  onNewMessage: (msg: CimbMessage) => void;
  onStatusChange?: (status: string) => void;
}): () => void {
  const supabase = getSupabaseClient();
  const uniqueToken = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const channelName = `admin_livechat_global_${uniqueToken}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cimb_livechat',
      },
      (payload: any) => {
        callbacks.onLivechatChange(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'cimb_messages',
      },
      (payload: any) => {
        if (payload?.new) {
          callbacks.onNewMessage(payload.new as CimbMessage);
        }
      }
    )
    .subscribe((status: string) => {
      callbacks.onStatusChange?.(status);
    });

  return () => {
    try {
      void supabase.removeChannel(channel);
    } catch (err) {
      console.warn('[LiveChat] Error removing admin channel:', err);
    }
  };
}

/**
 * Fetch all livechats with metadata for Admin
 */
export async function fetchAllLiveChats(): Promise<
  Array<CimbLivechat & { last_message?: string; unread_count?: number }>
> {
  const supabase = getSupabaseClient();

  try {
    const { data: chatList, error } = await supabase
      .from('cimb_livechat')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error || !Array.isArray(chatList)) {
      console.warn('[LiveChat] fetchAllLiveChats error:', error);
      return getLocalChats();
    }

    // Enhance with latest messages
    const enhanced = await Promise.all(
      (chatList as CimbLivechat[]).map(async (chat) => {
        try {
          const { data: msgs } = await supabase
            .from('cimb_messages')
            .select('*')
            .eq('conversation_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMsg = msgs && msgs.length > 0 ? msgs[0] : null;

          // Count unread messages from user
          const { count } = await supabase
            .from('cimb_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', chat.id)
            .eq('sender_type', 'user')
            .eq('is_read', false);

          return {
            ...chat,
            last_message: lastMsg ? lastMsg.message : undefined,
            unread_count: count || 0,
          };
        } catch {
          return {
            ...chat,
            unread_count: 0,
          };
        }
      })
    );

    saveLocalChats(enhanced);
    return enhanced;
  } catch (err) {
    console.error('[LiveChat] Failed to fetch all livechats:', err);
    return getLocalChats();
  }
}

/**
 * Mark messages in a conversation as read
 */
export async function markChatMessagesRead(
  conversationId: string,
  readerType: 'user' | 'agent' | 'admin'
): Promise<void> {
  const supabase = getSupabaseClient();
  try {
    const query = supabase
      .from('cimb_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

    if (readerType === 'agent' || readerType === 'admin') {
      // Mark messages from user as read
      await query.eq('sender_type', 'user');
    } else {
      // Mark messages from admin as read
      await query.in('sender_type', ['admin', 'agent', 'bot']);
    }
  } catch (err) {
    console.warn('[LiveChat] markChatMessagesRead error:', err);
  }
}

/**
 * Update livechat status ('open' | 'closed')
 */
export async function updateLiveChatStatus(
  conversationId: string,
  status: 'open' | 'closed' | 'active'
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const dbStatus = status === 'active' ? 'open' : status;
  try {
    const { error } = await supabase
      .from('cimb_livechat')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Get active/open livechat for userPhone without creating a new record
 */
export async function getActiveLiveChatForUser(userPhone: string): Promise<CimbLivechat | null> {
  const cleanPhone = String(userPhone || '').trim();
  if (!cleanPhone) return null;
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('cimb_livechat')
      .select('*')
      .eq('user_phone', cleanPhone)
      .in('status', ['open', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as CimbLivechat;
  } catch {
    return null;
  }
}

/**
 * Get count of unread messages sent by admin for a customer
 */
export async function getUnreadUserMessagesCount(userPhone: string): Promise<{
  conversationId: string | null;
  unreadCount: number;
}> {
  const cleanPhone = String(userPhone || '').trim();
  if (!cleanPhone) return { conversationId: null, unreadCount: 0 };
  const supabase = getSupabaseClient();

  try {
    const activeChat = await getActiveLiveChatForUser(cleanPhone);
    if (!activeChat) return { conversationId: null, unreadCount: 0 };

    const { count, error } = await supabase
      .from('cimb_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', activeChat.id)
      .eq('is_read', false)
      .neq('sender_type', 'user');

    if (error) {
      return { conversationId: activeChat.id, unreadCount: 0 };
    }

    return { conversationId: activeChat.id, unreadCount: count || 0 };
  } catch {
    return { conversationId: null, unreadCount: 0 };
  }
}

