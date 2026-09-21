import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Banknote, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLiveChat } from '../../context/LiveChatContext';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { isLiveChatOpen, unreadCount, openLiveChat } = useLiveChat();
  const activeLoan = user?.loan_is_active;

  return (
    <nav className="w-full h-[72px] bg-[#FFFFFF] border-t border-[#E4E5E8] px-3 shrink-0 shadow-sm z-20 flex items-center">
      <div className="w-full flex items-center justify-around">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-[12px] transition-all duration-200 ${
              isActive
                ? 'text-[#E31B23] font-bold'
                : 'text-[#686B73] hover:text-[#17181B] font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-[12px] transition-colors ${isActive ? 'bg-[#FDEBEC] text-[#E31B23]' : ''}`}>
                <Home className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-semibold">Utama</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/loan"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-[12px] transition-all duration-200 relative ${
              isActive
                ? 'text-[#E31B23] font-bold'
                : 'text-[#686B73] hover:text-[#17181B] font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-[12px] transition-colors ${isActive ? 'bg-[#FDEBEC] text-[#E31B23]' : ''}`}>
                <Banknote className="w-5 h-5" />
                {activeLoan && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#16834B] ring-2 ring-white" />
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-semibold">Pinjaman</span>
            </>
          )}
        </NavLink>

        <button
          type="button"
          id="bottom-nav-livechat-btn"
          onClick={openLiveChat}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-[12px] transition-all duration-200 cursor-pointer ${
            isLiveChatOpen
              ? 'text-[#E31B23] font-bold'
              : 'text-[#686B73] hover:text-[#17181B] font-medium'
          }`}
          aria-label="Buka Live Chat"
        >
          <div className={`p-1.5 rounded-[12px] transition-colors relative ${isLiveChatOpen ? 'bg-[#FDEBEC] text-[#E31B23]' : ''}`}>
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#E31B23] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white animate-bounce shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#16834B] ring-2 ring-white" />
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-semibold">Live Chat</span>
        </button>
      </div>
    </nav>
  );
};

