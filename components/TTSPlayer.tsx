import React, { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, StopIcon } from './Icons';

interface TTSPlayerProps {
  text: string;
  language: 'English' | 'Hindi' | 'Marathi';
}

const TTSPlayer: React.FC<TTSPlayerProps> = ({ text, language }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [config, setConfig] = useState({ voiceURI: '', rate: 1, pitch: 1 });

  useEffect(() => {
    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Keep English, Hindi, and Marathi
      const filtered = allVoices.filter(v => v.lang.includes('en') || v.lang.includes('hi') || v.lang.includes('mr'));
      setVoices(filtered);
      if (filtered.length > 0 && !config.voiceURI) {
        setConfig(prev => ({ ...prev, voiceURI: filtered[0].voiceURI }));
      }
    };
    
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  // Smart Voice Selection based on language
  useEffect(() => {
    if (voices.length === 0) return;
    const langCode = language === 'Hindi' ? 'hi' : (language === 'Marathi' ? 'mr' : 'en');
    const matchingVoice = voices.find(v => v.lang.startsWith(langCode));
    if (matchingVoice) {
      setConfig(prev => ({ ...prev, voiceURI: matchingVoice.voiceURI }));
    }
  }, [language, voices]);

  const handlePlay = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (config.voiceURI) {
      const voice = voices.find(v => v.voiceURI === config.voiceURI);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    
    utterance.onend = () => { setIsPlaying(false); setIsPaused(false); };
    utterance.onerror = () => { setIsPlaying(false); setIsPaused(false); };
    
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  return (
    <div className="flex flex-col gap-4 bg-brand-dark-blue border border-brand-border p-4 rounded-lg mt-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <select 
          className="bg-brand-dark text-white rounded p-2 text-sm border border-brand-border flex-grow outline-none focus:border-brand-cyan"
          value={config.voiceURI}
          onChange={e => setConfig({...config, voiceURI: e.target.value})}
        >
          {voices.length === 0 && <option value="">Loading voices...</option>}
          {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
        </select>
        <div className="flex items-center gap-3 bg-brand-dark px-3 rounded border border-brand-border">
          <label className="text-xs text-brand-cyan font-bold uppercase">Speed</label>
          <input type="range" min="0.5" max="2" step="0.1" value={config.rate} onChange={e => setConfig({...config, rate: parseFloat(e.target.value)})} className="w-24 accent-brand-cyan" />
          <span className="text-xs text-white min-w-[2rem] text-right">{config.rate}x</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="bg-brand-cyan hover:bg-cyan-500 text-white p-3 rounded-lg flex-1 flex justify-center items-center gap-2 font-bold transition-colors" onClick={isPlaying ? handlePause : handlePlay}>
          {isPlaying ? <><PauseIcon /> Pause</> : <><PlayIcon /> {isPaused ? 'Resume' : 'Read Aloud'}</>}
        </button>
        <button className={`p-3 rounded-lg flex-1 flex justify-center items-center gap-2 font-bold transition-colors ${isPlaying || isPaused ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-brand-dark text-gray-500 cursor-not-allowed border border-brand-border'}`} onClick={handleStop} disabled={!isPlaying && !isPaused}>
          <StopIcon /> Stop
        </button>
      </div>
    </div>
  );
};

export default TTSPlayer;
