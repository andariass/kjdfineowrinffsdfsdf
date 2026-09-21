// Audio synth for ringback tone, connected sound, and call ended tone using Web Audio API

let audioCtx: AudioContext | null = null;
let ringInterval: number | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a standard outgoing ringback burst (440Hz + 480Hz dual-tone)
 */
export function playRingbackBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(480, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.05);
    gain.gain.setValueAtTime(0.08, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.35);
    osc2.stop(now + 1.35);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Start repeating outgoing ringtone
 */
export function startRingingSound() {
  stopRingingSound();
  playRingbackBeep();
  ringInterval = window.setInterval(() => {
    playRingbackBeep();
  }, 3000);
}

/**
 * Stop repeating ringing sound
 */
export function stopRingingSound() {
  if (ringInterval !== null) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
}

/**
 * Sound when officer answers the call
 */
export function playCallConnectedSound() {
  stopRingingSound();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // ignore
  }
}

/**
 * Sound when call is terminated or declined
 */
export function playCallEndedSound() {
  stopRingingSound();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  } catch {
    // ignore
  }
}
