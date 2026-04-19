/**
 * VoiceController.tsx
 * Global floating voice-controlled accessibility widget.
 * Merges features of the old AccessibilityEnhancer + adds voice control.
 *
 * Props:
 *   role          — current user's role (teacher/student/parent)
 *   onNavigate    — navigation callback for the active portal
 *   voiceActions  — optional role-specific action callbacks
 *   settings      — accessibility settings (font size, contrast)
 *   setSettings   — accessibility settings setter
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AccessibilitySettings, Role } from '../types';
import { useTTS, TTSLanguage } from './useTTS';
import { useSTT } from './useSTT';
import { routeCommand, getHelpText, VoiceActions, HELP_COMMANDS } from './commandRouter';

interface VoiceControllerProps {
  role?: Role;
  onNavigate?: (page: string) => void;
  voiceActions?: Partial<VoiceActions>;
  settings: AccessibilitySettings;
  setSettings: React.Dispatch<React.SetStateAction<AccessibilitySettings>>;
}

type PanelTab = 'voice' | 'accessibility' | 'help';

const LANGS: { code: TTSLanguage; label: string; flag: string }[] = [
  { code: 'en-US', label: 'EN', flag: '🇬🇧' },
  { code: 'hi-IN', label: 'HI', flag: '🇮🇳' },
  { code: 'mr-IN', label: 'MR', flag: '🇮🇳' },
];

// Waveform bars for the "listening" animation
function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {[3, 5, 7, 5, 4, 6, 3, 5].map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-cyan-400 transition-all"
          style={{
            height: active ? `${h * 2.5 + Math.random() * 4}px` : '4px',
            animation: active ? `vcWave ${0.4 + i * 0.08}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

// Mic icon SVG with dynamic color
function MicIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill={color === 'currentColor' ? 'none' : color + '33'} />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function AccessibilityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="4" r="2" /><path d="M4 10h16M12 10v11M7 21l5-4 5 4" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const VoiceController: React.FC<VoiceControllerProps> = ({
  role = 'student',
  onNavigate,
  voiceActions = {},
  settings,
  setSettings,
}) => {
  // Ensure role is always a valid Role type for the command router
  const safeRole: Role = (role === 'teacher' || role === 'parent') ? role : 'student';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>('voice');
  const [ttsLang, setTtsLang] = useState<TTSLanguage>('en-US');
  const [lastCommand, setLastCommand] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  const { speak, stop: ttsStop, isSpeaking, repeat, speakPageContent } = useTTS();
  const { start: sttStart, stop: sttStop, transcript, status: sttStatus, isSupported } = useSTT(ttsLang);

  const isListening = sttStatus === 'listening';

  // Announce page on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        speak('Voice controller open. Say Help to hear available commands.', ttsLang);
      }, 400);
    }
  }, [isOpen]);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 3000);
  }, []);

  const buildActions = useCallback((): VoiceActions => {
    return {
      navigate: (page: string) => onNavigate?.(page),
      stop: () => { ttsStop(); sttStop(); showFeedback('Stopped.'); },
      repeat: () => repeat(ttsLang),
      readPage: () => speakPageContent(ttsLang),
      speakHelp: () => {
        const helpText = getHelpText(safeRole);
        speak(helpText, ttsLang);
        showFeedback('Listing commands…');
        setShowHelpModal(true);
      },
      ...voiceActions,
    };
  }, [onNavigate, ttsStop, sttStop, repeat, ttsLang, speakPageContent, speak, role, voiceActions, showFeedback]);

  const handleVoiceResult = useCallback((text: string) => {
    setLastCommand(text);
    const actions = buildActions();
    const result = routeCommand(text, safeRole, actions);

    if (result.handled) {
      if (result.feedback) {
        speak(result.feedback, ttsLang);
        showFeedback(result.feedback);
      }
    } else {
      const notUnderstood = 'I did not understand. Please try again or say Help.';
      speak(notUnderstood, ttsLang);
      showFeedback('Not understood');
    }
  }, [buildActions, role, speak, ttsLang, showFeedback]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      sttStop();
      ttsStop();
      showFeedback('Voice stopped');
    } else {
      speak('Voice assistant activated. Listening for commands.', ttsLang);
      setTimeout(() => sttStart(handleVoiceResult), 900);
      showFeedback('Listening…');
    }
  }, [isListening, sttStop, ttsStop, speak, ttsLang, sttStart, handleVoiceResult, showFeedback]);

  const handleFontSize = (dir: 'up' | 'down') => {
    setSettings(prev => ({
      ...prev,
      fontSize: dir === 'up' ? Math.min(prev.fontSize + 2, 24) : Math.max(prev.fontSize - 2, 12),
    }));
  };

  const handleContrast = () => setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));

  const helpCommands = HELP_COMMANDS[safeRole] ?? [];

  return (
    <>
      {/* Animation keyframes injected once */}
      <style>{`
        @keyframes vcWave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
        @keyframes vcPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0.5); }
          50% { box-shadow: 0 0 0 14px rgba(6,182,212,0); }
        }
        @keyframes vcOrb {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
      `}</style>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[58]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Panel */}
      <div
        className={`fixed bottom-24 right-6 w-[340px] z-[59] transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          background: 'rgba(10, 20, 40, 0.92)',
          border: '1px solid rgba(6,182,212,0.25)',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(6,182,212,0.15), 0 2px 12px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ animation: isListening ? 'vcOrb 1s ease-in-out infinite' : 'none' }} />
            <span className="font-bold text-white text-sm tracking-wide">Voice Assistant</span>
            <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {role}
            </span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <CloseIcon />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 px-4 pt-3 pb-1">
          {(['voice', 'accessibility', 'help'] as PanelTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'voice' ? '🎙 Voice' : tab === 'accessibility' ? '♿ Access' : '❓ Help'}
            </button>
          ))}
        </div>

        {/* ── VOICE TAB ── */}
        {activeTab === 'voice' && (
          <div className="p-5 space-y-4">
            {/* Language Selector */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Language</label>
              <div className="flex gap-2">
                {LANGS.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setTtsLang(l.code)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      ttsLang === l.code
                        ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400'
                        : 'border-white/5 text-gray-400 hover:border-gray-600 bg-white/3'
                    }`}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Big Mic Button */}
            <div className="flex flex-col items-center gap-3 py-2">
              <button
                onClick={toggleListening}
                disabled={!isSupported}
                id="voice-mic-btn"
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isListening
                    ? 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0.05) 70%)'
                    : 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.02) 70%)',
                  border: `2px solid ${isListening ? 'rgba(6,182,212,0.8)' : 'rgba(6,182,212,0.25)'}`,
                  animation: isListening ? 'vcPulse 1.5s ease-in-out infinite' : 'none',
                }}
              >
                <MicIcon size={32} color={isListening ? '#06b6d4' : '#9ca3af'} />
              </button>

              {/* Waveform */}
              <div className="h-6 flex items-center">
                <WaveformBars active={isListening} />
              </div>

              {/* Status */}
              <div className="text-center">
                <p className={`text-sm font-bold ${isListening ? 'text-cyan-400' : isSpeaking ? 'text-purple-400' : 'text-gray-500'}`}>
                  {!isSupported
                    ? '⚠ Voice not supported in this browser'
                    : isListening
                    ? '🎙 Listening…'
                    : isSpeaking
                    ? '🔊 Speaking…'
                    : '● Ready to listen'}
                </p>
                {lastCommand && (
                  <p className="text-[11px] text-gray-600 mt-1 italic">
                    Heard: "<span className="text-cyan-500/80">{lastCommand}</span>"
                  </p>
                )}
              </div>
            </div>

            {/* Feedback Banner */}
            {feedback && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-2 text-xs font-semibold text-cyan-400 text-center animate-in fade-in duration-200">
                {feedback}
              </div>
            )}

            {/* Transcript live */}
            {transcript && isListening && (
              <div className="bg-white/3 rounded-xl px-4 py-3 border border-white/5">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Live Transcript</p>
                <p className="text-sm text-gray-300 italic">{transcript}</p>
              </div>
            )}

            {/* Quick Read Button */}
            <button
              onClick={() => speakPageContent(ttsLang)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-purple-500/25 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all text-sm font-semibold"
              id="voice-read-page-btn"
            >
              <SpeakerIcon /> Read Page Aloud
            </button>

            {/* Stop All */}
            {(isSpeaking || isListening) && (
              <button
                onClick={() => { ttsStop(); sttStop(); }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-semibold"
              >
                ⏹ Stop All
              </button>
            )}
          </div>
        )}

        {/* ── ACCESSIBILITY TAB ── */}
        {activeTab === 'accessibility' && (
          <div className="p-5 space-y-5">
            {/* Font Size */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 block">Text Size</label>
              <div className="flex items-center gap-3 bg-white/3 rounded-xl p-3 border border-white/5">
                <button
                  onClick={() => handleFontSize('down')}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-cyan-500/20 flex items-center justify-center text-lg font-bold text-gray-300 hover:text-cyan-400 transition-all border border-white/5"
                >A−</button>
                <span className="flex-1 text-center font-bold text-white text-lg">{settings.fontSize}px</span>
                <button
                  onClick={() => handleFontSize('up')}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-cyan-500/20 flex items-center justify-center text-lg font-bold text-gray-300 hover:text-cyan-400 transition-all border border-white/5"
                >A+</button>
              </div>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between bg-white/3 rounded-xl p-4 border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">High Contrast</p>
                <p className="text-xs text-gray-500">Enhanced visibility mode</p>
              </div>
              <button
                onClick={handleContrast}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  settings.highContrast ? 'bg-cyan-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                    settings.highContrast ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Speak settings status */}
            <button
              onClick={() => speak(
                `Current settings: Font size ${settings.fontSize} pixels. High contrast mode is ${settings.highContrast ? 'on' : 'off'}.`,
                ttsLang
              )}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-cyan-500/25 bg-cyan-500/8 text-cyan-400 hover:bg-cyan-500/15 transition-all text-sm font-semibold"
            >
              <SpeakerIcon /> Read Current Settings
            </button>
          </div>
        )}

        {/* ── HELP TAB ── */}
        {activeTab === 'help' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <HelpIcon />
              <p className="text-sm font-bold text-white">Available Commands</p>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">{role}</span>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {helpCommands.map((cmd, i) => {
                const [voice, desc] = cmd.includes('—') ? cmd.split('—') : [cmd, ''];
                return (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-[10px] font-black bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-md border border-cyan-500/20 whitespace-nowrap mt-0.5">
                      {voice.trim()}
                    </span>
                    <span className="text-xs text-gray-400">{desc.trim()}</span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => speak(getHelpText(safeRole), ttsLang)}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-xl border border-purple-500/25 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all text-sm font-semibold"
            >
              <SpeakerIcon /> Read Commands Aloud
            </button>
          </div>
        )}
      </div>

      {/* Floating Orb Button */}
      <button
        id="voice-controller-toggle"
        onClick={() => setIsOpen(o => !o)}
        aria-label="Open Voice Assistant"
        className="fixed bottom-6 right-6 z-[60] w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 group"
        style={{
          background: isListening
            ? 'linear-gradient(135deg, #06b6d4, #8b5cf6)'
            : 'linear-gradient(135deg, #0e7490, #1d4ed8)',
          boxShadow: isListening
            ? '0 0 0 4px rgba(6,182,212,0.3), 0 8px 32px rgba(6,182,212,0.4)'
            : '0 4px 20px rgba(6,182,212,0.2)',
          animation: isListening ? 'vcPulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        <MicIcon size={26} color="white" />
        {isListening && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a1428] flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </span>
        )}
      </button>
    </>
  );
};

export default VoiceController;
