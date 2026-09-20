import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { UserRound, MessageCircle, Headphones } from 'lucide-react';

export const AdminBottomNav: React.FC = () => {
  const location = useLocation();

  const isUserActive =
    location.pathname === '/admin' || location.pathname.startsWith('/admin/user');
  const isLiveChatActive = location.pathname.startsWith('/admin/livechat');
  const isWhatsAppActive = location.pathname.startsWith('/admin/whatsapp');

  return (
    <nav
      id="admin-bottom-nav"
      aria-label="Navigasi Pentadbir"
      className="w-full h-[72px] bg-[#FFFFFF] border-t border-[#E4E5E8] px-4 shrink-0 shadow-sm z-20 flex items-center"
    >
      <div className="w-full flex items-center justify-around max-w-sm mx-auto">
        <NavLink
          id="admin-nav-user"
          to="/admin"
          end
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-[12px] transition-all duration-200 ${
            isUserActive
              ? 'text-[#E31B23] font-bold'
              : 'text-[#686B73] hover:text-[#17181B] font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-[12px] transition-colors ${
              isUserActive ? 'bg-[#FDEBEC] text-[#E31B23]' : ''
            }`}
          >
            <UserRound className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-semibold">User</span>
        </NavLink>

        <NavLink
          id="admin-nav-livechat"
          to="/admin/livechat"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-[12px] transition-all duration-200 relative ${
            isLiveChatActive
              ? 'text-[#E31B23] font-bold'
              : 'text-[#686B73] hover:text-[#17181B] font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-[12px] transition-colors relative ${
              isLiveChatActive ? 'bg-[#FDEBEC] text-[#E31B23]' : ''
            }`}
          >
            <Headphones className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-semibold">Live Chat</span>
        </NavLink>

        <NavLink
          id="admin-nav-whatsapp"
          to="/admin/whatsapp"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-[12px] transition-all duration-200 ${
            isWhatsAppActive
              ? 'text-[#E31B23] font-bold'
              : 'text-[#686B73] hover:text-[#17181B] font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-[12px] transition-colors ${
              isWhatsAppActive ? 'bg-[#FDEBEC] text-[#E31B23]' : ''
            }`}
          >
            <MessageCircle className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-semibold">WhatsApp</span>
        </NavLink>
      </div>
    </nav>
  );
};

