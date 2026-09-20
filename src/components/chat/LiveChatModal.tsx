import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Headphones,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Check,
  CheckCheck,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Radio,
  AlertCircle,
  Loader2,
  User,
  Bot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatMYR } from '../../config/loan';
import {
  CimbLivechat,
  CimbMessage,
  getOrCreateLiveChat,
  fetchChatMessages,
  sendChatMessage,
  subscribeLiveChatMessages,
  markChatMessagesRead,
} from '../../lib/livechatRealtime';
import {
  enableNotificationAudio,
  playIncomingMessageSound,
} from '../../lib/notificationAudio';
import {
  enablePushNotifications,
  showIncomingNotification,
} from '../../lib/pushNotifications';

interface LiveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveChatModal: React.FC<LiveChatModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [livechat, setLivechat] = useState<CimbLivechat | null>(null);
  const [messages, setMessages] = useState<CimbMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CONNECTING' | 'CLOSED'>('CONNECTING');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [rlsNotice, setRlsNotice] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  // Check push notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Format message time
  const formatMsgTime = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Auto-scroll on messages change
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages, isOpen, scrollToBottom]);

  // Load or create conversation session
  const initChatSession = useCallback(async () => {
    if (!user?.phone) return;
    setIsLoading(true);

    try {
      const { chat, needsPolicyRun } = await getOrCreateLiveChat(user.phone);
      setLivechat(chat);
      activeConversationIdRef.current = chat.id;

      if (needsPolicyRun) {
        setRlsNotice(true);
      }

      // Fetch message history
      const history = await fetchChatMessages(chat.id);
      if (history.length === 0) {
        // Initial welcome message from bot
        const welcomeText = `Hai ${user?.name ? user.name.split(' ')[0] : 'pelanggan'}! Selamat datang ke Khidmat Pelanggan Live Chat CIMB Cash Plus (Realtime WebSocket). Ada sebarang soalan tentang pinjaman, baki atau bayaran bil yang boleh kami bantu?`;
        const res = await sendChatMessage({
          conversationId: chat.id,
          senderType: 'admin',
          senderPhone: 'CIMB_BOT',
          message: welcomeText,
        });
        setMessages([res.message]);
      } else {
        setMessages(history);
      }

      // Mark messages read by user
      void markChatMessagesRead(chat.id, 'user');
    } catch (err) {
      console.error('[LiveChatModal] Init error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.phone, user?.name]);

  // Subscribe to Realtime WebSocket when livechat is ready
  useEffect(() => {
    if (!isOpen || !livechat?.id) return;

    const convId = livechat.id;
    activeConversationIdRef.current = convId;

    const unsubscribe = subscribeLiveChatMessages(convId, {
      onNewMessage: (newMsg) => {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
          }
          return [...prev, newMsg];
        });

        // If message is from agent, admin, or bot, play audio notification
        if (newMsg.sender_type !== 'user') {
          if (audioEnabled) {
            void playIncomingMessageSound();
          }
          if (pushEnabled && document.hidden) {
            void showIncomingNotification(
              'CIMB Live Chat: Mesej Baru',
              newMsg.message
            );
          }
          void markChatMessagesRead(convId, 'user');
        }
      },
      onMessageUpdate: (updatedMsg) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      },
      onStatusChange: (status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('SUBSCRIBED');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('CLOSED');
        } else {
          setRealtimeStatus('CONNECTING');
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, livechat?.id, audioEnabled, pushEnabled]);

  // Trigger init when modal opens
  useEffect(() => {
    if (isOpen) {
      void initChatSession();
    }
  }, [isOpen, initChatSession]);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: 'Status Pinjaman', query: 'Bagaimanakah status pinjaman saya sekarang?' },
    { label: 'Baki Akaun', query: 'Berapakah baki akaun pinjaman saya?' },
    { label: 'Cara Bayar Bil', query: 'Bagaimana cara membuat pembayaran bil ansuran?' },
    { label: 'Pengeluaran Tunai', query: 'Bagaimana cara pengeluaran baki ke akaun bank?' },
  ];

  const generateSmartReply = (userQuery: string): string => {
    const q = userQuery.toLowerCase();

    if (q.includes('status') || q.includes('pinjaman') || q.includes('loan')) {
      const status = user?.loan_status;
      const amount = user?.loan_amount || 0;
      if (status === 'Approved') {
        return `Status pembiayaan anda: DILULUSKAN (Approved) bernilai ${formatMYR(amount)}. Baki aktif tersedia untuk pengeluaran terus ke akaun bank anda.`;
      } else if (status === 'Under Review') {
        return `Permohonan pinjaman bernilai ${formatMYR(amount)} sedang DISEMAK oleh pegawai kredit CIMB. Keputusan rasmi akan dikemaskini dalam masa terdekat.`;
      } else if (status === 'Rejected') {
        return `Permohonan pinjaman anda tidak diluluskan pada masa ini. Sila hubungi khidmat pelanggan untuk pertanyaan lanjut.`;
      }
      return `Tiada rekod pinjaman aktif dikesan. Anda boleh memohon pembiayaan baru di menu 'Pinjaman'.`;
    }

    if (q.includes('baki') || q.includes('balance')) {
      return `Baki semasa akaun CIMB Cash Plus anda ialah ${formatMYR(user?.balance || 0)}. Anda boleh membuat pengeluaran melalui menu 'Keluarkan' pada bila-bila masa.`;
    }

    if (q.includes('bayar') || q.includes('bil') || q.includes('ansuran')) {
      return `Pembayaran bil ansuran boleh dibuat melalui DuitNow QR atau Pindahan Bank (Instant Transfer). Sila buka tab Utama > Tagihan Ansuran Aktif untuk melihat bil sedia ada.`;
    }

    if (q.includes('keluar') || q.includes('withdraw') || q.includes('pengeluaran')) {
      return `Untuk membuat pengeluaran:\n1. Pastikan maklumat akaun bank sah.\n2. Tetapkan 6-digit PIN keselamatan.\n3. Tekan menu 'Keluarkan' di bawah dan masukkan jumlah yang dikehendaki.`;
    }

    return `Terima kasih. Mesej anda telah direkodkan dalam sistem Realtime CIMB. Pegawai Khidmat Pelanggan kami akan membalas mesej anda sebentar lagi.`;
  };

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputMessage).trim();
    if (!text || isSending || !livechat) return;

    setIsSending(true);
    if (!customText) setInputMessage('');

    try {
      const userPhone = user?.phone || 'ANONYMOUS';
      const result = await sendChatMessage({
        conversationId: livechat.id,
        senderType: 'user',
        senderPhone: userPhone,
        message: text,
      });

      if (result.needsPolicyRun) {
        setRlsNotice(true);
      }

      // Add to state immediately (optimistic)
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.message.id)) return prev;
        return [...prev, result.message];
      });

      scrollToBottom(true);

      // If user asks a quick question or standard query, provide instant intelligent response
      // after brief delay if no admin responds
      const lower = text.toLowerCase();
      const isCommonQuery =
        lower.includes('status') ||
        lower.includes('baki') ||
        lower.includes('bayar') ||
        lower.includes('bil') ||
        lower.includes('keluar') ||
        lower.includes('ansuran');

      if (isCommonQuery) {
        setTimeout(async () => {
          const replyText = generateSmartReply(text);
          const botResult = await sendChatMessage({
            conversationId: livechat.id,
            senderType: 'admin',
            senderPhone: 'CIMB_BOT',
            message: replyText,
          });
          setMessages((prev) => {
            if (prev.some((m) => m.id === botResult.message.id)) return prev;
            return [...prev, botResult.message];
          });
          if (audioEnabled) {
            void playIncomingMessageSound();
          }
        }, 1200);
      }
    } catch (err) {
      console.error('[LiveChat] Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleAudio = async () => {
    if (!audioEnabled) {
      await enableNotificationAudio();
      setAudioEnabled(true);
    } else {
      setAudioEnabled(false);
    }
  };

  const handleTogglePush = async () => {
    if (!pushEnabled) {
      try {
        await enablePushNotifications();
        setPushEnabled(true);
      } catch {
        // permission denied
      }
    } else {
      setPushEnabled(false);
    }
  };

  const handleResetChat = async () => {
    if (!user?.phone) return;
    setIsLoading(true);
    try {
      // Create fresh conversation
      const { chat } = await getOrCreateLiveChat(user.phone);
      setLivechat(chat);
      const welcomeText = `Perbualan telah dimulakan semula. Ada apa-apa lagi yang boleh saya bantu, ${user?.name ? user.name.split(' ')[0] : 'Tuan/Puan'}?`;
      const res = await sendChatMessage({
        conversationId: chat.id,
        senderType: 'admin',
        senderPhone: 'CIMB_BOT',
        message: welcomeText,
      });
      setMessages([res.message]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#F7F7F8] animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Top Header */}
      <header className="w-full h-[60px] bg-gradient-to-r from-[#E31B23] to-[#B5121B] text-white px-3.5 shrink-0 shadow-md flex items-center justify-between border-b border-red-900/20">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-xs">
              <Headphones className="w-5 h-5 text-[#E31B23]" />
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#E31B23] ${
                realtimeStatus === 'SUBSCRIBED'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h2 className="font-bold text-sm tracking-tight text-white truncate">
                CIMB Live Chat
              </h2>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-black/30 text-white/95 shrink-0">
                Realtime WS
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/90 truncate">
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  realtimeStatus === 'SUBSCRIBED'
                    ? 'bg-emerald-300'
                    : 'bg-amber-300 animate-ping'
                }`}
              />
              <span className="truncate">
                {realtimeStatus === 'SUBSCRIBED'
                  ? 'Pegawai Kredit & AI Aktif'
                  : 'Menyambung ke Realtime...'}
              </span>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleAudio}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              audioEnabled
                ? 'text-white hover:bg-white/15'
                : 'text-white/50 hover:bg-white/10'
            }`}
            title={audioEnabled ? 'Matikan Bunyi Mesej' : 'Hidupkan Bunyi Mesej'}
            aria-label="Toggle Audio"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleTogglePush}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              pushEnabled
                ? 'text-white hover:bg-white/15'
                : 'text-white/50 hover:bg-white/10'
            }`}
            title={pushEnabled ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}
            aria-label="Toggle Notifikasi"
          >
            {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleResetChat}
            className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center"
            title="Mula Semula Sembang"
            aria-label="Mula Semula Sembang"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-white hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Tutup Live Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Security & Realtime Banner */}
      <div className="bg-[#FFF8E6] border-b border-[#F7E2A8] px-3.5 py-1.5 flex items-center justify-between text-[11px] text-[#8C6200] shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-[#B57C00] shrink-0" />
          <span className="truncate">Sesi disulitkan & bersambung terus ke cimb_messages realtime.</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700">Live</span>
        </div>
      </div>

      {/* RLS schema policy notice if needed */}
      {rlsNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-start justify-between text-xs text-amber-900 gap-2 shrink-0">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[11px]">Nota Sambungan Supabase:</p>
              <p className="text-[10px] text-amber-800 leading-tight">
                Mesej disimpan secara selamat. Jika pangkalan data memerlukan kelulusan RLS, pastikan polisi dalam <code>supabase/schema.sql</code> telah dijalankan di Supabase SQL Editor.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRlsNotice(false)}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold shrink-0 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2">
            <Loader2 className="w-6 h-6 text-[#E31B23] animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Memuatkan perbualan realtime...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Tiada mesej lagi. Sila hantar pertanyaan anda di bawah.
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender_type === 'user';
            const isBot = msg.sender_phone === 'CIMB_BOT' || msg.sender_phone === 'SYSTEM_BOT';
            const isAgent = !isUser && !isBot;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
              >
                {/* Sender badge for non-user */}
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs ${
                        isAgent ? 'bg-emerald-600' : 'bg-[#E31B23]'
                      }`}
                    >
                      {isAgent ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">
                      {isAgent ? 'Pegawai Khidmat Pelanggan CIMB' : 'Pembantu Pintar CIMB'}
                    </span>
                  </div>
                )}

                <div className="flex items-end gap-1.5 max-w-[85%]">
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-[#E31B23] text-white rounded-br-xs font-medium'
                        : isAgent
                        ? 'bg-emerald-50 text-slate-800 border border-emerald-200 rounded-bl-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line break-words">{msg.message}</div>
                  </div>
                </div>

                {/* Meta info: timestamp & read receipt */}
                <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400 font-mono">
                  <span>{formatMsgTime(msg.created_at)}</span>
                  {isUser && (
                    <span title={msg.is_read ? 'Telah Dibaca' : 'Dihantar'}>
                      {msg.is_read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400 inline" />
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

      {/* Quick Prompts */}
      <div className="px-3 py-2 bg-white/95 border-t border-slate-200 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" /> Pintasan:
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(p.query)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#FDEBEC] hover:text-[#E31B23] active:scale-95 text-slate-700 whitespace-nowrap transition-colors border border-slate-200 shrink-0 cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Bar */}
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
            id="livechat-message-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Taip mesej realtime di sini..."
            disabled={isSending}
            className="flex-1 py-2.5 px-4 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-[#E31B23] disabled:opacity-50"
          />
          <button
            type="submit"
            id="livechat-send-btn"
            disabled={!inputMessage.trim() || isSending}
            className="w-10 h-10 rounded-full bg-[#E31B23] hover:bg-[#B5121B] active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
            aria-label="Hantar Mesej"
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
  );
};
