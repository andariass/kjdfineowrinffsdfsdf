import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { cimbApi } from '../api/cimbApi';
import { CimbUser, UserProfile } from '../types';
import { isKycVerified, isBankComplete as checkBankComplete } from '../utils/businessRules';
import { syncPushSubscriptionWithUser } from '../lib/pushNotifications';


interface AuthSession {
  phone: string;
  password: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: AuthSession | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  register: (name: string, phone: string, password: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  logout: () => void;
  refreshUser: () => Promise<UserProfile | null>;
  updateUserData: (data: Partial<Omit<CimbUser, 'phone' | 'created_at' | 'updated_at'>>) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  isKycComplete: (userToCheck?: UserProfile | null) => boolean;
  isBankComplete: (userToCheck?: UserProfile | null) => boolean;
}

const STORAGE_KEY = 'cimb_cashplus_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<AuthSession | null>(null);
  sessionRef.current = session;

  /**
   * Check if KYC is complete
   * Source of truth: verified state + verification timestamp
   */
  const isKycComplete = useCallback((userToCheck?: UserProfile | null): boolean => {
    return isKycVerified(userToCheck ?? user);
  }, [user]);

  /**
   * Check if Bank requirement is met
   */
  const isBankComplete = useCallback((userToCheck?: UserProfile | null): boolean => {
    return checkBankComplete(userToCheck ?? user);
  }, [user]);

  /**
   * Silent refresh user data from API as source of truth
   */
  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    const currentSession = sessionRef.current;
    if (!currentSession) return null;

    try {
      const res = await cimbApi.get(currentSession);
      if (res.success && res.data) {
        let freshUser: UserProfile;
        if (Array.isArray(res.data)) {
          const found = res.data.find((u: UserProfile) => u.phone === currentSession.phone);
          freshUser = found || res.data[0];
        } else {
          freshUser = res.data;
        }

        if (freshUser) {
          setUser((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(freshUser)) {
              return freshUser;
            }
            return prev;
          });
          return freshUser;
        }
      }
    } catch {
      // Ignore polling hiccups silently
    }
    return null;
  }, []);

  /**
   * Restore session from localStorage on startup
   */
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: AuthSession = JSON.parse(stored);
          if (parsed.phone && parsed.password) {
            setSession(parsed);
            const res = await cimbApi.get(parsed);
            if (res.success && res.data) {
              const freshUser = Array.isArray(res.data)
                ? (res.data.find((u: UserProfile) => u.phone === parsed.phone) || res.data[0])
                : res.data;
              if (freshUser) {
                setUser(freshUser);
                void syncPushSubscriptionWithUser(freshUser.phone);
              } else {
                localStorage.removeItem(STORAGE_KEY);
                setSession(null);
              }
            } else {
              localStorage.removeItem(STORAGE_KEY);
              setSession(null);
            }
          }
        }
      } catch (err: unknown) {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  /**
   * Realtime synchronization via Server-Sent Events (SSE).
   * The CIMB Edge Function owns the Realtime subscription and streams
   * only this user's sanitized record to the app.
   */
  useEffect(() => {
    if (!session?.phone || !session?.password) return;

    const controller = new AbortController();
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1000;

    const connect = async () => {
      try {
        await cimbApi.stream(
          { phone: session.phone, password: session.password },
          (freshUser, deleted) => {
            if (deleted || !freshUser) {
              setUser(null);
              return;
            }

            setUser((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(freshUser)) {
                return freshUser;
              }
              return prev;
            });
          },
          controller.signal
        );

        retryDelay = 1000;
      } catch {
        // Abort is expected during logout/unmount.
      } finally {
        if (!stopped && !controller.signal.aborted) {
          retryTimer = setTimeout(() => {
            void connect();
          }, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 10000);
        }
      }
    };

    void connect();

    return () => {
      stopped = true;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [session]);

  /**
   * Login action
   */
  const login = useCallback(async (phone: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await cimbApi.login({ phone, password });
      if (res.success && res.data) {
        const authUser = Array.isArray(res.data) ? res.data[0] : res.data;
        const newSession: AuthSession = { phone: phone.trim(), password };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        setUser(authUser);
        setIsLoading(false);
        void syncPushSubscriptionWithUser(authUser.phone || phone.trim());
        return { success: true, user: authUser };
      }

      const errMsg = (res as any).error || 'Nombor telefon atau kata laluan tidak sah';
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Ralat semasa log masuk';
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  }, []);

  /**
   * Register action
   */
  const register = useCallback(async (name: string, phone: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await cimbApi.register({
        name: name.trim(),
        phone: phone.trim(),
        password,
      });

      if (res.success && res.data) {
        const authUser = Array.isArray(res.data) ? res.data[0] : res.data;
        const newSession: AuthSession = { phone: phone.trim(), password };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        setUser(authUser);
        setIsLoading(false);
        void syncPushSubscriptionWithUser(authUser.phone || phone.trim());
        return { success: true, user: authUser };
      }

      const errMsg = (res as any).error || 'Gagal mendaftar akaun baru';
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Ralat semasa pendaftaran akaun';
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  }, []);

  /**
   * Logout action
   */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setUser(null);
    setError(null);
  }, []);

  /**
   * Update user data
   */
  const updateUserData = useCallback(async (data: Partial<Omit<CimbUser, 'phone' | 'created_at' | 'updated_at'>>) => {
    if (!session) {
      return { success: false, error: 'Sesi pengguna tidak aktif' };
    }

    setIsRefreshing(true);
    try {
      const res = await cimbApi.update({
        phone: session.phone,
        password: session.password,
        data,
      });

      if (res.success && res.data) {
        const updatedUser = Array.isArray(res.data) ? res.data[0] : res.data;
        setUser(updatedUser);
        setIsRefreshing(false);
        return { success: true, user: updatedUser };
      }

      const errMsg = (res as any).error || 'Gagal mengemaskini maklumat pengguna';
      setIsRefreshing(false);
      return { success: false, error: errMsg };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Ralat kemaskini data';
      setIsRefreshing(false);
      return { success: false, error: errMsg };
    }
  }, [session]);

  const value = {
    user,
    session,
    isLoading,
    isRefreshing,
    error,
    login,
    register,
    logout,
    refreshUser,
    updateUserData,
    isKycComplete,
    isBankComplete,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
