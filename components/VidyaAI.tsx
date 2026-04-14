import React, { useState, useEffect } from 'react';
import { SparklesIcon, QuizIcon, FileTextIcon, HelpCircleIcon } from './Icons';
import TTSPlayer from './TTSPlayer';
import { generateQuiz } from '../services/aiService';

interface VidyaAIProps {
  userRole: 'teacher' | 'student';
  classCode: string;
}

interface SavedNote {
  id: string;
  topic: string;
  language: string;
  notes: string;
  notesHindi?: string;
  notesMarathi?: string;
  timestamp: string;
}

type LanguageOption = 'English' | 'Hindi' | 'Marathi' | 'ALL';

const LANG_TTS: Record<string, string> = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
};

const VidyaAI: React.FC<VidyaAIProps> = ({ userRole, classCode }) => {
  const [topic, setTopic] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<'video' | 'youtube'>('youtube');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('English');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Load saved notes on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vidya_saved_notes');
      if (stored) setSavedNotes(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const handleProcess = async () => {
    if (!topic.trim()) return;
    setIsProcessing(true);
    setResult(null);
    try {
      const body: any = { topic, sourceType, sourceUrl, language: selectedLanguage };
      const resp = await fetch('/api/vidya/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error('Server error');
      const data = await resp.json();
      setResult(data);
      setQuizData(null);
    } catch (error) {
      alert('Failed to generate notes. Ensure AI backend is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic) return;
    setIsGeneratingQuiz(true);
    try {
      const data = await generateQuiz(topic, 5, 'Medium');
      setQuizData(data);
    } catch (error) {
      alert('Failed to generate quiz');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSaveNotes = () => {
    if (!result) return;
    const note: SavedNote = {
      id: Date.now().toString(),
      topic,
      language: selectedLanguage,
      notes: result.notes || '',
      notesHindi: result.notesHindi,
      notesMarathi: result.notesMarathi,
      timestamp: new Date().toLocaleString(),
    };
    const updated = [note, ...savedNotes.slice(0, 19)];
    setSavedNotes(updated);
    localStorage.setItem('vidya_saved_notes', JSON.stringify(updated));
    setSaveMsg('Notes saved!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleDeleteNote = (id: string) => {
    const updated = savedNotes.filter(n => n.id !== id);
    setSavedNotes(updated);
    localStorage.setItem('vidya_saved_notes', JSON.stringify(updated));
  };

  // Determine which note panels to show
  const showEnglish = selectedLanguage === 'English' || selectedLanguage === 'ALL';
  const showHindi = selectedLanguage === 'Hindi' || selectedLanguage === 'ALL';
  const showMarathi = selectedLanguage === 'Marathi' || selectedLanguage === 'ALL';

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-brand-dark-blue p-6 rounded-2xl border border-brand-border">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <SparklesIcon className="text-brand-cyan animate-pulse" /> Vidya AI – Smart Learning
          </h2>
          <p className="text-gray-400">Generate structured multilingual notes from any topic</p>
        </div>
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="bg-brand-dark border border-brand-border px-5 py-2 rounded-xl text-sm font-bold text-gray-300 hover:text-brand-cyan hover:border-brand-cyan transition-all"
        >
          {showSaved ? 'Hide Saved' : `📂 Saved Notes (${savedNotes.length})`}
        </button>
      </div>

      {/* Saved Notes Panel */}
      {showSaved && (
        <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-brand-cyan">📂 Saved Notes</h3>
          {savedNotes.length === 0 ? (
            <p className="text-gray-500 text-sm">No saved notes yet. Generate and save notes to see them here.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {savedNotes.map(note => (
                <div key={note.id} className="bg-brand-dark p-4 rounded-xl border border-brand-border flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-white">{note.topic}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Language: <span className="text-brand-cyan">{note.language}</span> · {note.timestamp}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 whitespace-pre-wrap line-clamp-3">{note.notes?.slice(0, 200)}...</p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-red-500 hover:text-red-400 text-xs font-bold flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Topic / Subject</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleProcess()}
              placeholder="e.g., Photosynthesis, Newton's Laws..."
              className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">YouTube URL (optional)</label>
            <input
              type="text"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Language</label>
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value as LanguageOption)}
              className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan transition-all"
            >
              <option value="English">🇬🇧 English Only</option>
              <option value="Hindi">🇮🇳 Hindi Only</option>
              <option value="Marathi">🟠 Marathi Only</option>
              <option value="ALL">🌐 ALL Languages</option>
            </select>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleProcess}
            disabled={isProcessing || !topic.trim()}
            className="group relative px-12 py-4 bg-brand-cyan text-brand-dark font-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {isProcessing ? '⏳ GENERATING NOTES...' : '📝 GENERATE NOTES'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-8">
          {/* Save Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Generated Notes</h3>
            <div className="flex items-center gap-3">
              {saveMsg && <span className="text-green-400 text-sm font-bold animate-pulse">{saveMsg}</span>}
              <button
                onClick={handleSaveNotes}
                className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-500 transition-all"
              >
                💾 Save Notes
              </button>
            </div>
          </div>

          {/* Notes Grid */}
          <div className={`grid grid-cols-1 ${selectedLanguage === 'ALL' ? 'lg:grid-cols-3' : ''} gap-6`}>
            {/* English */}
            {showEnglish && result.notes && (
              <div className="bg-brand-dark-blue border-t-4 border-brand-cyan border border-brand-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-brand-cyan mb-4 flex items-center gap-2">🇬🇧 English Notes</h3>
                <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed mb-4">{result.notes}</div>
                <div className="border-t border-brand-border pt-4">
                  <TTSPlayer text={result.notes} language="English" />
                </div>
              </div>
            )}

            {/* Hindi */}
            {showHindi && result.notesHindi && (
              <div className="bg-brand-dark-blue border-t-4 border-orange-500 border border-brand-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-orange-500 mb-4 flex items-center gap-2">🇮🇳 Hindi Notes</h3>
                <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed mb-4">{result.notesHindi}</div>
                <div className="border-t border-brand-border pt-4">
                  <TTSPlayer text={result.notesHindi} language="Hindi" />
                </div>
              </div>
            )}

            {/* Marathi */}
            {showMarathi && result.notesMarathi && (
              <div className="bg-brand-dark-blue border-t-4 border-emerald-500 border border-brand-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-emerald-500 mb-4 flex items-center gap-2">🟠 Marathi Notes</h3>
                <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed mb-4">{result.notesMarathi}</div>
                <div className="border-t border-brand-border pt-4">
                  <TTSPlayer text={result.notesMarathi} language="Marathi" />
                </div>
              </div>
            )}
          </div>

          {/* Practice Quiz on demand */}
          <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-6 border-t-4 border-purple-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <QuizIcon className="text-purple-500" /> Practice Assessment
              </h3>
              {!quizData && (
                <button
                  onClick={handleGenerateQuiz}
                  disabled={isGeneratingQuiz}
                  className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-purple-500 transition-all disabled:opacity-50"
                >
                  {isGeneratingQuiz ? '⏳ Generating...' : '🎯 Generate Quiz'}
                </button>
              )}
              {quizData && (
                <button
                  onClick={() => setQuizData(null)}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  Reset Quiz
                </button>
              )}
            </div>

            {quizData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizData.questions?.map((q: any, i: number) => (
                  <div key={i} className="p-5 bg-brand-dark rounded-xl border border-brand-border">
                    <p className="font-bold mb-3 text-purple-200 text-sm">{i + 1}. {q.questionText}</p>
                    <div className="space-y-2">
                      {q.options?.map((opt: string, oi: number) => (
                        <p key={oi} className="text-xs text-gray-400 bg-brand-dark-blue p-2 rounded-lg border border-brand-border">
                          {String.fromCharCode(65 + oi)}) {opt}
                        </p>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-green-400 mt-3 bg-green-900/10 p-2 rounded border border-green-500/20">
                        ✅ {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VidyaAI;
