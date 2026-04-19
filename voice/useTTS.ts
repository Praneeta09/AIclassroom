/**
 * useTTS.ts — Text-to-Speech hook
 * Wraps Web Speech API SpeechSynthesis
 * Supports English (en-US), Hindi (hi-IN), Marathi (mr-IN)
 */

import { useRef, useCallback, useEffect, useState } from 'react';

export type TTSLanguage = 'en-US' | 'hi-IN' | 'mr-IN';

const LANG_VOICE_MAP: Record<TTSLanguage, string[]> = {
  'en-US': ['en-US', 'en-GB', 'en'],
  'hi-IN': ['hi-IN', 'hi'],
  'mr-IN': ['mr-IN', 'mr'],
};

function getBestVoice(lang: TTSLanguage): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const prefixes = LANG_VOICE_MAP[lang];
  for (const prefix of prefixes) {
    const match = voices.find(v => v.lang.startsWith(prefix));
    if (match) return match;
  }
  // Fallback to any English voice
  return voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

export function useTTS() {
  const lastTextRef = useRef<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    const update = () => setVoicesReady(true);
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoicesReady(true);
    }
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', update);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string, lang: TTSLanguage = 'en-US', rate = 1.0, pitch = 1.0) => {
    if (!text?.trim()) return;
    window.speechSynthesis.cancel();
    lastTextRef.current = text;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    const voice = getBestVoice(lang);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utterance.onpause = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setIsSpeaking(true);
  }, []);

  const repeat = useCallback((lang: TTSLanguage = 'en-US') => {
    if (lastTextRef.current) {
      speak(lastTextRef.current, lang);
    }
  }, [speak]);

  const speakPageContent = useCallback((lang: TTSLanguage = 'en-US') => {
    const main = document.querySelector('main');
    const text = main
      ? Array.from(main.querySelectorAll('h1,h2,h3,p,li,td'))
          .map(el => (el as HTMLElement).innerText?.trim())
          .filter(Boolean)
          .slice(0, 60)
          .join('. ')
      : 'No readable content on this page.';
    speak(text || 'No content found.', lang);
  }, [speak]);

  return { speak, stop, pause, resume, repeat, speakPageContent, isSpeaking, voicesReady };
}
