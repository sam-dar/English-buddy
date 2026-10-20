/**
 * Audio and Speech Utilities for English Buddy
 */

// Simple synthesized Web Audio SFX (delightful, kid-friendly, no external audio files required!)
class SoundEffects {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Soft pleasant button tap pop
  playPop() {
    const ctx = this.initCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Cheerful correct chime
  playDing() {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.15, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.26);
    });
  }

  // Star / badge earned celebration fanfare
  playFanfare() {
    const ctx = this.initCtx();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    const now = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const time = now + idx * 0.09;
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.36);
    });
  }
}

export const sfx = new SoundEffects();

// Cache generated audio in the client to eliminate redundant API calls
const clientAudioCache = new Map<string, string>();
let serverTtsQuotaExceeded = false;

// Currently playing audio element for server-rendered TTS
let currentAudioElement: HTMLAudioElement | null = null;

export function stopCurrentAudio() {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Play narration using Gemini TTS endpoint with instant fallback to browser SpeechSynthesis.
 */
export async function speakText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  tier: 'Basic' | 'Intermediate' | 'Advanced' = 'Basic'
): Promise<void> {
  stopCurrentAudio();
  onStart?.();

  if (!text || text.trim().length === 0) {
    onEnd?.();
    return;
  }

  // Rate scaling: slower for Basic (age 6), natural for older kids
  const speechRate = tier === 'Basic' ? 0.85 : tier === 'Intermediate' ? 0.95 : 1.05;
  const cleanKey = text.trim().toLowerCase();

  // 1. Play from client memory cache if available
  if (clientAudioCache.has(cleanKey)) {
    try {
      const audio = new Audio(`data:audio/wav;base64,${clientAudioCache.get(cleanKey)}`);
      currentAudioElement = audio;
      audio.playbackRate = speechRate;
      audio.onended = () => {
        currentAudioElement = null;
        onEnd?.();
      };
      audio.onerror = () => {
        fallbackSpeechSynthesis(text, speechRate, onEnd);
      };
      await audio.play();
      return;
    } catch {
      // Fall through to speech synthesis
    }
  }

  // 2. If server TTS quota is exceeded or offline, skip network and use Web Speech Synthesis immediately
  if (serverTtsQuotaExceeded || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    fallbackSpeechSynthesis(text, speechRate, onEnd);
    return;
  }

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'Puck' }),
    });

    if (res.ok) {
      const data = await res.json();

      if (data.fallback || data.reason === 'quota_exceeded') {
        // Remember quota was hit to avoid unnecessary network calls
        serverTtsQuotaExceeded = true;
        fallbackSpeechSynthesis(text, speechRate, onEnd);
        return;
      }

      if (data.audioBase64) {
        clientAudioCache.set(cleanKey, data.audioBase64);
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        currentAudioElement = audio;
        audio.playbackRate = speechRate;

        audio.onended = () => {
          currentAudioElement = null;
          onEnd?.();
        };

        audio.onerror = () => {
          fallbackSpeechSynthesis(text, speechRate, onEnd);
        };

        await audio.play();
        return;
      }
    } else if (res.status === 429) {
      serverTtsQuotaExceeded = true;
    }
  } catch {
    serverTtsQuotaExceeded = true;
  }

  // Fallback to browser Web Speech Synthesis
  fallbackSpeechSynthesis(text, speechRate, onEnd);
}

function fallbackSpeechSynthesis(text: string, rate: number, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.1; // slightly higher, friendlier pitch for kid buddy

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Preferred high quality English voices
        const englishVoice =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Samantha') ||
                v.name.includes('Google US English') ||
                v.name.includes('Victoria') ||
                v.name.includes('Karen') ||
                v.name.includes('Daniel'))
          ) || voices.find((v) => v.lang.startsWith('en-US')) || voices.find((v) => v.lang.startsWith('en'));

        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }

      utterance.onend = () => {
        onEnd?.();
      };

      utterance.onerror = () => {
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        setVoiceAndSpeak();
      };
      // Timeout fallback in case onvoiceschanged does not fire
      setTimeout(setVoiceAndSpeak, 100);
    } else {
      setVoiceAndSpeak();
    }
  } catch {
    onEnd?.();
  }
}

/**
 * Check if Web Speech Recognition is supported in the browser.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/**
 * Create a Speech Recognition instance with kid-friendly configuration.
 */
export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void
) {
  if (!isSpeechRecognitionSupported()) {
    onError('speech_unsupported');
    return null;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 3;

  recognition.onresult = (event: any) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    const full = (final || interim).trim();
    if (full) {
      onResult(full, Boolean(final));
    }
  };

  recognition.onerror = (event: any) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      onError('permission_denied');
    } else if (event.error === 'no-speech') {
      onError('no_speech');
    } else {
      onError(event.error || 'speech_error');
    }
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
}
