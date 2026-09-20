import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabase';
import { subscribeWaAndariasRealtime, type WaAndariasRow as RealtimeWaAndariasRow } from '../lib/waAndariasRealtime';
import { enableNotificationAudio, playIncomingMessageSound } from '../lib/notificationAudio';
import { enablePushNotifications, showIncomingNotification } from '../lib/pushNotifications';
import { ArrowLeft, Search, MessageCircle, RefreshCw, UserRound, Bot, Clock3, X, Bell, BellOff, Plus } from 'lucide-react';
import { AdminBottomNav } from '../components/layout/AdminBottomNav';
import { BottomActionBar } from '../components/whatsapp/BottomActionBar';

type WaAndariasRow = Pick<RealtimeWaAndariasRow, 'wa_message_id' | 'first_name' | 'chat_id' | 'subscriber_id' | 'agent_name' | 'user_message' | 'message_status' | 'status_time' | 'created_at' | 'role'>;

function getMessageText(value: unknown) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return 'WhatsApp message';
  const object = value as Record<string, unknown>;
  for (const key of ['text', 'message', 'body', 'content']) {
    if (typeof object[key] === 'string') return object[key] as string;
  }
  return 'WhatsApp message';
}

function formatTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ms-MY', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatConversationTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ms-MY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const WhatsAppPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<WaAndariasRow[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedChatId, setSelectedChatId] = React.useState<string | null>(null);
  const [showNewChatDialog, setShowNewChatDialog] = React.useState(false);
  const [newChatPhone, setNewChatPhone] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
  const [notificationBusy, setNotificationBusy] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setNotificationsEnabled(typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
  }, []);

  const enableNotifications = React.useCallback(async () => {
    setNotificationBusy(true);
    setError(null);
    try {
      await enableNotificationAudio();
      await enablePushNotifications();
      setNotificationsEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
    } finally {
      setNotificationBusy(false);
    }
  }, []);

  const loadMessages = React.useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error: queryError } = await supabase
        .from('wa_andarias')
        .select('wa_message_id, first_name, chat_id, subscriber_id, agent_name, user_message, message_status, status_time, created_at, role')
        .order('created_at', { ascending: false })
        .limit(100);
      if (queryError) throw queryError;
      setRows((data || []) as WaAndariasRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load WhatsApp messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      await loadMessages();
      if (!active) return;
      try {
        unsubscribe = await subscribeWaAndariasRealtime(
          (row) => {
            if (row.role !== 'admin') {
              const message = getMessageText(row.user_message);
              void playIncomingMessageSound();
              void showIncomingNotification(
                row.first_name ? `WhatsApp · ${row.first_name}` : 'WhatsApp baru',
                message,
                { chat_id: row.chat_id, wa_message_id: row.wa_message_id },
              );
            }
            setRows((current) => [row as WaAndariasRow, ...current.filter((item) => item.wa_message_id !== row.wa_message_id)].slice(0, 100));
          },
          (row) => {
            setRows((current) => {
              const exists = current.some((item) => item.wa_message_id === row.wa_message_id);
              const next = current.map((item) => item.wa_message_id === row.wa_message_id ? row as WaAndariasRow : item);
              return exists ? next : [row as WaAndariasRow, ...current].slice(0, 100);
            });
          },
        );
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to connect WhatsApp realtime');
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [loadMessages]);

  const conversations = React.useMemo(() => {
    const groups = new Map<string, WaAndariasRow[]>();

    for (const row of rows) {
      const key = row.chat_id || row.subscriber_id || row.wa_message_id;
      const current = groups.get(key) || [];
      current.push(row);
      groups.set(key, current);
    }

    return Array.from(groups.entries())
      .map(([chatId, messages]) => {
        const ordered = [...messages].sort((a, b) => {
          const aTime = new Date(a.created_at || a.status_time || 0).getTime();
          const bTime = new Date(b.created_at || b.status_time || 0).getTime();
          return bTime - aTime;
        });
        const latest = ordered[0];
        return {
          chatId,
          messages: ordered,
          latest,
          name: latest.first_name || latest.chat_id || latest.subscriber_id || 'Unknown customer',
        };
      })
      .filter((conversation) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [
          conversation.name,
          conversation.chatId,
          conversation.latest.subscriber_id,
          conversation.latest.agent_name,
          conversation.latest.message_status,
          getMessageText(conversation.latest.user_message),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const aTime = new Date(a.latest.created_at || a.latest.status_time || 0).getTime();
        const bTime = new Date(b.latest.created_at || b.latest.status_time || 0).getTime();
        return bTime - aTime;
      });
  }, [rows, search]);

  const selectedConversation = React.useMemo(() => {
    if (!selectedChatId) return null;
    const found = conversations.find((conversation) => conversation.chatId === selectedChatId);
    if (found) return found;
    return {
      chatId: selectedChatId,
      messages: [],
      latest: {
        wa_message_id: `temp-${selectedChatId}`,
        first_name: null,
        chat_id: selectedChatId,
        subscriber_id: selectedChatId,
        agent_name: null,
        user_message: '',
        message_status: null,
        status_time: null,
        created_at: new Date().toISOString(),
        role: 'admin' as const,
      },
      name: `+${selectedChatId}`,
    };
  }, [conversations, selectedChatId]);

  const selectedMessages = React.useMemo(() => {
    if (!selectedChatId) return [];
    return rows
      .filter((row) => (row.chat_id || row.subscriber_id || row.wa_message_id) === selectedChatId)
      .sort((a, b) => {
        const aTime = new Date(a.created_at || a.status_time || 0).getTime();
        const bTime = new Date(b.created_at || b.status_time || 0).getTime();
        return aTime - bTime;
      });
  }, [rows, selectedChatId]);

  const handleMessageSent = React.useCallback(
    (messageText: string, phone: string) => {
      const optimisticRow: WaAndariasRow = {
        wa_message_id: `temp-${Date.now()}`,
        first_name: selectedConversation?.name || null,
        chat_id: phone,
        subscriber_id: `${phone}-460498`,
        agent_name: 'Admin',
        user_message: messageText,
        message_status: 'sent',
        status_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
        role: 'admin',
      };
      setRows((current) => [optimisticRow, ...current]);
    },
    [selectedConversation],
  );

  React.useEffect(() => {
    if (selectedChatId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChatId, selectedMessages.length]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F7F8FA]">
      {selectedConversation ? (
        <>
          <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedChatId(null)}
                aria-label="Back to conversations"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#17181A] shadow-sm transition hover:bg-slate-50 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#17181A]">{selectedConversation.name}</p>
                <p className="truncate text-[11px] text-slate-500">{selectedConversation.chatId}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                aria-label="Close WhatsApp"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#17181A] shadow-sm transition hover:bg-slate-50 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <div className="mx-auto flex max-w-xl flex-col gap-2">
              {selectedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <MessageCircle className="mb-2 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">Mulakan perbualan WhatsApp</p>
                  <p className="mt-1 max-w-xs text-xs text-slate-400">Hantar mesej pertama kepada penerima menggunakan bar di bawah.</p>
                </div>
              ) : (
                selectedMessages.map((row) => {
                  const isAdmin = row.role === 'admin';
                  return (
                    <div key={row.wa_message_id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${isAdmin ? 'rounded-br-md bg-[#E31B23] text-white' : 'rounded-bl-md border border-slate-200 bg-white text-[#17181A]'}`}>
                        <p className="whitespace-pre-wrap break-words text-sm leading-5">{getMessageText(row.user_message)}</p>
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isAdmin ? 'text-white/70' : 'text-slate-400'}`}>
                          <span>{formatConversationTime(row.status_time || row.created_at)}</span>
                          {row.message_status && <span>• {row.message_status}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <BottomActionBar
            phoneNumber={selectedConversation.chatId}
            customerName={selectedConversation.name}
            onMessageSent={handleMessageSent}
          />
        </>
      ) : (
        <>
          <header className="shrink-0 border-b border-slate-200 bg-white px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#686B73]">Admin</p>
                <h1 className="mt-1 text-xl font-bold text-[#17181A]">WhatsApp</h1>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void enableNotifications()} disabled={notificationBusy} aria-label={notificationsEnabled ? "Notifications enabled" : "Enable notifications"} className={`flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-sm transition disabled:opacity-50 ${notificationsEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-[#17181A] hover:bg-slate-50"}`}><>{notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}</><span>{notificationBusy ? "..." : notificationsEnabled ? "Aktif" : "Notifikasi"}</span></button>
                <button type="button" onClick={() => void loadMessages(true)} disabled={refreshing} aria-label="Refresh WhatsApp conversations" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#17181A] shadow-sm disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button type="button" onClick={() => navigate('/admin')} aria-label="Close WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#17181A] shadow-sm transition hover:bg-slate-50 active:scale-95">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversation, customer, chat ID..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-[#F7F8FA] pl-10 pr-3 text-sm outline-none transition focus:border-[#E31B23] focus:bg-white"
                />
              </div>
              <button
                type="button"
                id="whatsapp-new-chat-btn"
                onClick={() => setShowNewChatDialog(true)}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[#E31B23] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c9181f] active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Mesej</span>
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-500">Loading conversations...</div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Unable to load conversations</p>
                <p className="mt-1 text-xs text-red-600">{error}</p>
                <button type="button" onClick={() => void loadMessages()} className="mt-3 rounded-lg bg-[#E31B23] px-3 py-2 text-xs font-semibold text-white">Try again</button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
                <MessageCircle className="h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No conversations</p>
                <p className="mt-1 text-xs text-slate-500">New conversations from wa_andarias will appear here in realtime.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.chatId}
                    type="button"
                    onClick={() => setSelectedChatId(conversation.chatId)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 active:scale-[0.995]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FCE8E9] text-[#E31B23]">
                        {conversation.latest.role === 'admin' ? <Bot className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-[#17181A]">{conversation.name}</h2>
                            <p className="truncate text-[11px] text-slate-500">{conversation.chatId}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                            <Clock3 className="h-3 w-3" />
                            {formatTime(conversation.latest.status_time || conversation.latest.created_at)}
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{getMessageText(conversation.latest.user_message)}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{conversation.messages.length} messages</span>
                          {conversation.latest.message_status && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{conversation.latest.message_status}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </main>
          <AdminBottomNav />
        </>
      )}

      {showNewChatDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#17181A]">Mesej WhatsApp Baharu</h3>
              <button
                type="button"
                onClick={() => setShowNewChatDialog(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = newChatPhone.replace(/\D/g, '');
                if (!clean) return;
                setSelectedChatId(clean);
                setShowNewChatDialog(false);
                setNewChatPhone('');
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nombor Telefon Penerima
                </label>
                <input
                  id="new-chat-phone-input"
                  type="tel"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="Contoh: 60123456789 atau 628123456789"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-[#F7F8FA] px-3 text-sm text-[#17181A] outline-none focus:border-[#E31B23] focus:bg-white"
                  autoFocus
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Sertakan kod negara tanpa simbol + (cth. 60 untuk Malaysia, 62 untuk Indonesia).
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatDialog(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  id="new-chat-submit-button"
                  type="submit"
                  disabled={!newChatPhone.trim()}
                  className="rounded-xl bg-[#E31B23] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c9181f] disabled:opacity-50"
                >
                  Buka Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
