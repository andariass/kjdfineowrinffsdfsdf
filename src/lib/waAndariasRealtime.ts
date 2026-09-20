import { getSupabaseClient } from './supabase';

export type WaAndariasRow = {
  wa_message_id: string;
  whatsapp_bot_name: string | null;
  whatsapp_bot_id: string | null;
  subscriber_id: string | null;
  label_names: string | null;
  agent_name: string | null;
  first_name: string | null;
  chat_id: string | null;
  user_message: unknown | null;
  whatsapp_bot_username: string | null;
  webhook_type: string | null;
  message_status: string | null;
  status_time: string | null;
  failed_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  role: string | null;
};

export async function subscribeWaAndariasRealtime(
  onInsert?: (row: WaAndariasRow) => void,
  onUpdate?: (row: WaAndariasRow) => void,
) {
  const supabase = getSupabaseClient();
  const uniqueToken = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const channel = supabase
    .channel(`wa_andarias_realtime_${uniqueToken}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'wa_andarias',
      },
      (payload: any) => onInsert?.(payload.new as WaAndariasRow),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'wa_andarias',
      },
      (payload: any) => onUpdate?.(payload.new as WaAndariasRow),
    )
    .subscribe();

  return () => {
    try {
      void supabase.removeChannel(channel);
    } catch (err) {
      console.warn('[waAndarias] Error removing channel:', err);
    }
  };
}
