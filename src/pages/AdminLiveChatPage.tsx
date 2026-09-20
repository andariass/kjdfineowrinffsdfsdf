import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminBottomNav } from '../components/layout/AdminBottomNav';
import {
  CimbLivechat,
  CimbMessage,
  fetchAllLiveChats,
  fetchChatMessages,
  sendChatMessage,
  subscribeAllLiveChats,
  subscribeLiveChatMessages,
  markChatMessagesRead,
  updateLiveChatStatus,
  getOrCreateLiveChat,
} from '../lib/livechatRealtime';
import {
  enableNotificationAudio,
  playIncomingMessageSound,
} from '../lib/notificationAudio';
import {
  Search,
  MessageCircle,
  RefreshCw,
  User,
  Bot,
  Send,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  Loader2,
  CheckCheck,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const AdminLiveChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetPhoneParam = searchParams.get('phone');
  const { user: adminUser } = useAuth();

  const [chats, setChats] = useState<
    Array<CimbLivechat & { last_message?: string; unread_count?: number }>
  >([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CimbMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTED' | 'CONNECTING'>('CONNECTING');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<string | null>(null);
  selectedChatRef.current = selectedChatId;

  // Selected chat object
  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) || null,
    [chats, selectedChatId]
  );

  const loadChats = useCallback(async () => {
    setIsLoadingChats(true);
    try {
      const data = await fetchAllLiveChats();
      setChats(data);

      // Auto-select if phone param matches
      if (targetPhoneParam && !selectedChatRef.current) {
        const matched = data.find((c) => c.user_phone === targetPhoneParam);
        if (matched) {
          setSelectedChatId(matched.id);
        } else {
          // Auto-initialize session in cimb_livechat for this target user
          const { chat } = await getOrCreateLiveChat(targetPhoneParam);
          if (chat) {
            setChats((prev) => [chat, ...prev.filter((c) => c.id !== chat.id)]);
            setSelectedChatId(chat.id);
          }
        }
      }
    } finally {
      setIsLoadingChats(false);
    }
  }, [targetPhoneParam]);

  // Load chat list on mount
  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  // Global realtime subscription for all live chats
  useEffect(() => {
    const unsubscribe = subscribeAllLiveChats({
      onLivechatChange: () => {
        void loadChats();
      },
      onNewMessage: (newMsg) => {
        // If message is for currently active chat, append it
        if (selectedChatRef.current === newMsg.conversation_id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_type === 'user') {
            void markChatMessagesRead(newMsg.conversation_id, 'agent');
          }
        }

        // Play audio chime on incoming customer message
        if (newMsg.sender_type === 'user') {
          if (audioEnabled) {
            void playIncomingMessageSound();
          }
        }

        // Refresh list previews
        void loadChats();
      },
      onStatusChange: (status) => {
        setRealtimeStatus(status === 'SUBSCRIBED' ? 'CONNECTED' : 'CONNECTING');
      },
    });

    return () => {
      unsubscribe();
    };
  }, [loadChats, audioEnabled]);

  // Load messages when selectedChatId changes
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    let active = true;
    setIsLoadingMessages(true);

    void fetchChatMessages(selectedChatId).then((history) => {
      if (active) {
        setMessages(history);
        setIsLoadingMessages(false);
        void markChatMessagesRead(selectedChatId, 'agent');
      }
    });

    // Subscribe to messages in this specific conversation
    const unsub = subscribeLiveChatMessages(selectedChatId, {
      onNewMessage: (newMsg) => {
        if (!active) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_type === 'user') {
          void markChatMessagesRead(selectedChatId, 'agent');
        }
      },
      onMessageUpdate: (updatedMsg) => {
        if (!active) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      },
    });

    return () => {
      active = false;
      unsub();
    };
  }, [selectedChatId]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filtered chats
  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      const isOpen = c.status === 'open' || c.status === 'active';
      if (statusFilter === 'open' && !isOpen) return false;
      if (statusFilter === 'closed' && isOpen) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPhone = c.user_phone.toLowerCase().includes(q);
        const matchesLast = (c.last_message || '').toLowerCase().includes(q);
        return matchesPhone || matchesLast;
      }
      return true;
    });
  }, [chats, statusFilter, searchQuery]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedChatId || isSending) return;

    setIsSending(true);
    if (!textToSend) setInputText('');

    try {
      const adminPhone = adminUser?.phone || 'ADMIN';
      const result = await sendChatMessage({
        conversationId: selectedChatId,
        senderType: 'admin',
        senderPhone: adminPhone,
        message: text,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === result.message.id)) return prev;
        return [...prev, result.message];
      });

      void loadChats();
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedChat) return;
    const isCurrentlyOpen = selectedChat.status === 'open' || selectedChat.status === 'active';
    const newStatus = isCurrentlyOpen ? 'closed' : 'open';
    await updateLiveChatStatus(selectedChat.id, newStatus);
    setChats((prev) =>
      prev.map((c) => (c.id === selectedChat.id ? { ...c, status: newStatus } : c))
    );
  };

  const handleToggleAudio = async () => {
    if (!audioEnabled) {
      await enableNotificationAudio();
      setAudioEnabled(true);
    } else {
      setAudioEnabled(false);
    }
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const cannedResponses = [
    'Terima kasih, permohonan pinjaman anda kini sedang diproses.',
    'Sila muat naik dokumen MyKad yang jelas untuk pengesahan KYC.',
    'Baki akaun anda telah disahkan dan sedia untuk pengeluaran.',
    'Sila semak rekod bil anda di tab Utama untuk pembayaran ansuran.',
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#F7F7F8] relative overflow-hidden">
      {/* Header */}
      <header className="w-full h-[56px] bg-gradient-to-r from-[#E31B23] to-[#B5121B] text-white px-4 shrink-0 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {selectedChatId ? (
            <button
              type="button"
              onClick={() => setSelectedChatId(null)}
              className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
              aria-label="Kembali ke senarai sembang"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-[8px] bg-white flex items-center justify-center shadow-xs">
              <span className="font-extrabold text-[#E31B23] text-xs">CIMB</span>
            </div>
          )}

          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-bold text-sm tracking-tight text-white">
                {selectedChatId ? `Live Chat: ${selectedChat?.user_phone}` : 'Live Chat Pentadbir'}
              </h1>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-black/30 text-white/95">
                Realtime
              </span>
            </div>
            <p className="text-[11px] text-white/80 flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  realtimeStatus === 'CONNECTED' ? 'bg-emerald-400' : 'bg-amber-300 animate-ping'
                }`}
              />
              <span>cimb_livechat & cimb_messages</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleToggleAudio}
            className="w-8 h-8 rounded-full text-white/90 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
            title={audioEnabled ? 'Bunyi Mesej Aktif' : 'Bunyi Mesej Dimatikan'}
            aria-label="Toggle Audio"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => void loadChats()}
            className="w-8 h-8 rounded-full text-white/90 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
            title="Segar Semula"
            aria-label="Segar Semula"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* VIEW 1: Chat List (when no chat is selected on mobile/compact view) */}
        {!selectedChatId ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search & Filter Toolbar */}
            <div className="p-3 bg-white border-b border-slate-200 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nombor telefon pelanggan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-[#E31B23]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(['all', 'open', 'closed'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab as any)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      statusFilter === tab
                        ? 'bg-[#E31B23] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'all' ? 'Semua' : tab === 'open' ? 'Aktif (Open)' : 'Selesai (Closed)'}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-slate-400 font-semibold">
                  {filteredChats.length} Sesi
                </span>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoadingChats ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-2">
                  <Loader2 className="w-6 h-6 text-[#E31B23] animate-spin" />
                  <span className="text-xs text-slate-500 font-medium">Memuatkan sesi live chat...</span>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Tiada Sesi Live Chat Dijumpai</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Apabila pelanggan memulakan Live Chat, perbualan akan dipaparkan di sini secara realtime.
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isOpen = chat.status === 'open' || chat.status === 'active';
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setSelectedChatId(chat.id)}
                      className="w-full p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-red-200 hover:shadow-xs active:scale-[0.99] transition-all text-left flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[#FDEBEC] text-[#E31B23] font-bold text-sm flex items-center justify-center border border-red-100">
                            {chat.user_phone.slice(-4)}
                          </div>
                          {isOpen && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {chat.user_phone}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                                isOpen
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isOpen ? 'Open' : 'Closed'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 truncate mt-0.5 max-w-[220px]">
                            {chat.last_message || 'Tiada mesej terkini'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1 shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatTime(chat.last_message_at || chat.created_at)}
                        </span>
                        {(chat.unread_count || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-[#E31B23] text-white text-[10px] font-bold rounded-full shadow-xs">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* VIEW 2: Active Chat Conversation */
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {/* Top Bar for Selected Chat */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 min-w-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (selectedChat?.status === 'open' || selectedChat?.status === 'active')
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {(selectedChat?.status === 'open' || selectedChat?.status === 'active')
                    ? 'Sesi Dibuka (Open)'
                    : 'Sesi Ditutup (Closed)'}
                </span>

                <button
                  type="button"
                  onClick={() => navigate(`/admin/user/${selectedChat?.user_phone}`)}
                  className="text-[11px] font-semibold text-[#E31B23] hover:underline flex items-center gap-1 truncate"
                  title="Buka profil pelanggan"
                >
                  <span>Profil & Pinjaman</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleStatus}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  (selectedChat?.status === 'open' || selectedChat?.status === 'active')
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {(selectedChat?.status === 'open' || selectedChat?.status === 'active')
                  ? 'Tutup Sesi (Close)'
                  : 'Buka Semula Sesi (Open)'}
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F7F8]">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-36">
                  <Loader2 className="w-5 h-5 text-[#E31B23] animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Tiada mesej dalam sesi ini.
                </div>
              ) : (
                messages.map((m) => {
                  const isBot = m.sender_type === 'admin' && (m.sender_phone === 'CIMB_BOT' || m.sender_phone === 'SYSTEM_BOT');
                  const isAgent = m.sender_type === 'admin' && !isBot;
                  const isCustomer = m.sender_type === 'user';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender label */}
                      <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">
                        {isAgent
                          ? 'Pegawai Khidmat Pelanggan (Anda)'
                          : isBot
                          ? 'Pembantu Pintar CIMB'
                          : `Pelanggan (${m.sender_phone || selectedChat?.user_phone})`}
                      </span>

                      <div className="flex items-end gap-1.5 max-w-[85%]">
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                            isAgent
                              ? 'bg-emerald-600 text-white rounded-br-xs font-medium'
                              : isBot
                              ? 'bg-slate-200 text-slate-800 rounded-bl-xs'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs font-medium'
                          }`}
                        >
                          <div className="whitespace-pre-line break-words">{m.message}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400 font-mono">
                        <span>{formatTime(m.created_at)}</span>
                        {isAgent && (
                          <span>
                            {m.is_read ? (
                              <CheckCheck className="w-3 h-3 text-blue-500 inline" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Canned Responses Bar */}
            <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Balas Pantas:
                </span>
                {cannedResponses.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSendMessage(res)}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                  >
                    {res.slice(0, 30)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Reply Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Taip jawapan kepada pelanggan..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isSending}
                  className="flex-1 py-2.5 px-4 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-emerald-600 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
                  aria-label="Hantar Jawapan"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Admin Bottom Navigation */}
      <AdminBottomNav />
    </div>
  );
};
