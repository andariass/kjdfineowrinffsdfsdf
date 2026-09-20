import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://oszqantvugvbvydlizix.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zenFhbnR2dWd2YnZ5ZGxpeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTg4MTUsImV4cCI6MjA5MDI5NDgxNX0.31-1oMeFxchomBaM9hXrvmn8o8lsua7Y5DfT2JdJ1z8';

// Alias for backwards compatibility
export const SUPABASE_PUBLISHABLE_KEY = SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  if (typeof window !== 'undefined' && (window as any).__cimbSupabaseClient) {
    cachedClient = (window as any).__cimbSupabaseClient;
    return cachedClient!;
  }

  const clientFactory =
    createClient ||
    (typeof window !== 'undefined' && (window as any).supabase?.createClient);

  if (!clientFactory) {
    throw new Error('Supabase JS SDK failed to load.');
  }

  cachedClient = clientFactory(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  if (typeof window !== 'undefined') {
    (window as any).__cimbSupabaseClient = cachedClient;
  }

  return cachedClient!;
}

