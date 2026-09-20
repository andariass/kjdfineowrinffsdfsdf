import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LiveChatProvider } from './context/LiveChatContext';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { LoanPage } from './pages/LoanPage';
import { ProfilePage } from './pages/ProfilePage';
import { KYCPage } from './pages/KYCPage';
import { CompleteBankPage } from './pages/CompleteBankPage';
import { ApplyLoanPage } from './pages/ApplyLoanPage';
import { BillDetailPage } from './pages/BillDetailPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { SelectedUserPage } from './pages/SelectedUserPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { AdminLiveChatPage } from './pages/AdminLiveChatPage';
import { WithdrawPage } from './pages/WithdrawPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="flex flex-col items-center justify-center h-full w-full bg-white space-y-3"><div className="w-12 h-12 rounded-[12px] bg-[#E31B23] flex items-center justify-center shadow-md"><span className="font-extrabold text-white text-base tracking-tighter">CIMB</span></div><div className="w-5 h-5 border-2 border-[#E31B23]/20 border-t-[#E31B23] rounded-full animate-spin" /><span className="text-xs text-[#686B73] font-medium">Memuatkan sesi...</span></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AuthRoute: React.FC = () => {
  const { user, isLoading, isKycComplete } = useAuth();
  if (isLoading) {
    return <div className="flex flex-col items-center justify-center h-full w-full bg-white space-y-3"><div className="w-12 h-12 rounded-[12px] bg-[#E31B23] flex items-center justify-center shadow-md"><span className="font-extrabold text-white text-base tracking-tighter">CIMB</span></div><div className="w-5 h-5 border-2 border-[#E31B23]/20 border-t-[#E31B23] rounded-full animate-spin" /></div>;
  }
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (!isKycComplete()) return <Navigate to="/kyc" replace />;
    return <Navigate to="/loan" replace />;
  }
  return <AuthPage />;
};

export function AppContent() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/" element={<UserRoute><AppShell><HomePage /></AppShell></UserRoute>} />
      <Route path="/loan" element={<UserRoute><AppShell><LoanPage /></AppShell></UserRoute>} />
      <Route path="/profile" element={<UserRoute><AppShell><ProfilePage /></AppShell></UserRoute>} />
      <Route path="/kyc" element={<UserRoute><KYCPage /></UserRoute>} />
      <Route path="/bank/complete" element={<UserRoute><CompleteBankPage /></UserRoute>} />
      <Route path="/loan/apply" element={<UserRoute><ApplyLoanPage /></UserRoute>} />
      <Route path="/withdraw" element={<UserRoute><WithdrawPage /></UserRoute>} />
      <Route path="/bills/:billId" element={<UserRoute><BillDetailPage /></UserRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminPortalPage /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/user/:phone" element={<ProtectedRoute><AdminRoute><SelectedUserPage /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/livechat" element={<ProtectedRoute><AdminRoute><AdminLiveChatPage /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/whatsapp" element={<ProtectedRoute><AdminRoute><WhatsAppPage /></AdminRoute></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LiveChatProvider>
          <div className="flex justify-center items-center h-full w-full bg-slate-900/10 sm:p-2">
            <div className="flex flex-col w-full max-w-[500px] h-full mx-auto relative overflow-hidden bg-slate-50 sm:rounded-3xl sm:border sm:border-slate-300 shadow-2xl">
              <AppContent />
            </div>
          </div>
        </LiveChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
