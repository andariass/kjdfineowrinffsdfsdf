let audioContext: AudioContext | null = null;

export async function enableNotificationAudio(): Promise<boolean> {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return false;
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state !== 'running') await audioContext.resume();
    return audioContext.state === 'running';
  } catch {
    return false;
  }
}

export async function playIncomingMessageSound(): Promise<boolean> {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return false;
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state !== 'running') await audioContext.resume();
    if (audioContext.state !== 'running') return false;

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
    return true;
  } catch {
    return false;
  }
}
