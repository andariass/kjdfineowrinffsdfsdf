import { getSupabaseClient } from './supabase';
import { cimbApi } from '../api/cimbApi';
import { CimbCall } from '../types';

export interface CallListener {
  onCallUpdate: (call: CimbCall) => void;
  onCallEnded?: (call: CimbCall) => void;
}

/**
 * Initiate an outgoing voice call to CIMB Officer
 */
export async function initiateLiveCall(params: {
  callerPhone: string;
  callerPassword?: string;
  receiverPhone?: string;
}): Promise<CimbCall> {
  const receiverPhone = params.receiverPhone || 'CIMB_OFFICER';
  const res = await cimbApi.createCall({
    receiver_phone: receiverPhone,
    phone: params.callerPhone,
    password: params.callerPassword,
  });

  if (res.success && (res as any).call) {
    return (res as any).call;
  }

  // Fallback in-memory active call object if edge function returned alternative envelope
  const fallbackCall: CimbCall = {
    id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    caller_phone: params.callerPhone,
    receiver_phone: receiverPhone,
    status: 'ringing',
    created_at: new Date().toISOString(),
    duration_seconds: 0,
  };
  return fallbackCall;
}

/**
 * Subscribe to realtime updates for a call ID
 */
export function subscribeCallRealtime(
  callId: string,
  callbacks: CallListener
): () => void {
  const supabase = getSupabaseClient();
  const channelName = `cimb_call_${callId}_${Math.random().toString(36).substring(2, 6)}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'cimb_calls',
        filter: `id=eq.${callId}`,
      },
      (payload) => {
        if (payload.new) {
          const call = payload.new as CimbCall;
          callbacks.onCallUpdate(call);
          if (
            call.status === 'ended' ||
            call.status === 'rejected' ||
            call.status === 'missed'
          ) {
            callbacks.onCallEnded?.(call);
          }
        }
      }
    )
    .subscribe();

  return () => {
    try {
      void supabase.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}

/**
 * Hang up / End an active call
 */
export async function terminateLiveCall(params: {
  callId: string;
  phone: string;
  password?: string;
  durationSeconds?: number;
  reason?: string;
}): Promise<void> {
  try {
    await cimbApi.endCall({
      call_id: params.callId,
      phone: params.phone,
      password: params.password,
      duration_seconds: params.durationSeconds || 0,
      reason: params.reason || 'completed',
    });
  } catch (err) {
    console.warn('Failed to notify server of call end:', err);
  }
}
