import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getActiveLiveChatForUser,
  getUnreadUserMessagesCount,
  subscribeLiveChatMessages,
  markChatMessagesRead,
  CimbMessage,
} from '../lib/livechatRealtime';
import { playIncomingMessageSound } from '../lib/notificationAudio';
import { showIncomingNotification } from '../lib/pushNotifications';
import { LiveChatModal } from '../components/chat/LiveChatModal';

interface LiveChatContextType {
  isLiveChatOpen: boolean;
  unreadCount: number;
  openLiveChat: () => void;
  closeLiveChat: () => void;
  resetUnreadCount: () => void;
}

const LiveChatContext = createContext<LiveChatContextType | undefined>(undefined);

export const LiveChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isLiveChatOpenRef = useRef(false);
  isLiveChatOpenRef.current = isLiveChatOpen;

  const currentConvIdRef = useRef<string | null>(null);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
    if (currentConvIdRef.current) {
      void markChatMessagesRead(currentConvIdRef.current, 'user');
    }
  }, []);

  const openLiveChat = useCallback(() => {
    setIsLiveChatOpen(true);
    resetUnreadCount();
  }, [resetUnreadCount]);

  const closeLiveChat = useCallback(() => {
    setIsLiveChatOpen(false);
  }, []);

  // Sync unread messages and background Realtime WebSocket listener
  useEffect(() => {
    if (!user?.phone || user.role === 'admin') {
      setUnreadCount(0);
      currentConvIdRef.current = null;
      return;
    }

    let isMounted = true;
    let unsubscribeWs: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const { conversationId, unreadCount: count } = await getUnreadUserMessagesCount(user.phone);
        if (!isMounted) return;

        currentConvIdRef.current = conversationId;
        if (!isLiveChatOpenRef.current) {
          setUnreadCount(count);
        }

        if (conversationId) {
          unsubscribeWs = subscribeLiveChatMessages(conversationId, {
            onNewMessage: (newMsg: CimbMessage) => {
              if (newMsg.sender_type !== 'user') {
                if (!isLiveChatOpenRef.current) {
                  setUnreadCount((prev) => prev + 1);
                  void playIncomingMessageSound();
                  void showIncomingNotification('CIMB Live Chat: Jawapan Pegawai', newMsg.message);
                } else {
                  void markChatMessagesRead(conversationId, 'user');
                }
              }
            },
          });
        }
      } catch (err) {
        console.warn('[LiveChatContext] Sync error:', err);
      }
    };

    void setupListener();

    return () => {
      isMounted = false;
      if (unsubscribeWs) {
        unsubscribeWs();
      }
    };
  }, [user?.phone, user?.role]);

  return (
    <LiveChatContext.Provider
      value={{
        isLiveChatOpen,
        unreadCount,
        openLiveChat,
        closeLiveChat,
        resetUnreadCount,
      }}
    >
      {children}
      {user?.role !== 'admin' && (
        <LiveChatModal isOpen={isLiveChatOpen} onClose={closeLiveChat} />
      )}
    </LiveChatContext.Provider>
  );
};

export const useLiveChat = (): LiveChatContextType => {
  const context = useContext(LiveChatContext);
  if (!context) {
    throw new Error('useLiveChat must be used within a LiveChatProvider');
  }
  return context;
};
