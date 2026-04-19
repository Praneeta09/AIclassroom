/**
 * useSTT.ts — Speech-to-Text hook
 * Wraps Web Speech API SpeechRecognition (continuous listening mode)
 * Supports English, Hindi, Marathi
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type { TTSLanguage } from './useTTS';

type STTStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

// Extend the Window interface with speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type SpeechRecognitionInstance = any;
type SpeechRecognitionEventType = any;
type SpeechRecognitionErrorEventType = any;

export function useSTT(lang: TTSLanguage = 'en-US') {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [status, setStatus] = useState<STTStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const langRef = useRef<TTSLanguage>(lang);

  useEffect(() => {
    langRef.current = lang;
    // If already listening, restart with new language
    if (recognitionRef.current && status === 'listening') {
      recognitionRef.current.lang = lang;
    }
  }, [lang, status]);

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setStatus('unsupported');
      return;
    }
    setIsSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = langRef.current;

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEventType) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const display = final || interim;
      if (display) {
        setTranscript(display.trim().toLowerCase());
      }

      if (final.trim() && onResultRef.current) {
        onResultRef.current(final.trim().toLowerCase());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('error');
      } else if (event.error === 'no-speech') {
        // Normal — keep listening
      } else {
        console.warn('[STT] Error:', event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're supposed to still be listening
      if (status === 'listening') {
        try {
          recognition.lang = langRef.current;
          recognition.start();
        } catch { /* already running */ }
      } else {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.abort(); } catch {}
    };
  }, []); // Only once

  const start = useCallback((onResult: (text: string) => void) => {
    onResultRef.current = onResult;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.lang = langRef.current;
      recognitionRef.current.start();
      setStatus('listening');
    } catch {
      // already started — update handler
    }
  }, []);

  const stop = useCallback(() => {
    onResultRef.current = null;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.abort();
    } catch {}
    setStatus('idle');
    setTranscript('');
  }, []);

  const toggle = useCallback((onResult: (text: string) => void) => {
    if (status === 'listening') {
      stop();
    } else {
      start(onResult);
    }
  }, [status, start, stop]);

  return { start, stop, toggle, transcript, status, isSupported };
}
