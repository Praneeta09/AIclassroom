import React, { useState, useEffect } from 'react';
import { SparklesIcon, QuizIcon, FileTextIcon, HelpCircleIcon } from './Icons';
import TTSPlayer from './TTSPlayer';
import { generateQuiz } from '../services/aiService';
import { useAppStore } from '../stores/useAppStore';

interface VidyaAIProps {
  userRole: 'teacher' | 'student';
  classCode: string;
}

type LanguageOption = 'English' | 'Hindi' | 'Marathi' | 'ALL';
type PPTTemplate = 'modern' | 'academic' | 'dark';
type ActiveTab = 'notes' | 'ppt';

const LANG_TTS: Record<string, string> = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
};

// PPT Layout color config
const LAYOUT_COLORS: Record<string, { border: string; badge: string; badgeText: string; icon: string }> = {
  hero: { border: 'border-brand-cyan', badge: 'bg-brand-cyan/20 text-brand-cyan', badgeText: 'bg-brand-cyan', icon: '🎯' },
  'two-column': { border: 'border-purple-500', badge: 'bg-purple-500/20 text-purple-300', badgeText: 'bg-purple-500', icon: '📊' },
  bullets: { border: 'border-blue-500', badge: 'bg-blue-500/20 text-blue-300', badgeText: 'bg-blue-400', icon: '📝' },
  timeline: { border: 'border-orange-500', badge: 'bg-orange-500/20 text-orange-300', badgeText: 'bg-orange-500', icon: '⏱️' },
  comparison: { border: 'border-green-500', badge: 'bg-green-500/20 text-green-300', badgeText: 'bg-green-400', icon: '⚖️' },
};

const VISUAL_TYPE_ICONS: Record<string, string> = {
  diagram: '📐',
  timeline: '📅',
  comparison: '🔍',
  infographic: '📊',
  hero: '⭐',
};

const TEMPLATES: Record<PPTTemplate, { name: string; bg: string; title: string; cardBg: string }> = {
  modern: { name: '🎨 Modern', bg: 'bg-brand-dark', title: 'text-brand-cyan', cardBg: 'bg-brand-dark-blue' },
  academic: { name: '📚 Academic', bg: 'bg-blue-950', title: 'text-blue-200', cardBg: 'bg-blue-900/50' },
  dark: { name: '🌙 Dark', bg: 'bg-gray-950', title: 'text-purple-400', cardBg: 'bg-gray-900' },
};

const VidyaAI: React.FC<VidyaAIProps> = ({ userRole, classCode }) => {
  const {
    vidyaResult, vidyaTopic, vidyaLanguage, vidyaSavedNotes,
    setVidyaResult, setVidyaTopic, setVidyaLanguage,
    addVidyaSavedNote, deleteVidyaSavedNote,
  } = useAppStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [viewingNote, setViewingNote] = useState<any>(null);
  const [inputMode, setInputMode] = useState<'topic' | 'youtube'>('topic');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTopic, setYoutubeTopic] = useState('');

  // PPT state
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
  const [pptSlides, setPptSlides] = useState<any[]>([]);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [pptTemplate, setPptTemplate] = useState<PPTTemplate>('modern');
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const selectedLanguage = vidyaLanguage as LanguageOption;
  const topic = vidyaTopic;
  const result = vidyaResult;

  const extractVideoId = (url: string): string => {
    try {
      if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0] || '';
      if (url.includes('youtube.com/shorts/')) return url.split('shorts/')[1]?.split('?')[0] || '';
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop() || '';
    } catch {
      return '';
    }
  };

  const handleProcess = async () => {
    if (!topic.trim()) return;
    setIsProcessing(true);
    setVidyaResult(null);
    setViewingNote(null);
    try {
      const body: any = { topic, language: selectedLanguage };
      const resp = await fetch('/api/vidya/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error('Server error');
      const data = await resp.json();
      setVidyaResult(data);
      setQuizData(null);
    } catch (error) {
      setVidyaResult({
        notes: selectedLanguage === 'English' || selectedLanguage === 'ALL' ? 'Notes generation failed. Ensure AI backend (Ollama) is running.' : '',
        notesHindi: selectedLanguage === 'Hindi' || selectedLanguage === 'ALL' ? 'नोट्स जनरेशन विफल रहा। कृपया AI बैकएंड जांचें।' : '',
        notesMarathi: selectedLanguage === 'Marathi' || selectedLanguage === 'ALL' ? 'नोट्स निर्मिती अयशस्वी. कृपया AI बॅकएंड तपासा.' : '',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleYoutubeProcess = async () => {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) return;
    setIsProcessing(true);
    setVidyaResult(null);
    setViewingNote(null);
    try {
      const resp = await fetch('/api/vidya/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, language: selectedLanguage, topic: youtubeTopic }),
      });
      if (!resp.ok) throw new Error('Server error');
      const data = await resp.json();
      setVidyaResult(data);
      setVidyaTopic(`YouTube: ${youtubeTopic || videoId}`);
      setQuizData(null);
    } catch (error) {
      setVidyaResult({
        notes: 'Failed to generate notes from YouTube video.',
        notesHindi: 'यूट्यूब वीडियो से नोट्स बनाने में विफल।',
        notesMarathi: 'YouTube व्हिडिओमधून नोट्स तयार करण्यात अयशस्वी.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePPT = async () => {
    if (!topic.trim()) return;
    setIsGeneratingPPT(true);
    setPptSlides([]);
    try {
      const resp = await fetch('/api/vidya/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language: selectedLanguage }),
      });
      if (!resp.ok) throw new Error('Server error');
      const data = await resp.json();
      if (data.slides && Array.isArray(data.slides)) {
        setPptSlides(data.slides);
      } else if (data.text) {
        // Legacy format
        const jsonMatch = data.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setPptSlides(parsed.slides || []);
        }
      }
    } catch (error) {
      console.error('PPT generation failed:', error);
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic) return;
    setIsGeneratingQuiz(true);
    try {
      const data = await generateQuiz(topic, 5, 'Medium');
      setQuizData(data);
    } catch (error) {
      console.error('Failed to generate quiz');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSaveNotes = () => {
    if (!result) return;
    const note = {
      id: Date.now().toString(),
      topic,
      language: selectedLanguage,
      notes: result.notes || '',
      notesHindi: result.notesHindi,
      notesMarathi: result.notesMarathi,
      timestamp: new Date().toLocaleString(),
    };
    addVidyaSavedNote(note);
    setSaveMsg('Notes saved!');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleViewNote = (note: any) => {
    setViewingNote(note);
    setVidyaResult({
      notes: note.notes || '',
      notesHindi: note.notesHindi || '',
      notesMarathi: note.notesMarathi || '',
    });
    setVidyaTopic(note.topic);
    setVidyaLanguage(note.language);
    setShowSaved(false);
  };

  const toggleSpeakerNotes = (idx: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const showEnglish = selectedLanguage === 'English' || selectedLanguage === 'ALL';
  const showHindi = selectedLanguage === 'Hindi' || selectedLanguage === 'ALL';
  const showMarathi = selectedLanguage === 'Marathi' || selectedLanguage === 'ALL';

  const tmpl = TEMPLATES[pptTemplate];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-brand-dark-blue p-6 rounded-2xl border border-brand-border">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <SparklesIcon className="text-brand-cyan animate-pulse" /> Vidya AI – Smart Learning
          </h2>
          <p className="text-gray-400">Generate multilingual notes, Canva-style slides, and practice quizzes</p>
        </div>
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="bg-brand-dark border border-brand-border px-5 py-2 rounded-xl text-sm font-bold text-gray-300 hover:text-brand-cyan hover:border-brand-cyan transition-all"
        >
          {showSaved ? 'Hide Saved' : `📂 Saved Notes (${vidyaSavedNotes.length})`}
        </button>
      </div>

      {/* Saved Notes Panel */}
      {showSaved && (
        <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-brand-cyan">📂 Saved Notes</h3>
          {vidyaSavedNotes.length === 0 ? (
            <p className="text-gray-500 text-sm">No saved notes yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {vidyaSavedNotes.map(note => (
                <div key={note.id} className="bg-brand-dark p-4 rounded-xl border border-brand-border flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-white">{note.topic}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Language: <span className="text-brand-cyan">{note.language}</span> · {note.timestamp}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 whitespace-pre-wrap line-clamp-3">{note.notes?.slice(0, 200)}...</p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleViewNote(note)}
                      className="bg-brand-cyan/20 text-brand-cyan px-3 py-1 rounded-lg text-xs font-bold hover:bg-brand-cyan/30 transition-all"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => deleteVidyaSavedNote(note.id)}
                      className="text-red-500 hover:text-red-400 text-xs font-bold px-3 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-8">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setInputMode('topic')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${inputMode === 'topic' ? 'bg-brand-cyan text-brand-dark' : 'bg-brand-dark border border-brand-border text-gray-400 hover:text-white'}`}
          >
            📝 Topic / Subject
          </button>
          <button
            onClick={() => setInputMode('youtube')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${inputMode === 'youtube' ? 'bg-red-600 text-white' : 'bg-brand-dark border border-brand-border text-gray-400 hover:text-white'}`}
          >
            ▶️ YouTube Video
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {inputMode === 'topic' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Topic / Subject</label>
              <input
                type="text"
                value={topic}
                onChange={e => setVidyaTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleProcess()}
                placeholder="e.g., Photosynthesis, Newton's Laws..."
                className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan transition-all"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">YouTube Video URL</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-brand-dark border border-red-500/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 transition-all"
                />
                {youtubeUrl && (
                  <p className="text-xs text-gray-500">
                    Video ID: <span className="text-red-400 font-mono">{extractVideoId(youtubeUrl) || 'Invalid URL'}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Video Topic (Required)</label>
                <input
                  type="text"
                  value={youtubeTopic}
                  onChange={e => setYoutubeTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleYoutubeProcess()}
                  placeholder="e.g., JavaScript Basics..."
                  className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan transition-all"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Language</label>
            <select
              value={selectedLanguage}
              onChange={e => setVidyaLanguage(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan transition-all"
            >
              <option value="English">🇬🇧 English Only</option>
              <option value="Hindi">🇮🇳 Hindi Only</option>
              <option value="Marathi">🟠 Marathi Only</option>
              <option value="ALL">🌐 ALL Languages</option>
            </select>
          </div>
        </div>

        {/* YouTube Preview */}
        {inputMode === 'youtube' && youtubeUrl && extractVideoId(youtubeUrl) && (
          <div className="mb-6 rounded-xl overflow-hidden border border-red-500/20">
            <iframe
              width="100%"
              height="250"
              src={`https://www.youtube.com/embed/${extractVideoId(youtubeUrl)}`}
              title="YouTube Preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="bg-black"
            />
          </div>
        )}

        <div className="flex justify-center gap-4">
          {inputMode === 'topic' ? (
            <button
              onClick={handleProcess}
              disabled={isProcessing || !topic.trim()}
              className="group relative px-12 py-4 bg-brand-cyan text-brand-dark font-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isProcessing ? '⏳ GENERATING NOTES...' : '📝 GENERATE NOTES'}
            </button>
          ) : (
            <button
              onClick={handleYoutubeProcess}
              disabled={isProcessing || !youtubeUrl.trim() || !youtubeTopic.trim()}
              className="group relative px-12 py-4 bg-red-600 text-white font-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isProcessing ? '⏳ EXTRACTING TRANSCRIPT...' : '▶️ GENERATE FROM YOUTUBE'}
            </button>
          )}
        </div>
      </div>

      {/* Results — Tab bar (Notes / PPT) when a topic is set */}
      {(result || topic.trim()) && (
        <div>
          {/* Tab bar */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'notes' ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-brand-cyan/20' : 'bg-brand-dark border border-brand-border text-gray-400 hover:text-white'}`}
            >
              📝 Notes
            </button>
            <button
              onClick={() => { setActiveTab('ppt'); if (pptSlides.length === 0 && topic.trim()) handleGeneratePPT(); }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'ppt' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-brand-dark border border-brand-border text-gray-400 hover:text-white'}`}
            >
              🎨 PPT Presentation
            </button>
          </div>

          {/* ===== NOTES TAB ===== */}
          {activeTab === 'notes' && result && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">
                  {viewingNote ? `📖 Viewing: ${viewingNote.topic}` : 'Generated Notes'}
                </h3>
                <div className="flex items-center gap-3">
                  {saveMsg && <span className="text-green-400 text-sm font-bold animate-pulse">{saveMsg}</span>}
                  {viewingNote && (
                    <button
                      onClick={() => { setViewingNote(null); setVidyaResult(null); }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-500 transition-all text-sm"
                    >
                      ✕ Close View
                    </button>
                  )}
                  {!viewingNote && (
                    <button
                      onClick={handleSaveNotes}
                      className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-500 transition-all"
                    >
                      💾 Save Notes
                    </button>
                  )}
                </div>
              </div>

              <div className={`grid grid-cols-1 ${selectedLanguage === 'ALL' ? 'lg:grid-cols-3' : ''} gap-6`}>
                {showEnglish && (
                  <div className="bg-brand-dark-blue border-t-4 border-brand-cyan border border-brand-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-brand-cyan mb-4">🇬🇧 English Notes</h3>
                    {result.notes ? (
                      <>
                        <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed mb-4">{result.notes}</div>
                        <div className="border-t border-brand-border pt-4">
                          <TTSPlayer text={result.notes} language="English" />
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 italic text-sm">English notes not available.</p>
                    )}
                  </div>
                )}
                {showHindi && (
                  <div className="bg-brand-dark-blue border-t-4 border-orange-500 border border-brand-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-orange-500 mb-4">🇮🇳 Hindi Notes</h3>
                    {result.notesHindi ? (
                      <>
                        <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed mb-4">{result.notesHindi}</div>
                        <div className="border-t border-brand-border pt-4">
                          <TTSPlayer text={result.notesHindi} language="Hindi" />
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 italic text-sm">Hindi notes not available.</p>
                    )}
                  </div>
                )}
                {showMarathi && (
                  <div className="bg-brand-dark-blue border-t-4 border-emerald-500 border border-brand-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-emerald-500 mb-4">🟠 Marathi Notes</h3>
                    {result.notesMarathi ? (
                      <>
                        <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed mb-4">{result.notesMarathi}</div>
                        <div className="border-t border-brand-border pt-4">
                          <TTSPlayer text={result.notesMarathi} language="Marathi" />
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 italic text-sm">Marathi notes not available.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Practice Quiz */}
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
                    <button onClick={() => setQuizData(null)} className="text-xs text-gray-500 hover:text-white">
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

          {/* ===== PPT TAB ===== */}
          {activeTab === 'ppt' && (
            <div className="space-y-6">
              {/* PPT Controls */}
              <div className="flex flex-wrap justify-between items-center gap-4 bg-brand-dark-blue border border-brand-border rounded-2xl p-5">
                <div>
                  <h3 className="text-lg font-bold text-white">🎨 Canva-Style Presentation</h3>
                  <p className="text-xs text-gray-400 mt-1">Topic: <span className="text-brand-cyan font-semibold">{topic}</span></p>
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  {/* Template Selector */}
                  <div className="flex gap-1.5">
                    {(Object.entries(TEMPLATES) as [PPTTemplate, any][]).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => setPptTemplate(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${pptTemplate === key ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan' : 'border-brand-border text-gray-400 hover:text-white'}`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleGeneratePPT}
                    disabled={isGeneratingPPT || !topic.trim()}
                    className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-purple-500 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGeneratingPPT ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                    ) : (
                      '🔄 Regenerate'
                    )}
                  </button>
                </div>
              </div>

              {/* Loading state */}
              {isGeneratingPPT && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-purple-500/30 rounded-full" />
                    <div className="absolute inset-0 w-20 h-20 border-4 border-t-purple-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🎨</div>
                  </div>
                  <p className="text-purple-400 font-bold animate-pulse">Generating rich presentation slides...</p>
                  <p className="text-gray-500 text-xs">Using AI to create Canva-style content</p>
                </div>
              )}

              {/* Empty state */}
              {!isGeneratingPPT && pptSlides.length === 0 && (
                <div className="text-center py-20 bg-brand-dark-blue border border-brand-border rounded-2xl">
                  <div className="text-5xl mb-4">🎨</div>
                  <p className="text-gray-400">Click the PPT tab to generate beautiful presentation slides</p>
                  <button
                    onClick={handleGeneratePPT}
                    disabled={!topic.trim()}
                    className="mt-4 bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-500 transition-all"
                  >
                    Generate Presentation
                  </button>
                </div>
              )}

              {/* Slides Grid */}
              {!isGeneratingPPT && pptSlides.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pptSlides.map((slide: any, idx: number) => {
                    const layout = slide.layout || 'bullets';
                    const colors = LAYOUT_COLORS[layout] || LAYOUT_COLORS['bullets'];
                    const visualIcon = VISUAL_TYPE_ICONS[slide.visual_type] || '📄';
                    const hasSpeakerNotes = !!slide.speaker_notes;
                    const notesExpanded = expandedNotes.has(idx);

                    return (
                      <div
                        key={idx}
                        className={`${tmpl.cardBg} border-l-4 ${colors.border} border border-brand-border rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:shadow-brand-cyan/5 group`}
                      >
                        {/* Slide Header */}
                        <div className="p-5 pb-2">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${colors.badge}`}>
                                {colors.icon} {layout.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">Slide {idx + 1}</span>
                            </div>
                            <span className="text-lg">{visualIcon}</span>
                          </div>
                          <h3 className={`text-lg font-black ${tmpl.title} leading-tight`}>{slide.title}</h3>
                        </div>

                        {/* Points */}
                        <div className="px-5 pb-4">
                          <ul className="space-y-2 mt-3">
                            {(slide.points || []).map((point: string, pi: number) => (
                              <li key={pi} className="flex items-start gap-2 text-sm text-gray-300">
                                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.badgeText}`} />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Example */}
                        {slide.example && (
                          <div className="mx-5 mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">💡 Example</p>
                            <p className="text-xs text-gray-300 italic">{slide.example}</p>
                          </div>
                        )}

                        {/* Design Hint */}
                        {slide.design_hint && (
                          <div className="px-5 mb-3">
                            <p className="text-[10px] text-gray-500">
                              <span className="font-bold">🎨 Design:</span> {slide.design_hint}
                            </p>
                          </div>
                        )}

                        {/* Speaker Notes Toggle */}
                        {hasSpeakerNotes && (
                          <div className="border-t border-brand-border">
                            <button
                              onClick={() => toggleSpeakerNotes(idx)}
                              className="w-full px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-300 flex items-center justify-between transition-all hover:bg-white/5"
                            >
                              <span>🎤 Speaker Notes</span>
                              <span>{notesExpanded ? '▲ Hide' : '▼ Show'}</span>
                            </button>
                            {notesExpanded && (
                              <div className="px-5 pb-4">
                                <p className="text-xs text-gray-400 italic leading-relaxed bg-black/20 p-3 rounded-lg">
                                  {slide.speaker_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VidyaAI;
