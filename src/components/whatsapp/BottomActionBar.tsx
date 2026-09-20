import React from 'react';
import { Send, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { sendWhatsAppMessage } from '../../api/whatsappApi';

export interface BottomActionBarProps {
  phoneNumber: string;
  customerName?: string;
  onMessageSent?: (messageText: string, phone: string) => void;
  disabled?: boolean;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  phoneNumber,
  customerName,
  onMessageSent,
  disabled = false,
}) => {
  const [text, setText] = React.useState('');
  const [targetPhone, setTargetPhone] = React.useState(phoneNumber);
  const [isEditingPhone, setIsEditingPhone] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTargetPhone(phoneNumber);
    setFeedback(null);
  }, [phoneNumber]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    const cleanPhone = targetPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      setFeedback({
        type: 'error',
        text: 'Sila masukkan nombor telefon penerima yang sah.',
      });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      const result = await sendWhatsAppMessage({
        phone_number: cleanPhone,
        message: trimmed,
      });

      if (result.success) {
        setText('');
        setFeedback({
          type: 'success',
          text: result.message || 'Mesej berjaya dihantar!',
        });
        onMessageSent?.(trimmed, cleanPhone);
        // Auto-dismiss success feedback after 3 seconds
        setTimeout(() => {
          setFeedback((prev) => (prev?.type === 'success' ? null : prev));
        }, 3000);
      } else {
        setFeedback({
          type: 'error',
          text: result.message || 'Gagal menghantar mesej.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ralat semasa menghantar mesej.',
      });
    } finally {
      setIsSending(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <footer
      id="whatsapp-bottom-action-bar"
      className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 shadow-md z-20"
    >
      {/* Target recipient label / phone edit toggle */}
      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-medium text-slate-600">Penerima:</span>
          {isEditingPhone ? (
            <div className="flex items-center gap-1">
              <input
                id="whatsapp-target-phone-input"
                type="tel"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="60123456789"
                className="h-6 w-36 rounded border border-slate-300 px-1.5 text-xs font-mono text-slate-800 outline-none focus:border-[#E31B23]"
              />
              <button
                type="button"
                onClick={() => setIsEditingPhone(false)}
                className="text-[10px] text-[#E31B23] hover:underline font-semibold"
              >
                Selesai
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingPhone(true)}
              className="truncate font-mono font-medium text-slate-700 hover:text-[#E31B23] transition-colors"
              title="Klik untuk ubah nombor penerima"
            >
              +{targetPhone.replace(/\D/g, '') || phoneNumber}
              {customerName ? ` (${customerName})` : ''}
              <span className="ml-1 text-[10px] text-slate-400 font-sans hover:underline">(tukar)</span>
            </button>
          )}
        </div>
        <span className="text-[10px] text-slate-400">BotSailor API</span>
      </div>

      {/* Feedback message banner if any */}
      {feedback && (
        <div
          id="whatsapp-feedback-banner"
          className={`mb-2 flex items-start justify-between gap-2 rounded-xl p-2.5 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-start gap-1.5 min-w-0">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <span className="break-words leading-tight">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="shrink-0 p-0.5 text-slate-400 hover:text-slate-600"
            aria-label="Tutup makluman"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Form with input text & button send */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id="whatsapp-message-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSending || disabled}
            placeholder="Tulis mesej WhatsApp..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-[#F7F8FA] px-3.5 text-sm text-[#17181A] placeholder-slate-400 outline-none transition focus:border-[#E31B23] focus:bg-white disabled:opacity-60"
            autoComplete="off"
          />
        </div>

        <button
          id="whatsapp-send-button"
          type="submit"
          disabled={!text.trim() || isSending || disabled}
          aria-label="Hantar Mesej WhatsApp"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E31B23] text-white shadow-sm transition hover:bg-[#c9181f] active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </footer>
  );
};
