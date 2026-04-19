import React, { useState, useEffect, useRef } from 'react';
import { Quiz, User, Submission, SharedContent, GeneratedLecture, CaseStudy, FAQ, AttendanceSession, VideoLecture, CurriculumPlan, CurriculumTopic, Assignment, AssignmentSubmission, StudentPerformance } from '../types';
import { 
  HomeIcon, QuizIcon, FileTextIcon, UserCheckIcon, SparklesIcon, ShareIcon, EyeIcon, 
  SummarizeIcon, TranslateIcon, BookOpenIcon, AIGeneratorIcon, CloseIcon, UploadIcon, SearchIcon, HelpCircleIcon, LogoutIcon, CheckCircleIcon, VisualizationIcon, ImageIcon, SpeakerIcon, FileSpreadsheetIcon 
} from './Icons';
import TTSPlayer from './TTSPlayer';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import SmartSearch from './SmartSearch';
import Sidebar from './Sidebar';
import { summarizeText, translateText, analyzeImageContent, getExplanation, generateQuiz } from '../services/aiService';
import VidyaAI from './VidyaAI';

declare global {
  interface Window { mammoth: any; XLSX: any; pdfjsLib: any; pptx: any; }
}

interface StudentPortalProps {
  quizzes: Quiz[];
  onLogout: () => void;
  user: User;
  addSubmission: (submission: Omit<Submission, 'submittedAt'>) => Promise<void>;
  studentSubmissions: Submission[];
  sharedContent: SharedContent[];
  generatedLectures: GeneratedLecture[];
  generatedCaseStudies: CaseStudy[];
  faqs: FAQ[];
  attendanceSessions: AttendanceSession[];
  addAttendanceRecord: (record: any) => Promise<void>;
  videoLectures: VideoLecture[];
  curriculumPlans: CurriculumPlan[];
  assistanceDisabled: boolean;
  submitAttendance: (otp: string) => Promise<void>;
  updateLectureProgress: (lectureId: string, progress: number) => Promise<void>;
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
  addAssignmentSubmission: (s: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => Promise<void>;
  studentPerformance: StudentPerformance[];
  addStudentPerformance: (p: Omit<StudentPerformance, 'id' | 'timestamp'>) => Promise<void>;
  isOfflineMode: boolean;
  toggleOfflineMode: (val: boolean) => void;
  /** Called on mount so VoiceController can navigate between pages */
  onVoiceReady?: (navigate: (page: string) => void) => void;
}

// ---- Reused sub-components ----
const PerformanceInsights: React.FC<{ performance: StudentPerformance[], onStartPracticeQuiz: (topic: string) => void }> = ({ performance, onStartPracticeQuiz }) => {
  if (performance.length === 0) return null;
  const latest = performance[performance.length - 1];
  const analysis = latest.analysis as any;

  return (
    <div className="bg-brand-dark p-6 rounded-xl border border-brand-border mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-brand-cyan flex items-center gap-2">
          <VisualizationIcon /> AI Learning Brain: {latest.topic}
        </h2>
        <span className="text-sm text-gray-400">Score: {latest.score}/{latest.totalQuestions}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 rounded-lg bg-red-900/10 border border-red-500/20">
          <h3 className="font-bold text-red-400 mb-2">🚩 Weak Topics</h3>
          <ul className="text-sm space-y-1 mb-4">
            {analysis.weak_topics?.map((t: string, i: number) => <li key={i}>• {t}</li>)}
          </ul>
          {analysis.reason && (
             <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
               <p className="text-xs font-bold text-red-400 uppercase mb-1">Reason:</p>
               <p className="text-xs text-gray-300">{analysis.reason}</p>
             </div>
          )}
        </div>
        <div className="p-4 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20">
          <h3 className="font-bold text-brand-cyan mb-2">🚀 What to Learn Next</h3>
          <ul className="text-sm space-y-1">
            {analysis.what_to_learn_next?.map((t: string, i: number) => <li key={i}>• {t}</li>)}
          </ul>
          {analysis.motivation && (
             <p className="mt-4 p-3 bg-brand-cyan/20 rounded-lg text-xs italic text-brand-cyan border border-brand-cyan/30">
               "{analysis.motivation}"
             </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-brand-dark-blue p-5 rounded-xl border border-brand-border">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">📚 Recommended Books</h3>
          <div className="space-y-3">
            {analysis.books?.map((b: any, i: number) => (
              <a
                key={i}
                href={`https://www.google.com/search?q=${encodeURIComponent((b.name || b.title) + ' book')}&tbm=bks`}
                target="_blank"
                rel="noreferrer"
                className="block text-xs border-l-2 border-brand-cyan pl-3 hover:bg-brand-cyan/5 p-2 rounded-r-lg transition-all group"
              >
                <p className="font-bold text-white group-hover:text-brand-cyan transition-colors">{b.name || b.title}
                  <span className="text-[10px] text-brand-cyan ml-2 opacity-0 group-hover:opacity-100 transition-opacity">🔗 Find Book</span>
                </p>
                <p className="text-gray-400 mt-0.5">{b.reason}</p>
              </a>
            ))}
          </div>
        </div>
        <div className="bg-brand-dark-blue p-5 rounded-xl border border-brand-border">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">🎥 YouTube Resources</h3>
          <div className="space-y-3">
            {analysis.youtube?.map((y: any, i: number) => (
              <a key={i} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(y.query)}`} target="_blank" rel="noreferrer" className="block p-3 bg-brand-dark rounded-lg hover:border-brand-cyan border border-brand-border transition-all">
                <p className="text-xs font-bold text-brand-cyan mb-1">{y.topic}</p>
                <p className="text-[10px] text-gray-500">{y.query}</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div>
        <button 
          onClick={() => onStartPracticeQuiz(analysis.weak_topics?.[0] || latest.topic)}
          className="bg-brand-cyan text-brand-dark font-bold py-3 px-8 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-brand-cyan/20"
        >
          <SparklesIcon /> Generate Targeted Practice Quiz
        </button>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number }> = ({ title, value }) => (
  <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
    <p className="text-sm text-gray-400">{title}</p>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);

const FAQPage: React.FC<{ faqs: FAQ[] }> = ({ faqs }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-2">Help Center & FAQ</h2>
        <p className="text-gray-400 mb-8">Find answers to common questions about the platform and your courses.</p>
        
        {faqs.length === 0 ? (
          <div className="text-center py-12 bg-brand-dark rounded-lg">
            <HelpCircleIcon />
            <p className="text-gray-500 mt-4">No FAQs available at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-brand-dark rounded-xl border border-brand-border overflow-hidden transition-all">
                <button 
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-brand-cyan/5 transition-colors"
                >
                  <span className="font-bold text-lg">{faq.question}</span>
                  <span className={`transform transition-transform ${openIndex === index ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openIndex === index && (
                  <div className="p-6 pt-0 text-gray-400 border-t border-brand-border leading-relaxed bg-brand-cyan/5">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-brand-cyan/10 border border-brand-cyan/30 rounded-xl p-8 flex items-center gap-6">
        <div className="w-16 h-16 bg-brand-cyan/20 rounded-full flex items-center justify-center text-3xl shadow-lg">💡</div>
        <div>
          <h3 className="text-xl font-bold text-brand-cyan mb-1">Still need help?</h3>
          <p className="text-sm text-gray-400">Ask the AI Doubt Solver for immediate assistance with your educational queries.</p>
        </div>
      </div>
    </div>
  );
};

// ---- Home Page ----
const HomePage: React.FC<{ user: User, quizzes: Quiz[], userSubmissions: Submission[], sharedContent: SharedContent[], onStartQuiz: (quiz: Quiz) => void }> = ({ user, quizzes, userSubmissions, sharedContent, onStartQuiz }) => {
  const completedQuizIds = new Set(userSubmissions.map(s => s.quizId));
  const availableQuizzes = quizzes.filter(q => !completedQuizIds.has(q.id));
  const nextQuiz = availableQuizzes[0];
  const recentContent = sharedContent.slice(0, 3);
  
  // Calculate daily progress
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const completedToday = [
    ...userSubmissions.filter(s => new Date(s.submittedAt).getTime() >= startOfToday),
    ...sharedContent.filter(c => c.status === 'published' && false) // Logic for other content types
  ].length;
  
  const totalPossibleScore = userSubmissions.reduce((acc, s) => acc + s.totalQuestions, 0);
  const totalScore = userSubmissions.reduce((acc, s) => acc + s.score, 0);
  const averageScore = totalPossibleScore > 0 ? ((totalScore / totalPossibleScore) * 100).toFixed(0) : 0;
  
  const [isStudying, setIsStudying] = useState(false);
  const [studyPlan, setStudyPlan] = useState<any[] | null>(null);
  const [studyBlitz, setStudyBlitz] = useState<string | null>(null);
  const [targetTopic, setTargetTopic] = useState('');

  const handleStudyBlitz = async () => {
    setIsStudying(true);
    setStudyPlan(null);
    setStudyBlitz(null);
    try {
      const studyTopic = targetTopic.trim() || quizzes.map(q => q.topic).slice(0, 3).join(', ');
      // Try structured study plan endpoint first
      const resp = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: studyTopic }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.plan && Array.isArray(data.plan) && data.plan.length > 0) {
          setStudyPlan(data.plan);
          return;
        }
      }
      // Fallback: plain text
      const summary = await getExplanation(`Generate a high-impact 15-minute study roadmap for: ${studyTopic}. Use bullet points.`, 'English');
      setStudyBlitz(summary);
    } catch (e: any) {
      console.error('Study plan failed:', e.message);
    } finally {
      setIsStudying(false);
    }
  };

  return (
    <div className="space-y-8">
      <div><h2 className="text-3xl font-bold">Welcome back, {user.name}!</h2><p className="text-gray-400">Ready to learn something new today?</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Done Today" value={completedToday} />
        <StatCard title="Available Quizzes" value={availableQuizzes.length} />
        <StatCard title="Completed Quizzes" value={userSubmissions.length} />
        <StatCard title="Overall Score" value={`${averageScore}%`} />
      </div>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><SparklesIcon className="text-brand-cyan" /> Personalized Study Planner</h3>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Topic to Master</label>
            <input 
              type="text" 
              value={targetTopic} 
              onChange={e => setTargetTopic(e.target.value)}
              placeholder="e.g., Java OOPS, Photosynthesis, Calculus..." 
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none transition-all"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleStudyBlitz} 
              disabled={isStudying} 
              className="w-full md:w-auto bg-brand-cyan text-white font-bold py-3 px-8 rounded-lg hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-cyan/20"
            >
              {isStudying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <SparklesIcon />}
              {isStudying ? 'Crafting Roadmap...' : 'Generate Study Plan'}
            </button>
          </div>
        </div>

        {studyPlan && studyPlan.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-brand-cyan font-bold flex items-center gap-2 italic uppercase tracking-wider text-sm"><SparklesIcon /> {targetTopic ? `7-Day Plan: ${targetTopic}` : 'Personalized Study Plan'}</h4>
              <button onClick={() => setStudyPlan(null)} className="text-xs text-gray-500 hover:text-white transition-colors">Close</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {studyPlan.map((day: any, idx: number) => (
                <div key={idx} className="bg-brand-dark rounded-xl border border-brand-border p-4 hover:border-brand-cyan/40 transition-all group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-brand-cyan/20 text-brand-cyan text-xs font-black flex items-center justify-center border border-brand-cyan/30">D{day.day}</span>
                    <span className="text-xs font-bold text-brand-cyan truncate">{day.topic}</span>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {(day.tasks || []).map((task: string, ti: number) => (
                      <li key={ti} className="text-[11px] text-gray-400 flex items-start gap-1">
                        <span className="text-brand-cyan mt-0.5 flex-shrink-0">•</span> {task}
                      </li>
                    ))}
                  </ul>
                  {day.practice && (
                    <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-2 mb-2">
                      <p className="text-[10px] font-bold text-purple-400 mb-0.5">📝 Practice</p>
                      <p className="text-[10px] text-gray-400">{day.practice}</p>
                    </div>
                  )}
                  {day.time && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">⏱️ {day.time}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {studyBlitz && (
          <div className="bg-brand-dark p-6 rounded-lg border-2 border-brand-cyan/30">
            <div className="flex justify-between items-center mb-4">
               <h4 className="text-brand-cyan font-bold flex items-center gap-2 italic uppercase tracking-wider text-sm"><SparklesIcon /> {targetTopic ? `Mastery: ${targetTopic}` : 'Rapid Mastery Roadmap'}</h4>
               <button onClick={() => setStudyBlitz(null)} className="text-xs text-gray-500 hover:text-white transition-colors">Close</button>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{studyBlitz}</div>
            <div className="mt-6 pt-4 border-t border-brand-border">
               <TTSPlayer text={studyBlitz} language={'English'} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Up Next</h3>
            </div>
            {nextQuiz ? (
              <div className="bg-brand-dark p-4 rounded-lg">
                <p className="text-sm text-gray-400">Next Quiz</p>
                <h4 className="text-xl font-bold my-2">{nextQuiz.topic}</h4>
                <p className="text-sm text-gray-400 mb-4">{nextQuiz.questions.length} questions</p>
                <button onClick={() => onStartQuiz(nextQuiz)} className="w-full bg-brand-cyan text-white font-bold py-3 rounded-lg hover:bg-cyan-500 transition-colors">Start Quiz</button>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-center bg-brand-dark rounded-lg"><div><CheckCircleIcon /><p className="font-semibold mt-2">Daily Goal Achieved!</p><p className="text-sm text-gray-400">You've completed all available content.</p></div></div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 h-full">
            <h3 className="text-2xl font-bold mb-4">Recently Added Content</h3>
            {recentContent.length > 0 ? (
              <div className="space-y-3">
                {recentContent.map(item => (
                  <div key={item.id} className="bg-brand-dark p-3 rounded-md flex items-center gap-3">
                    {item.type === 'image' ? <ImageIcon/> : <FileTextIcon/>}
                    <div><p className="font-semibold">{item.title}</p><p className="text-xs text-gray-400">{item.description}</p></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No new content has been shared.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Live Facial Attendance Component ----
const LiveFaceAttendance: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'active' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing Face Tracker...');

  useEffect(() => {
    let faceLandmarker: FaceLandmarker;
    let stream: MediaStream;
    let requestNum: number;
    let blinkDetected = false;

    const setup = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('active');
          setMessage("Face Tracker Active. Please BLINK normally to mark attendance.");
          predictWebcam();
        }
      } catch (err) {
        setStatus('error');
        setMessage("Could not access webcam or load AI model. Please ensure permissions are granted.");
      }
    };

    const predictWebcam = async () => {
      if (!videoRef.current || blinkDetected) return;
      const startTimeMs = performance.now();
      const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

      if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const shapes = results.faceBlendshapes[0].categories;
        const leftBlink = shapes.find(c => c.categoryName === 'eyeBlinkLeft')?.score || 0;
        const rightBlink = shapes.find(c => c.categoryName === 'eyeBlinkRight')?.score || 0;

        if (leftBlink > 0.4 && rightBlink > 0.4) {
          blinkDetected = true;
          setStatus('success');
          setMessage("Blink Verified! Marking attendance...");
          onVerified();
          return;
        }
      }
      requestNum = requestAnimationFrame(predictWebcam);
    };

    setup();

    return () => {
      if (requestNum) cancelAnimationFrame(requestNum);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (faceLandmarker) faceLandmarker.close();
    };
  }, [onVerified]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-80 h-60 rounded-lg overflow-hidden bg-black border-2 border-brand-cyan mb-4">
        <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]" />
        {status === 'loading' && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70"><div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>}
        {status === 'success' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900 bg-opacity-80 text-white"><CheckCircleIcon/><span className="font-bold mt-2">Verified!</span></div>}
      </div>
      <p className={`text-center font-bold ${status === 'error' ? 'text-red-500' : 'text-brand-cyan'}`}>{message}</p>
    </div>
  );
};

// ---- Attendance Page (read-only history for students) ----
const AttendancePage: React.FC<{ user: User; sessions: AttendanceSession[], submitAttendance: (o: string) => Promise<void> }> = ({ user, sessions, submitAttendance }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const activeSession = sessions.find(s => s.isActive);
  const alreadyMarked = activeSession?.records.some(r => r.studentName === user.name);

  const myRecords: { date: string; present: boolean }[] = sessions.map(s => ({
    date: s.date,
    present: s.records.some(r => r.studentName === user.name),
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const presentCount = myRecords.filter(r => r.present).length;
  const attendancePct = myRecords.length > 0 ? Math.round((presentCount / myRecords.length) * 100) : 0;

  const handleFaceVerified = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      // Send a specialized string for automated OTP systems via face tracking 
      await submitAttendance('live-blink');
      setFeedback({ type: 'success', message: 'Attendance marked automatically via Face Verification!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit attendance.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {feedback && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-green-700 bg-green-950/40 text-green-300' : 'border-red-700 bg-red-950/40 text-red-300'}`}>
          {feedback.message}
        </div>
      )}

      {activeSession && !alreadyMarked && (
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Live Face Attendance</h2>
          <p className="text-gray-400 mb-6">Your teacher has started an attendance session. Please look at the camera and blink to verify your presence.</p>
          <LiveFaceAttendance onVerified={handleFaceVerified} />
        </div>
      )}

      {alreadyMarked && (
        <div className="bg-green-950/40 border border-green-700 rounded-lg p-6 flex items-center gap-4 text-green-300">
          <CheckCircleIcon />
          <div>
            <h3 className="font-bold text-lg">You are marked present!</h3>
            <p className="text-sm opacity-80">Your attendance for today's session has been successfully recorded.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Sessions" value={myRecords.length} />
        <StatCard title="Sessions Attended" value={presentCount} />
        <StatCard title="Attendance %" value={`${attendancePct}%`} />
      </div>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">My Attendance History</h2>
        {myRecords.length === 0 ? <p className="text-gray-500">No attendance sessions recorded yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-brand-dark"><tr><th className="p-3">Date</th><th className="p-3">Status</th></tr></thead>
              <tbody>
                {myRecords.map((r, i) => (
                  <tr key={i} className="border-b border-brand-border">
                    <td className="p-3">{new Date(r.date).toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    <td className="p-3"><span className={`font-semibold ${r.present ? 'text-green-400' : 'text-red-400'}`}>{r.present ? '✓ Present' : '✗ Absent'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Quizzes Page (with Practice tab) ----
const QuizzesPage: React.FC<{
  availableQuizzes: Quiz[], completedQuizzes: Quiz[], userSubmissions: Submission[],
  quizResult: { score: number; total: number } | null, onStartQuiz: (quiz: Quiz) => void,
  user: User, addStudentPerformance: (p: any) => Promise<void>, isOfflineMode: boolean
}> = ({ availableQuizzes, completedQuizzes, userSubmissions, quizResult, onStartQuiz, user, addStudentPerformance, isOfflineMode }) => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'practice'>('assigned');
  const [practiceTab, setPracticeTab] = useState<'form' | 'taking' | 'result'>('form');
  const [practiceTopic, setPracticeTopic] = useState('');
  const [practiceQuiz, setPracticeQuiz] = useState<Omit<Quiz, 'id' | 'classCode'> | null>(null);
  const [practiceResult, setPracticeResult] = useState<{ score: number; total: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [practiceQIndex, setPracticeQIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<(number | null)[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [practiceInsights, setPracticeInsights] = useState<any>(null);

  const handleGeneratePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceTopic.trim()) return;
    setIsGenerating(true); setPracticeError(null); setPracticeQuiz(null);
    try {
      const quiz = await generateQuiz(practiceTopic, 5, 'Medium');
      setPracticeQuiz(quiz);
      setPracticeAnswers(Array(quiz.questions.length).fill(null));
      setPracticeQIndex(0);
      setPracticeTab('taking');
    } catch (err: any) { setPracticeError(err.message || 'Failed to generate practice quiz.'); }
    finally { setIsGenerating(false); }
  };

  const handlePracticeSubmit = async () => {
    if (!practiceQuiz) return;
    let score = 0;
    const incorrect = [] as any[];
    practiceQuiz.questions.forEach((q, i) => { 
      if (practiceAnswers[i] === q.correctAnswerIndex) score++; 
      else incorrect.push({ question: q.questionText, answer: practiceAnswers[i] !== null ? q.options[practiceAnswers[i]!] : 'No Answer' });
    });
    const total = practiceQuiz.questions.length;
    setPracticeResult({ score, total });
    setPracticeTab('result');

    // AI Analysis for Practice
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: practiceQuiz.topic,
          score,
          total,
          wrong_questions: incorrect.map(ia => ia.question),
          mistakes: []
        })
      });

      if (response.ok) {
        const result = await response.json();
        let rawResponse = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
        
        let insights: any = { weak_topics: [], strong_topics: [], study_plan: [] };
        try {
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
          const jsonText = jsonMatch ? jsonMatch[0] : rawResponse;
          insights = JSON.parse(jsonText);
        } catch (e) {
          console.error("Practice AI parse failed", e);
        }
        
        setPracticeInsights(insights);
        
        if (addStudentPerformance) {
           await addStudentPerformance({
             studentEmail: user.email,
             quizId: `practice-${Date.now()}`,
             topic: practiceQuiz.topic,
             score,
             totalQuestions: total,
             analysis: {
                weak_topics: Array.isArray(insights.weak_topics) ? insights.weak_topics : [],
                strong_topics: Array.isArray(insights.strong_topics) ? insights.strong_topics : [],
                medium_topics: [],
                mistake_analysis: [],
                study_plan: Array.isArray(insights.study_plan) ? insights.study_plan : [],
                practice_questions: []
             }
           });
        }
      }
    } catch (err) {
      console.error("Practice analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetPractice = () => { setPracticeTab('form'); setPracticeQuiz(null); setPracticeResult(null); setPracticeTopic(''); setPracticeError(null); };

  return (
    <div className="space-y-8">
      <div className="flex bg-brand-dark rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('assigned')} className={`py-2 px-6 rounded-md transition-colors ${activeTab === 'assigned' ? 'bg-brand-cyan text-white' : 'text-gray-400 hover:bg-brand-border'}`}>Assigned Quizzes</button>
        <button onClick={() => setActiveTab('practice')} className={`py-2 px-6 rounded-md transition-colors ${activeTab === 'practice' ? 'bg-brand-cyan text-white' : 'text-gray-400 hover:bg-brand-border'}`}>Practice Mode</button>
      </div>

      {activeTab === 'assigned' && (
        <>
          {quizResult && (
            <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 text-center">
              <CheckCircleIcon /><h2 className="text-2xl font-bold text-green-400">Quiz Completed!</h2>
              <p className="text-4xl mt-4">Your Score: {quizResult.score} / {quizResult.total}</p>
            </div>
          )}
          <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Available Quizzes</h2>
            {availableQuizzes.length === 0 ? <p className="text-gray-400">No new quizzes available. Check back later!</p> : (
              <div className="space-y-4">
                {availableQuizzes.map(quiz => (
                  <div key={quiz.id} className="flex justify-between items-center bg-brand-dark p-4 rounded-md">
                    <div><h3 className="text-xl font-semibold">{quiz.topic}</h3><p className="text-gray-400">{quiz.questions.length} Questions</p></div>
                    <button onClick={() => onStartQuiz(quiz)} className="bg-brand-cyan text-white font-semibold py-2 px-4 rounded-lg hover:bg-cyan-500 flex items-center gap-2"><BookOpenIcon /> Start Quiz</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Completed Quizzes</h2>
            {completedQuizzes.length === 0 ? <p className="text-gray-400">You haven't completed any quizzes yet.</p> : (
              <div className="space-y-4">
                {completedQuizzes.map(quiz => {
                  const submission = userSubmissions.find(s => s.quizId === quiz.id);
                  return (
                    <div key={quiz.id} className="flex justify-between items-center bg-brand-dark p-4 rounded-md opacity-70">
                      <div><h3 className="text-xl font-semibold">{quiz.topic}</h3><p className="text-gray-400">{quiz.questions.length} Questions</p></div>
                      {submission && <div className="text-right"><p className="font-bold text-lg">{submission.score} / {submission.totalQuestions}</p><p className="text-xs text-gray-500">Completed</p></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'practice' && (
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-2">AI Practice Quiz</h2>
          <p className="text-gray-400 mb-6">Generate a practice quiz on any topic. Results are for self-assessment only and won't affect your score.</p>

          {practiceTab === 'form' && (
            <form onSubmit={handleGeneratePractice} className="space-y-4 max-w-md">
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Practice Topic</label><input type="text" value={practiceTopic} onChange={e => setPracticeTopic(e.target.value)} required placeholder="e.g., Python decorators, World War II, Calculus" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
              <button type="submit" disabled={isGenerating} className="bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center gap-2">
                {isGenerating ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Generating...</> : 'Generate Practice Quiz'}
              </button>
              {practiceError && <p className="text-red-500 text-sm">{practiceError}</p>}
            </form>
          )}

          {practiceTab === 'taking' && practiceQuiz && (
            <div>
              <h3 className="text-xl font-bold mb-2">{practiceQuiz.topic}</h3>
              <p className="text-gray-400 mb-6">Question {practiceQIndex + 1} of {practiceQuiz.questions.length}</p>
              <div className="bg-brand-dark p-6 rounded-lg mb-6">
                <p className="text-lg font-semibold mb-4">{practiceQuiz.questions[practiceQIndex].questionText}</p>
                <div className="space-y-3">
                  {practiceQuiz.questions[practiceQIndex].options.map((opt, i) => (
                    <button key={i} onClick={() => { const a = [...practiceAnswers]; a[practiceQIndex] = i; setPracticeAnswers(a); }} className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${practiceAnswers[practiceQIndex] === i ? 'bg-brand-cyan border-cyan-300 text-white' : 'bg-brand-dark-blue border-brand-border hover:border-brand-cyan'}`}>{opt}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                {practiceQIndex > 0 && <button onClick={() => setPracticeQIndex(p => p - 1)} className="bg-brand-dark-blue border border-brand-border text-white font-semibold py-2 px-6 rounded-lg hover:border-brand-cyan">Previous</button>}
                {practiceQIndex < practiceQuiz.questions.length - 1 ? (
                  <button onClick={() => setPracticeQIndex(p => p + 1)} className="bg-brand-cyan text-white font-semibold py-2 px-6 rounded-lg hover:bg-cyan-500">Next</button>
                ) : (
                  <button onClick={handlePracticeSubmit} className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700">Submit Practice Quiz</button>
                )}
              </div>
            </div>
          )}

          {practiceTab === 'result' && practiceResult && practiceQuiz && (
            <div className="text-center">
              <CheckCircleIcon />
              <h3 className="text-2xl font-bold text-green-400 mt-2">Practice Complete!</h3>
              <p className="text-4xl font-bold mt-4">{practiceResult.score} / {practiceResult.total}</p>
              <p className="text-gray-400 mt-2">{Math.round((practiceResult.score / practiceResult.total) * 100)}% correct</p>

              {isAnalyzing && (
                 <div className="mt-8 bg-brand-dark p-6 rounded-xl border border-brand-cyan/30 flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-brand-cyan font-semibold italic">Updating AI Learning Brain with stats...</span>
                 </div>
              )}

              {practiceInsights && (
                 <div className="mt-8 bg-brand-dark-blue border border-brand-border rounded-xl p-6 text-left space-y-6">
                    <div className="flex items-center gap-2 text-brand-cyan font-bold border-b border-brand-border pb-2"><SparklesIcon /> AI Practice Insights</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">🔴 Focus Areas</h4>
                          <ul className="text-xs space-y-1 text-gray-300">
                             {practiceInsights.weak_topics?.map((t: string, i: number) => <li key={i}>• {t}</li>)}
                          </ul>
                       </div>
                       <div>
                          <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2">🟢 Mastery</h4>
                          <ul className="text-xs space-y-1 text-gray-300">
                             {practiceInsights.strong_topics?.map((t: string, i: number) => <li key={i}>• {t}</li>)}
                          </ul>
                       </div>
                    </div>
                 </div>
              )}

              <div className="mt-8 space-y-4 text-left">
                {practiceQuiz.questions.map((q, i) => (
                  <div key={i} className={`bg-brand-dark p-4 rounded-lg border-l-4 ${practiceAnswers[i] === q.correctAnswerIndex ? 'border-green-400' : 'border-red-500'}`}>
                    <p className="font-semibold mb-2">{i + 1}. {q.questionText}</p>
                    <p className="text-sm text-green-400">✓ Correct: {q.options[q.correctAnswerIndex]}</p>
                    {practiceAnswers[i] !== q.correctAnswerIndex && practiceAnswers[i] !== null && <p className="text-sm text-red-400">✗ Your answer: {q.options[practiceAnswers[i]!]}</p>}
                  </div>
                ))}
              </div>
              <button onClick={resetPractice} className="mt-6 bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500">Try Another Topic</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---- Analysis Page (AI Learning Brain) ----
const AnalysisPage: React.FC<{ 
  submissions: Submission[], 
  quizzes: Quiz[],
  performance: StudentPerformance[] 
}> = ({ submissions, quizzes, performance }) => {
  const safeSubmissions = Array.isArray(submissions) ? submissions.filter(s => s && typeof s === 'object' && s.score !== undefined) : [];
  const safePerformance = Array.isArray(performance) ? performance.filter(p => p && p.analysis) : [];

  try {
    const totalScore = safeSubmissions.reduce((acc, sub) => acc + (Number(sub.score) || 0), 0);
    const totalPossible = safeSubmissions.reduce((acc, sub) => acc + (Number(sub.totalQuestions) || 0), 0);
    const avgPct = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    // Trend: compare last 2 submissions
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (safeSubmissions.length >= 2) {
      const last = safeSubmissions[safeSubmissions.length - 1];
      const prev = safeSubmissions[safeSubmissions.length - 2];
      const lastPct = last.totalQuestions > 0 ? (last.score / last.totalQuestions) * 100 : 0;
      const prevPct = prev.totalQuestions > 0 ? (prev.score / prev.totalQuestions) * 100 : 0;
      trend = lastPct > prevPct ? 'up' : lastPct < prevPct ? 'down' : 'stable';
    }

    // Latest AI insights (the richest data source)
    const latest = safePerformance.length > 0 ? safePerformance[safePerformance.length - 1] : null;
    const latestAnalysis = latest?.analysis as any;

    // Aggregate across all for overview columns
    const allWeakAreas = Array.from(new Set(safePerformance.flatMap(p => (p?.analysis as any)?.weak_topics || []))).filter(Boolean);
    const allStrongAreas = Array.from(new Set(safePerformance.flatMap(p => (p?.analysis as any)?.strong_topics || []))).filter(Boolean);

    if (safeSubmissions.length === 0) {
      return (
        <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-brand-cyan/10 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🧠</div>
          <h2 className="text-3xl font-bold mb-4 text-white">AI Learner Brain</h2>
          <p className="text-gray-400 max-w-md mx-auto">Attempt a quiz to unlock your personalized AI learning analysis.</p>
          <div className="mt-6 p-4 bg-brand-dark rounded-xl border border-brand-border text-sm text-gray-500">
            The AI will analyze your weak topics, recommend books, YouTube videos, and create a personalized study plan.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-dark-blue to-brand-dark border border-brand-border rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-cyan/10 blur-3xl rounded-full" />
          <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
            <div className="w-24 h-24 bg-brand-cyan/20 rounded-full flex items-center justify-center text-4xl border-2 border-brand-cyan/30 animate-pulse shadow-[0_0_40px_rgba(6,182,212,0.2)]">
              🧠
            </div>
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-white mb-1">AI Learner Brain</h2>
              <p className="text-gray-400">Analyzing <span className="text-brand-cyan font-bold">{safeSubmissions.length} assessments</span> · Tracking your cognitive trajectory</p>
              {trend !== 'stable' && (
                <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-xs font-bold ${trend === 'up' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {trend === 'up' ? '📈 Improving since last quiz!' : '📉 Score declined — review weak areas'}
                </div>
              )}
            </div>
            <div className="bg-brand-dark/50 p-6 rounded-2xl border border-brand-border backdrop-blur-md text-center">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Accuracy</p>
              <p className={`text-5xl font-black ${avgPct >= 70 ? 'text-green-400' : avgPct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{avgPct}%</p>
            </div>
          </div>
        </div>

        {/* Latest Quiz Deep Analysis */}
        {latestAnalysis && (
          <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-brand-cyan flex items-center gap-2">🔬 Latest Quiz Analysis: <span className="text-white">{latest?.topic}</span></h3>
              <span className="text-xs text-gray-500 bg-brand-dark px-3 py-1 rounded-full border border-brand-border">
                Score: {latest?.score}/{latest?.totalQuestions}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weak Topics + Reason */}
              <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-5">
                <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">🚩 Weak Topics</h4>
                <ul className="text-sm space-y-1 mb-4">
                  {(latestAnalysis.weak_topics || []).map((t: string, i: number) => (
                    <li key={i} className="flex gap-2 text-gray-300"><span className="text-red-400">•</span>{t}</li>
                  ))}
                  {!(latestAnalysis.weak_topics?.length) && <li className="text-gray-500 italic">No weak topics detected</li>}
                </ul>
                {latestAnalysis.reason && (
                  <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30">
                    <p className="text-xs font-bold text-red-400 uppercase mb-1">Why:</p>
                    <p className="text-xs text-gray-300">{latestAnalysis.reason}</p>
                  </div>
                )}
              </div>

              {/* What to Learn + Motivation */}
              <div className="bg-brand-cyan/5 border border-brand-cyan/20 rounded-xl p-5">
                <h4 className="font-bold text-brand-cyan mb-3">🚀 What to Learn Next</h4>
                <ul className="text-sm space-y-1 mb-4">
                  {(latestAnalysis.what_to_learn_next || []).map((t: string, i: number) => (
                    <li key={i} className="flex gap-2 text-gray-300"><span className="text-brand-cyan">→</span>{t}</li>
                  ))}
                  {!(latestAnalysis.what_to_learn_next?.length) && <li className="text-gray-500 italic">Keep practicing to unlock suggestions</li>}
                </ul>
                {latestAnalysis.motivation && (
                  <p className="text-xs italic text-brand-cyan bg-brand-cyan/20 p-3 rounded-lg border border-brand-cyan/30">
                    💬 "{latestAnalysis.motivation}"
                  </p>
                )}
              </div>
            </div>

            {/* Books + YouTube */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-brand-dark p-5 rounded-xl border border-brand-border">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">📚 Recommended Books</h4>
                <div className="space-y-3">
                  {(latestAnalysis.books || []).map((b: any, i: number) => (
                    <div key={i} className="text-xs border-l-2 border-brand-cyan pl-3">
                      <p className="font-bold text-white">{b.name}</p>
                      <p className="text-gray-400 mt-0.5">{b.reason}</p>
                    </div>
                  ))}
                  {!(latestAnalysis.books?.length) && <p className="text-gray-500 text-xs italic">No book recommendations yet</p>}
                </div>
              </div>
              <div className="bg-brand-dark p-5 rounded-xl border border-brand-border">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">🎥 YouTube Videos</h4>
                <div className="space-y-2">
                  {(latestAnalysis.youtube || []).map((y: any, i: number) => (
                    <a
                      key={i}
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(y.query || y.topic + ' explained')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-3 bg-brand-dark-blue rounded-lg border border-brand-border hover:border-brand-cyan transition-all"
                    >
                      <p className="text-xs font-bold text-brand-cyan">{y.topic}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">🔗 {y.query}</p>
                    </a>
                  ))}
                  {!(latestAnalysis.youtube?.length) && <p className="text-gray-500 text-xs italic">No video recommendations yet</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview: All Weak/Strong + Performance Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-6">
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Overall Weak Areas
            </h3>
            <ul className="space-y-2">
              {allWeakAreas.length > 0 ? allWeakAreas.slice(0, 6).map((topic, i) => (
                <li key={i} className="flex gap-3 bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-sm text-gray-300">
                  <span className="text-red-500">🔻</span>{topic as string}
                </li>
              )) : <p className="text-xs text-gray-500 italic">No weak areas detected yet.</p>}
            </ul>
          </div>
          <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-6">
            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Cognitive Strengths
            </h3>
            <ul className="space-y-2">
              {allStrongAreas.length > 0 ? allStrongAreas.slice(0, 6).map((topic, i) => (
                <li key={i} className="flex gap-3 bg-green-500/5 p-3 rounded-xl border border-green-500/10 text-sm text-gray-300">
                  <span className="text-green-500">🟢</span>{topic as string}
                </li>
              )) : <p className="text-xs text-gray-500 italic">Analyzing your strengths...</p>}
            </ul>
          </div>
        </div>

        {/* Recent Performance Log */}
        <div className="bg-brand-dark-blue border border-brand-border rounded-3xl p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><FileTextIcon /> Recent Performance Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Assessment</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Score</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {safeSubmissions.slice(0, 5).map((sub, index) => {
                  const quiz = Array.isArray(quizzes) ? quizzes.find(q => q.id === sub.quizId) : null;
                  const perc = sub.totalQuestions > 0 ? (sub.score / sub.totalQuestions) * 100 : 0;
                  return (
                    <tr key={index} className="hover:bg-brand-dark/30 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white">{quiz?.topic || 'Assessment'}</p>
                        <p className="text-[10px] text-gray-500">ID: {sub.quizId?.toString().slice(0, 8)}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-black ${perc >= 70 ? 'text-green-400' : perc >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{sub.score}/{sub.totalQuestions}</span>
                          <div className="w-24 bg-gray-800 rounded-full h-2 overflow-hidden hidden sm:block">
                            <div className={`h-full rounded-full ${perc >= 70 ? 'bg-green-500' : perc >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${perc}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded border ${perc >= 70 ? 'bg-green-500/10 border-green-500/30 text-green-400' : perc >= 40 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                          {perc >= 70 ? 'Mastery' : perc >= 40 ? 'Improving' : 'Needs Work'}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-gray-500 font-mono">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error('AI Brain Render Error', err);
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">AI Brain Error</h2>
        <p className="text-gray-400 text-sm">Take another quiz to recalibrate.</p>
      </div>
    );
  }
};

// ---- Shared Content Page ----
const SharedContentPage: React.FC<{ content: SharedContent[] }> = ({ content }) => {
  const [activeContent, setActiveContent] = useState<SharedContent | null>(null);
  const [viewingContent, setViewingContent] = useState<SharedContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string, text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFileRendering, setIsFileRendering] = useState(false);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const pptxContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleCloseModal = () => { setActiveContent(null); setAiResult(null); setError(null); };
  const handleCloseViewModal = () => { setViewingContent(null); setDocHtml(null); setPdfDoc(null); };

  useEffect(() => {
    setDocHtml(null); setPdfDoc(null);
    if (pptxContainerRef.current) pptxContainerRef.current.innerHTML = '';
    if (!viewingContent || viewingContent.type !== 'file' || !viewingContent.fileData) return;

    const mimeType = viewingContent.mimeType;
    const base64ToArrayBuffer = (base64: string): Uint8Array => {
      const binaryString = atob(base64); const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes;
    };

    if (['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mimeType!)) {
      setIsFileRendering(true);
      (async () => {
        try {
          const base64String = viewingContent.fileData!.substring(viewingContent.fileData!.indexOf(',') + 1);
          const bytes = base64ToArrayBuffer(base64String);
          if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await window.mammoth.convertToHtml({ arrayBuffer: bytes.buffer }); setDocHtml(result.value);
          } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            if (pptxContainerRef.current && window.pptx?.render) window.pptx.render(bytes.buffer, pptxContainerRef.current);
            else setDocHtml(`<p class="text-red-500 p-4">Presentation viewer is loading. Please try again.</p>`);
          } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const wb = window.XLSX.read(bytes, { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]];
            setDocHtml(`<div class="p-4"><style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #374151;padding:8px}th{background:#1F2937}</style>${window.XLSX.utils.sheet_to_html(ws)}</div>`);
          }
        } catch { setDocHtml(`<p class="text-red-500 p-4">Error rendering file.</p>`); }
        finally { setIsFileRendering(false); }
      })();
    } else if (mimeType === 'application/pdf') {
      setIsFileRendering(true);
      (async () => {
        try {
          if (!window.pdfjsLib) { setDocHtml(`<p class="text-red-500 p-4">PDF viewer loading. Try again.</p>`); setIsFileRendering(false); return; }
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js`;
          const base64String = viewingContent.fileData!.substring(viewingContent.fileData!.indexOf(',') + 1);
          const base64ToAB = (b: string) => { const bs = atob(b); const arr = new Uint8Array(bs.length); for (let i = 0; i < bs.length; i++) arr[i] = bs.charCodeAt(i); return arr; };
          const doc = await window.pdfjsLib.getDocument({ data: base64ToAB(base64String) }).promise;
          setPdfDoc(doc); setPageNum(1);
        } catch (error: any) { setDocHtml(`<p class="text-red-500 p-4">Error loading PDF: ${error.message}</p>`); setIsFileRendering(false); }
      })();
    }
    return () => { if (pptxContainerRef.current) pptxContainerRef.current.innerHTML = ''; };
  }, [viewingContent]);

  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = pdfCanvasRef.current!;
      canvas.height = viewport.height; canvas.width = viewport.width;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      setIsFileRendering(false);
    })();
  }, [pdfDoc, pageNum]);

  const getContentText = async (item: SharedContent): Promise<string> => {
    if (item.type === 'text') return item.content || '';
    if (item.type === 'image') return item.description || '';
    if (item.fileData && item.mimeType) {
      try {
        const base64 = item.fileData.substring(item.fileData.indexOf(',') + 1);
        const binaryString = atob(base64); const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        if (item.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await window.mammoth.convertToHtml({ arrayBuffer: bytes.buffer }); return result.value.replace(/<[^>]+>/g, ' ');
        }
        if (item.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          const wb = window.XLSX.read(bytes, { type: 'array' }); let text = '';
          wb.SheetNames.forEach((n: string) => { (window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }) as any[][]).forEach(row => { text += row.join(' \t ') + '\n'; }); });
          return text;
        }
      } catch { return item.description || ''; }
    }
    return item.description || 'Content not available.';
  };

  const handleSummarize = async (item: SharedContent) => {
    setActiveContent(item); setIsLoading(true); setError(null);
    try { const text = await getContentText(item); const summary = await summarizeText(text); setAiResult({ title: 'Summary', text: summary }); }
    catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  };

  const handleTranslate = async (item: SharedContent, language: string) => {
    setActiveContent(item); setIsLoading(true); setError(null);
    try { const text = await getContentText(item); const translation = await translateText(text, language); setAiResult({ title: `Translation (${language})`, text: translation }); }
    catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  };

  const getFileIcon = (item: SharedContent) => {
    if (item.type === 'image') return <ImageIcon/>;
    if (item.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return <FileSpreadsheetIcon />;
    return <FileTextIcon/>;
  };

  const LANGUAGES = ['Hindi', 'English'];

  return (
    <>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">File Information</h2>
        {content.length === 0 ? <p className="text-gray-500">Your teacher hasn't shared any content yet.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map(item => (
              <div key={item.id} className="bg-brand-dark rounded-lg p-4 flex flex-col">
                <div className="flex items-start gap-3 mb-2 flex-grow">
                  {getFileIcon(item)}
                  <div><h3 className="font-bold">{item.title}</h3><p className="text-sm text-gray-400">{item.description}</p></div>
                </div>
                {item.type === 'image' && item.fileData && <div className="my-2 h-40 bg-brand-dark-blue rounded-md overflow-hidden"><img src={item.fileData} alt={item.title} className="h-full w-full object-cover"/></div>}
                <div className="mt-auto pt-4 border-t border-brand-border space-y-3">
                  <button onClick={() => setViewingContent(item)} className="w-full flex items-center justify-center gap-2 bg-brand-dark-blue text-white font-semibold py-2 px-3 rounded-lg hover:bg-brand-border transition-colors"><EyeIcon/> View</button>
                  <div className="pt-1">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 text-center">AI Tools</h4>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button onClick={() => handleSummarize(item)} className="flex items-center gap-1 text-xs bg-brand-dark-blue px-2 py-1 rounded-md hover:bg-brand-border"><SummarizeIcon/> Summarize</button>
                      <div className="group relative">
                        <button className="flex items-center gap-1 text-xs bg-brand-dark-blue px-2 py-1 rounded-md hover:bg-brand-border"><TranslateIcon/> Translate</button>
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-start bg-brand-dark-blue border border-brand-border p-1 rounded-md z-10 min-w-max">
                          {LANGUAGES.map(lang => <button key={lang} onClick={() => handleTranslate(item, lang)} className="w-full text-left text-xs px-2 py-1 hover:bg-brand-dark rounded">{lang}</button>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeContent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-brand-cyan">{aiResult?.title || 'Processing...'}</h3>
              <button onClick={handleCloseModal}><CloseIcon/></button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
              {isLoading && <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>}
              {error && <p className="text-red-500">{error}</p>}
              {aiResult && <p className="whitespace-pre-wrap text-gray-300">{aiResult.text}</p>}
            </div>
            {aiResult && (
              <div className="mt-4 pt-4 border-t border-brand-border">
                <TTSPlayer text={aiResult.text} language={'English'} />
              </div>
            )}
          </div>
        </div>
      )}

      {viewingContent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-brand-cyan">{viewingContent.title}</h3>
              <button onClick={handleCloseViewModal}><CloseIcon/></button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 bg-brand-dark rounded-md">
              {isFileRendering && <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div><p className="ml-4">Rendering file...</p></div>}
              {viewingContent.type === 'text' && <p className="whitespace-pre-wrap text-gray-300 p-4">{viewingContent.content}</p>}
              {viewingContent.type === 'image' && viewingContent.fileData && <div className="flex justify-center items-center h-full p-4"><img src={viewingContent.fileData} alt={viewingContent.title} className="max-w-full max-h-full object-contain"/></div>}
              {viewingContent.type === 'file' && viewingContent.fileData && viewingContent.mimeType && (() => {
                const mt = viewingContent.mimeType;
                if (mt === 'application/pdf') return (
                  <div className={`flex flex-col items-center h-full ${pdfDoc && !isFileRendering ? 'flex' : 'hidden'}`}>
                    <div className="flex-grow w-full flex items-center justify-center overflow-auto"><canvas ref={pdfCanvasRef}></canvas></div>
                    {pdfDoc && <div className="flex items-center gap-4 p-2 bg-brand-dark-blue border-t border-brand-border w-full flex-shrink-0">
                      <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1} className="px-4 py-1 bg-brand-dark rounded disabled:opacity-50">Previous</button>
                      <span>Page {pageNum} of {pdfDoc.numPages}</span>
                      <button onClick={() => setPageNum(p => Math.min(pdfDoc.numPages, p + 1))} disabled={pageNum >= pdfDoc.numPages} className="px-4 py-1 bg-brand-dark rounded disabled:opacity-50">Next</button>
                    </div>}
                  </div>
                );
                if (mt.includes('wordprocessingml') || mt.includes('spreadsheetml')) return <div className={`max-w-none ${isFileRendering ? 'hidden' : ''}`}><div dangerouslySetInnerHTML={{ __html: docHtml || '' }} /></div>;
                if (mt.includes('presentationml')) return <div className={`h-full ${isFileRendering ? 'hidden' : ''}`}><div ref={pptxContainerRef} className="w-full h-full" /></div>;
                if (!isFileRendering && !pdfDoc && !docHtml) return <div className="text-center p-8"><p className="text-gray-400 mb-6">This file type cannot be previewed.</p><a href={viewingContent.fileData} download={viewingContent.fileName} className="bg-brand-cyan text-white font-semibold py-3 px-6 rounded-lg hover:bg-cyan-500 inline-flex items-center gap-2"><FileTextIcon/> Download {viewingContent.fileName}</a></div>;
                return null;
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ---- Doubt Solver Page ----
interface Message { sender: 'user' | 'ai'; text: string; }

const DoubtSolverPage: React.FC<{ assistanceDisabled: boolean }> = ({ assistanceDisabled }) => {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [learningStyle, setLearningStyle] = useState('Standard');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const TEACH_STYLES = ['Standard', 'Explain Like I am 5', 'Use Analogies', 'Socratic Method', 'Extremely Detailed'];
  const LANGUAGES = ['English', 'Marathi', 'Hindi'];

  // Load chat history
  useEffect(() => {
    const saved = localStorage.getItem('doubt_solver_chats');
    if (saved) {
      try {
        setConversation(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, []);

  // Save chat history
  useEffect(() => {
    if (conversation.length > 0) {
      localStorage.setItem('doubt_solver_chats', JSON.stringify(conversation));
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  if (assistanceDisabled) {
    return (
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-3">AI Assistance Disabled</h2>
        <p className="text-gray-400">Your teacher has temporarily disabled the AI Doubt Solver.</p>
      </div>
    );
  }

  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech Recognition not supported.");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = selectedLanguage === 'Marathi' ? 'mr-IN' : (selectedLanguage === 'Hindi' ? 'hi-IN' : 'en-US');
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => setCurrentQuestion(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isLoading) return;
    const userMessage: Message = { sender: 'user', text: currentQuestion };
    setConversation(prev => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsLoading(true);
    try {
      const prompt = learningStyle !== 'Standard' ? `Style: ${learningStyle}. Question: ${userMessage.text}` : userMessage.text;
      const explanation = await getExplanation(prompt, selectedLanguage);
      setConversation(prev => [...prev, { sender: 'ai', text: explanation }]);
    } catch (err: any) {
      setConversation(prev => [...prev, { sender: 'ai', text: `Sorry, system is offline.` }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 flex flex-col h-[75vh]">
      <div className="flex justify-between items-center mb-4 border-b border-brand-border pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2"><HelpCircleIcon /> Doubt Solver</h2>
        <div className="flex gap-2">
           <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="bg-brand-dark border border-brand-border rounded px-2 py-1 text-sm">
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
           </select>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto pr-4 space-y-4 mb-4 scrollbar-hide">
        {conversation.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-brand-cyan text-brand-dark font-semibold' : 'bg-brand-dark text-gray-200 border border-brand-border'}`}>
              <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
              <p className="text-[9px] mt-1 opacity-50">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
        {isLoading && <div className="text-brand-cyan animate-pulse text-xs italic">AI is thinking...</div>}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSubmitQuestion} className="flex gap-3 bg-brand-dark p-2 rounded-xl border border-brand-border">
        <button type="button" onClick={handleMicClick} className={`p-3 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-brand-cyan'}`}>🎙️</button>
        <input value={currentQuestion} onChange={e => setCurrentQuestion(e.target.value)} placeholder="Ask your doubt..." className="flex-grow bg-transparent border-none focus:ring-0 text-white" disabled={isLoading} />
        <button type="submit" disabled={isLoading || !currentQuestion.trim()} className="bg-brand-cyan text-brand-dark font-bold px-6 py-2 rounded-lg hover:scale-105 transition-all">Send</button>
      </form>
    </div>
  );
};

// ---- NEW: Lectures Page ----
const LecturesPage: React.FC<{ videoLectures: VideoLecture[], generatedLectures: GeneratedLecture[], userEmail: string, updateLectureProgress: (id: string, progress: number) => Promise<void> }> = ({ videoLectures, generatedLectures, userEmail, updateLectureProgress }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [preferredLang, setPreferredLang] = useState(() => localStorage.getItem('preferredLectureLang') || 'English');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const OPTIONS = ['English', 'Hindi'];

  const handleLangSelect = (lang: string) => {
    setPreferredLang(lang);
    localStorage.setItem('preferredLectureLang', lang);
    setIsDropdownOpen(false);
  };

  const translateSlidePoints = async (lectureId: string, slideIndex: number, points: string[], lang: string) => {
    const targetLang = lang.includes('+') ? lang.split('+')[1] : lang;
    const key = `${lectureId}-${slideIndex}-${targetLang}`;
    if (translations[key] || targetLang === 'English') return;
    setTranslatingId(key);
    try {
      const translated = await translateText(points.join('\n'), targetLang);
      setTranslations(prev => ({ ...prev, [key]: translated }));
    } catch (err: any) { 
      console.error('Translation failed: ' + err.message); 
    } finally { 
      setTranslatingId(null); 
    }
  };

  const handleExpand = (lecture: any) => {
    const isExpanding = expandedId !== lecture.id;
    setExpandedId(isExpanding ? lecture.id : null);
    if (isExpanding && preferredLang !== 'English') {
      lecture.slides.forEach((slide: any, i: number) => {
        translateSlidePoints(lecture.id, i, slide.points, preferredLang);
      });
    }
  };

  useEffect(() => {
    if (expandedId && preferredLang !== 'English') {
      const lecture = allLectures.find(l => l.id === expandedId);
      if (lecture) {
        lecture.slides.forEach((slide: any, i: number) => {
          translateSlidePoints(lecture.id, i, slide.points, preferredLang);
        });
      }
    }
  }, [preferredLang]);

  const allLectures = [
    ...videoLectures.map(vl => ({ id: vl.id, topic: vl.topic, slides: vl.notes.slides, date: vl.uploadedAt, isVideo: true, rawVideo: vl })),
    ...generatedLectures.map(gl => ({ id: gl.id, topic: gl.topic, slides: gl.slides, date: null, isVideo: false })),
  ];

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>, lectureId: string) => {
    const video = e.currentTarget;
    if (video.duration > 0) {
      const progressPercent = (video.currentTime / video.duration) * 100;
      if (progressPercent > 85) {
        updateLectureProgress(lectureId, progressPercent);
      }
    }
  };

  if (allLectures.length === 0) {
    return <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 text-center"><h2 className="text-2xl font-bold mb-4">No Lectures Yet</h2><p className="text-gray-400">Your teacher hasn't published any lecture notes yet. Check back later!</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Lecture Notes</h2>
        <div className="relative text-left z-[100]">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-brand-dark-blue border border-brand-border px-4 py-2 rounded-lg hover:border-brand-cyan"
          >
            <TranslateIcon /> {preferredLang.replace('+', ' + ')}
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-brand-dark-blue border border-brand-border rounded-lg shadow-xl overflow-y-auto max-h-60 z-[100]">
              {OPTIONS.map(lang => (
                <button
                  key={lang}
                  onClick={() => handleLangSelect(lang)}
                  className={`block w-full text-left px-4 py-3 hover:bg-brand-border transition-colors ${preferredLang === lang ? 'text-brand-cyan font-bold' : 'text-gray-300'}`}
                >
                  {lang.replace('+', ' + ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {allLectures.map(lecture => (
        <div key={lecture.id} className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">{lecture.topic}</h3>
              <p className="text-sm text-gray-400">{lecture.slides.length} slides{lecture.date ? ` · ${new Date(lecture.date).toLocaleDateString()}` : ''}{lecture.isVideo ? ' · Video Lecture' : ' · AI Generated'}</p>
            </div>
            <button onClick={() => handleExpand(lecture)} className="btn bg-brand-dark-blue border border-brand-border px-4 py-2 rounded text-brand-cyan text-sm hover:border-brand-cyan flex-shrink-0 ml-4 font-semibold">{expandedId === lecture.id ? 'Collapse' : 'View Notes'}</button>
          </div>

          {expandedId === lecture.id && (
            <div className="mt-6 space-y-4">
              {lecture.isVideo && lecture.rawVideo && (
                <div className="mb-8 rounded-lg overflow-hidden border border-brand-border bg-black">
                  {lecture.rawVideo.sourceType === 'youtube' && lecture.rawVideo.sourceUrl && (
                    <div className="aspect-video">
                      <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${lecture.rawVideo.sourceUrl.match(/(?:youtu\.be\/|v=)([^&]+)/)?.[1] || lecture.rawVideo.sourceUrl.split('/').pop()}`} allowFullScreen />
                    </div>
                  )}
                  {lecture.rawVideo.sourceType === 'video' && lecture.rawVideo.fileData && (
                    <video className="w-full aspect-video" controls src={lecture.rawVideo.fileData} onTimeUpdate={(e) => handleTimeUpdate(e, lecture.id)} />
                  )}
                </div>
              )}

              {lecture.isVideo && lecture.rawVideo && !(lecture.rawVideo.completions.find((c: any) => c.studentEmail === userEmail)?.completed) && lecture.rawVideo.sourceType === 'video' ? (
                <div className="bg-yellow-900/50 border border-yellow-700/50 text-yellow-300 p-4 rounded-lg flex items-center justify-center font-semibold">
                  Watch at least 85% of the video to unlock AI generated notes and practice quizzes.
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <TTSPlayer text={lecture.slides.map(s => s.title + '. ' + s.points.join('. ')).join('. ')} language={preferredLang.includes('+') ? 'English' : preferredLang as any} />
                  </div>
                  {lecture.slides.map((slide, i) => {
                const targetLang = preferredLang.includes('+') ? preferredLang.split('+')[1] : preferredLang;
                const translationKey = `${lecture.id}-${i}-${targetLang}`;
                const translatedText = translations[translationKey];
                const isBilingual = preferredLang.includes('+');
                const showOriginal = preferredLang === 'English' || isBilingual;
                const showTranslation = preferredLang !== 'English' && translatedText;
                const isLoadingTranslation = translatingId === translationKey;

                return (
                  <div key={i} className="bg-brand-dark p-4 rounded-lg">
                    <h4 className="font-bold text-brand-cyan mb-3">Slide {i + 1}: {slide.title}</h4>
                    <div className={isBilingual ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}>
                      {showOriginal && (
                         <div>
                           {isBilingual && <p className="text-xs text-gray-500 mb-2 border-b border-brand-border pb-1">English</p>}
                           <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 pl-2">
                             {slide.points.map((p, j) => <li key={j}>{p}</li>)}
                           </ul>
                         </div>
                      )}
                      
                      {preferredLang !== 'English' && (
                        <div>
                           {isBilingual && <p className="text-xs text-gray-500 mb-2 border-b border-brand-border pb-1">{targetLang}</p>}
                           {isLoadingTranslation ? (
                             <div className="flex items-center gap-2 text-sm text-brand-cyan"><div className="w-4 h-4 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div> Translating...</div>
                           ) : showTranslation ? (
                             <p className="text-sm text-gray-200 whitespace-pre-wrap">{translatedText}</p>
                           ) : (
                             <p className="text-sm text-gray-500 italic">Translation unvailable temporarily.</p>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </>
            )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ---- NEW: Curriculum Page (student read-only view) ----
const CurriculumPage: React.FC<{ curriculumPlans: CurriculumPlan[] }> = ({ curriculumPlans }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const trendColor = (trend: string) => trend === 'rising' ? 'text-green-400' : trend === 'declining' ? 'text-red-400' : 'text-yellow-400';
  const trendLabel = (trend: string) => trend === 'rising' ? '↑ Rising' : trend === 'declining' ? '↓ Declining' : '→ Stable';

  if (curriculumPlans.length === 0) {
    return <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 text-center"><h2 className="text-2xl font-bold mb-4">No Curriculum Plans Yet</h2><p className="text-gray-400">Your teacher hasn't published any curriculum intelligence reports yet.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-4 text-sm text-gray-400">
        These industry-aligned curriculum reports are created by your teacher to help you understand which skills are in demand and what to learn next.
      </div>
      {curriculumPlans.map(cp => (
        <div key={cp.id} className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">{cp.title || cp.domain}</h3>
              <p className="text-sm text-gray-400">{cp.domain} · {cp.topics.length} topics · {new Date(cp.generatedAt).toLocaleDateString()}</p>
              {cp.description && <p className="text-sm text-gray-400 mt-2">{cp.description}</p>}
            </div>
            <button onClick={() => setExpandedId(expandedId === cp.id ? null : cp.id)} className="text-brand-cyan text-sm hover:underline">{expandedId === cp.id ? 'Collapse' : 'View Details'}</button>
          </div>

          {expandedId === cp.id && (
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="font-bold text-lg mb-4">Skill Demand Analysis</h4>
                <div className="space-y-3">
                  {cp.topics.map((t, i) => (
                    <div key={i} className="bg-brand-dark p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-semibold">{t.name}</h5>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-semibold ${trendColor(t.growthTrend)}`}>{trendLabel(t.growthTrend)}</span>
                          <span className="text-sm font-bold text-brand-cyan">{t.demandScore}/100</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2"><div className="bg-brand-cyan h-2 rounded-full" style={{ width: `${t.demandScore}%` }}></div></div>
                      <p className="text-xs text-gray-400">Job roles: {t.jobRoles.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-4">Your Learning Path</h4>
                <div className="space-y-2">
                  {cp.learningPath.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 bg-brand-dark p-3 rounded-md">
                      <div className="w-7 h-7 rounded-full bg-brand-cyan text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ---- Quiz Taker ----
const QuizTaker: React.FC<{ quiz: Quiz; onComplete: (score: number, total: number, incorrectAnswers: any[]) => void }> = ({ quiz, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(Array(quiz.questions.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const selectedAnswersRef = React.useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;

  const buildAndSubmit = React.useCallback(() => {
    let score = 0;
    const items = quiz.questions.map((q, index) => {
      const isCorrect = selectedAnswersRef.current[index] === q.correctAnswerIndex;
      if (isCorrect) score++;
      return {
        questionText: q.questionText,
        isCorrect,
        userAnswer: selectedAnswersRef.current[index] !== null ? q.options[selectedAnswersRef.current[index]!] : 'No Answer',
        correctAnswer: q.options[q.correctAnswerIndex]
      };
    });
    onComplete(score, quiz.questions.length, items.filter(it => !it.isCorrect));
  }, [quiz, onComplete]);

  useEffect(() => {
    if (timeLeft <= 0) { buildAndSubmit(); return; }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, buildAndSubmit]);

  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-center text-brand-cyan">{quiz.topic}</h1>
          <div className="bg-brand-dark p-3 rounded-xl border border-brand-cyan flex items-center gap-3">
             <span className="text-xs font-bold text-gray-500 uppercase">Time Remaining</span>
             <span className={`text-xl font-mono font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-brand-cyan'}`}>{formatTime(timeLeft)}</span>
          </div>
      </div>
      <p className="text-center text-gray-400 mb-8 font-bold">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
      
      <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-8 shadow-2xl">
        <p className="text-xl font-semibold mb-8 text-white">{currentQuestion.questionText}</p>
        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((option, index) => (
            <button 
                key={index} 
                onClick={() => handleSelectAnswer(index)} 
                className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                  selectedAnswers[currentQuestionIndex] === index 
                    ? 'bg-brand-cyan border-brand-cyan text-brand-dark font-bold scale-[1.02]' 
                    : 'bg-brand-dark border-brand-border hover:border-brand-cyan/50 text-gray-300'
                }`}
            >
                <span className="mr-4 opacity-50">{String.fromCharCode(65 + index)}.</span>
                {option}
            </button>
          ))}
        </div>
        <div className="mt-12 flex justify-between items-center">
          <button 
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} 
            disabled={currentQuestionIndex === 0}
            className="px-8 py-3 rounded-xl font-bold border border-brand-border text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            PREVIOUS
          </button>
          
          {currentQuestionIndex < quiz.questions.length - 1 ? (
            <button 
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)} 
                className="bg-brand-cyan text-brand-dark font-bold py-3 px-10 rounded-xl hover:scale-105 transition-all shadow-lg shadow-brand-cyan/20"
            >
                NEXT
            </button>
          ) : (
            <button 
                onClick={buildAndSubmit} 
                className="bg-green-600 text-white font-bold py-3 px-10 rounded-xl hover:bg-green-500 hover:scale-105 transition-all shadow-lg shadow-green-600/20"
            >
                FINISH ASSESSMENT
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StudentAssignmentsPage: React.FC<{ assignments: Assignment[], assignmentSubmissions: AssignmentSubmission[], addAssignmentSubmission: (s: Omit<AssignmentSubmission, 'id'|'submittedAt'>) => Promise<void>, user: User }> = ({ assignments, assignmentSubmissions, addAssignmentSubmission, user }) => {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success'|'error', message: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !content.trim()) return;
    setIsSubmitting(true); setFeedback(null);
    try {
      await addAssignmentSubmission({
         assignmentId: selectedAssignment.id,
         studentEmail: user.email,
         studentName: user.name,
         content,
      });
      setFeedback({ type: 'success', message: 'Assignment submitted successfully!'});
      setContent('');
      setSelectedAssignment(null);
    } catch(err: any) { setFeedback({ type: 'error', message: err.message || 'Failed to submit.'}); }
    finally { setIsSubmitting(false); }
  };

  const availableAssignments = assignments.filter(a => !assignmentSubmissions.some(s => s.assignmentId === a.id));
  const completedAssignments = assignments.filter(a => assignmentSubmissions.some(s => s.assignmentId === a.id));

  return (
    <div className="space-y-8">
      {feedback && <div className={`rounded-lg p-4 ${feedback.type === 'success' ? 'bg-green-900 border border-green-500 text-green-300' : 'bg-red-900 border border-red-500 text-red-300'}`}>{feedback.message}</div>}
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Pending Assignments</h2>
        {availableAssignments.length === 0 ? <p className="text-gray-400">All caught up! No pending assignments.</p> : (
           <div className="space-y-4">
             {availableAssignments.map(a => (
                <div key={a.id} className="bg-brand-dark p-4 rounded-lg flex justify-between items-center border border-brand-border">
                  <div>
                    <h3 className="text-lg font-semibold">{a.topic}</h3>
                    <p className="text-sm text-gray-400">Due: {new Date(a.dueDate).toLocaleDateString()} | Total Points: {a.totalPoints}</p>
                  </div>
                  <button onClick={() => setSelectedAssignment(a)} className="bg-brand-cyan text-white py-2 px-4 rounded-lg font-semibold cursor-pointer text-sm">Submit Work</button>
                </div>
             ))}
           </div>
        )}
      </div>
      {selectedAssignment && (
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Submit: {selectedAssignment.topic}</h2>
              <button onClick={() => setSelectedAssignment(null)} className="text-gray-400 hover:text-white">Cancel</button>
           </div>
           <p className="text-gray-300 mb-6 bg-brand-dark p-4 rounded-lg">{selectedAssignment.instructions}</p>
           <form onSubmit={handleSubmit} className="space-y-4">
              <textarea value={content} onChange={e => setContent(e.target.value)} required rows={6} className="w-full bg-brand-dark border border-brand-border rounded-lg p-4 text-white resize-y focus:outline-none focus:ring-2 focus:ring-brand-cyan" placeholder="Type your answer, or paste a link to your work here..."></textarea>
              <button type="submit" disabled={isSubmitting} className="bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg w-full">{isSubmitting ? 'Submitting...' : 'Submit Assignment'}</button>
           </form>
        </div>
      )}
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Completed Assignments</h2>
        {completedAssignments.length === 0 ? <p className="text-gray-400">No submitted assignments yet.</p> : (
           <div className="space-y-4">
             {completedAssignments.map(a => {
                const sub = assignmentSubmissions.find(s => s.assignmentId === a.id)!;
                return (
                   <div key={a.id} className="bg-brand-dark p-4 rounded-lg border border-brand-border">
                      <div className="flex justify-between items-start">
                         <div>
                            <h3 className="text-lg font-semibold">{a.topic}</h3>
                            <p className="text-sm text-gray-400">Submitted at: {new Date(sub.submittedAt).toLocaleDateString()}</p>
                         </div>
                         <div className="text-right">
                            <span className={`font-bold px-3 py-1 text-sm rounded-full ${sub.score !== undefined ? 'bg-green-900 border border-green-500 text-green-300' : 'bg-yellow-900 border border-yellow-500 text-yellow-300'}`}>{sub.score !== undefined ? `${sub.score} / ${a.totalPoints}` : 'Pending Grade'}</span>
                         </div>
                      </div>
                      {sub.score !== undefined && sub.aiFeedback && (
                         <div className="mt-4 p-3 bg-brand-dark-blue rounded-md border border-brand-cyan">
                            <p className="text-sm font-semibold text-brand-cyan mb-1">Teacher Feedback</p>
                            <p className="text-sm text-gray-300">{sub.aiFeedback}</p>
                         </div>
                      )}
                   </div>
                );
             })}
           </div>
        )}
      </div>
    </div>
  );
};

const StudyModePage: React.FC<{ 
  availableQuizzes: Quiz[], 
  availableAssignments: Assignment[],
  incompleteLectures: VideoLecture[],
  onStartQuiz: (quiz: Quiz) => void,
  onNavigate: (page: string) => void
}> = ({ availableQuizzes, availableAssignments, incompleteLectures, onStartQuiz, onNavigate }) => {
  return (
    <div className="space-y-8">
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><SparklesIcon /> One Click Study Mode</h2>
        <p className="text-gray-400 mb-6">Here is everything you need to catch up on today. Focus on these tasks first!</p>

        <div className="space-y-6">
          {availableQuizzes.length === 0 && availableAssignments.length === 0 && incompleteLectures.length === 0 && (
            <div className="text-center p-8 bg-brand-dark rounded-lg">
               <CheckCircleIcon />
               <p className="text-green-400 font-bold mt-2">You are completely caught up!</p>
            </div>
          )}

          {incompleteLectures.length > 0 && (
            <div>
               <h3 className="text-xl font-bold mb-3">1. Review AI Notes</h3>
               <div className="space-y-3">
                 {incompleteLectures.map(vl => (
                   <div key={vl.id} className="bg-brand-dark p-4 rounded-lg flex justify-between items-center border-l-4 border-yellow-500">
                     <div>
                       <h4 className="font-semibold">{vl.topic}</h4>
                       <p className="text-xs text-gray-400 mt-1">Topic-Based Notes</p>
                     </div>
                     <button onClick={() => onNavigate('lectures')} className="bg-brand-dark-blue text-white py-1 px-4 text-sm rounded border border-brand-border hover:bg-brand-cyan transition">Go to AI Notes</button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {availableQuizzes.length > 0 && (
            <div>
               <h3 className="text-xl font-bold mb-3">2. Take these Quizzes</h3>
               <div className="space-y-3">
                 {availableQuizzes.map(q => (
                   <div key={q.id} className="bg-brand-dark p-4 rounded-lg flex justify-between items-center border-l-4 border-blue-500">
                     <div>
                       <h4 className="font-semibold">{q.topic}</h4>
                       <p className="text-xs text-gray-400 mt-1">{q.questions.length} questions</p>
                     </div>
                     <button onClick={() => onStartQuiz(q)} className="bg-brand-cyan text-white py-1 px-4 text-sm rounded hover:bg-cyan-500 transition">Start Quiz</button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {availableAssignments.length > 0 && (
            <div>
               <h3 className="text-xl font-bold mb-3">3. Submit these Assignments</h3>
               <div className="space-y-3">
                 {availableAssignments.map(a => (
                   <div key={a.id} className="bg-brand-dark p-4 rounded-lg flex justify-between items-center border-l-4 border-red-500">
                     <div>
                       <h4 className="font-semibold">{a.topic}</h4>
                       <p className="text-xs text-gray-400 mt-1">Due {new Date(a.dueDate).toLocaleDateString()}</p>
                     </div>
                     <button onClick={() => onNavigate('assignments')} className="bg-brand-dark-blue text-white py-1 px-4 text-sm rounded border border-brand-border hover:bg-brand-cyan transition">Go Submit</button>
                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ---- Main StudentPortal ----
const StudentPortal: React.FC<StudentPortalProps> = ({
  quizzes, onLogout, user, addSubmission, studentSubmissions, sharedContent,
  generatedLectures, generatedCaseStudies, faqs, attendanceSessions, addAttendanceRecord,
  videoLectures, curriculumPlans, assistanceDisabled, submitAttendance, updateLectureProgress, assignments, assignmentSubmissions, addAssignmentSubmission,
  studentPerformance, addStudentPerformance,
  isOfflineMode, toggleOfflineMode, onVoiceReady
}) => {
  const [activePage, setActivePage] = useState('home');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<{ score: number; total: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quizInsights, setQuizInsights] = useState<any | null>(null);

  // Register voice navigation callback
  useEffect(() => {
    onVoiceReady?.(setActivePage);
  }, [onVoiceReady]);

  // Listen for voice-triggered quiz actions via custom events
  useEffect(() => {
    const handleVoiceStartQuiz = () => {
      const nextQuiz = quizzes.filter(q => !studentSubmissions.some(s => s.quizId === q.id))[0];
      if (nextQuiz) { setActiveQuiz(nextQuiz); setActivePage('quizzes'); }
    };
    window.addEventListener('voiceStartQuiz', handleVoiceStartQuiz);
    return () => window.removeEventListener('voiceStartQuiz', handleVoiceStartQuiz);
  }, [quizzes, studentSubmissions]);

  const navItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon /> },
    { id: 'study-mode', label: 'One Click Study Mode', icon: <SparklesIcon /> },
    { id: 'assistance', label: 'AI Learner Brain', icon: <SparklesIcon /> },
    { id: 'vidya-ai', label: 'Vidya AI', icon: <SparklesIcon /> },
    { id: 'faq', label: 'Help Center', icon: <HelpCircleIcon /> },
    { id: 'assignments', label: 'Assignments', icon: <FileTextIcon /> },
    { id: 'quizzes', label: 'Quizzes', icon: <QuizIcon /> },
    { id: 'lectures', label: 'AI Notes', icon: <FileTextIcon /> },
    { id: 'file-information', label: 'File Information', icon: <ShareIcon /> },
    { id: 'attendance', label: 'Attendance', icon: <UserCheckIcon /> },
    { id: 'curriculum', label: 'Value Added Recommendations', icon: <BookOpenIcon /> },
    { id: 'doubt-solver', label: 'Doubt Solver', icon: <HelpCircleIcon /> },
  ];

  const userSubmissions = studentSubmissions.filter(sub => sub.studentName === user.name);
  const knowledgeBase = { quizzes, lectures: generatedLectures, caseStudies: generatedCaseStudies, sharedContent, faqs };

  const completedQuizIds = new Set(userSubmissions.map(s => s.quizId));
  const availableQuizzes = quizzes.filter(q => {
    if (completedQuizIds.has(q.id)) return false;
    if (q.lectureId) {
      const lecture = videoLectures.find(vl => vl.id === q.lectureId);
      if (!lecture) return false;
      const isCompleted = lecture.sourceType === 'transcript' ? true : lecture.completions.some(c => c.studentEmail === user.email && c.completed);
      return isCompleted;
    }
    return true;
  });
  const completedQuizzes = quizzes.filter(q => completedQuizIds.has(q.id));

  const availableAssignments = assignments.filter(a => !assignmentSubmissions.some(s => s.assignmentId === a.id));
  const incompleteLectures = videoLectures.filter(vl => vl.sourceType === 'video' && !vl.completions.some(c => c.studentEmail === user.email && c.completed));

  const handleStartQuiz = (quiz: Quiz) => { setActiveQuiz(quiz); setQuizResult(null); setQuizInsights(null); };

  const handleQuizComplete = async (score: number, total: number, incorrectAnswers: any[]) => {

    setQuizResult({ score, total });
    if (activeQuiz && user.classCode) {
      await addSubmission({ 
        quizId: activeQuiz.id, 
        studentName: user.name, 
        studentEmail: user.email,
        score, 
        totalQuestions: total, 
        classCode: user.classCode 
      });

      // AI Analysis Trigger
      setIsAnalyzing(true);

      try {
        const response = await fetch('/api/analyze-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: activeQuiz.topic,
            score,
            total,
            wrong_questions: incorrectAnswers.map(ia => ia.questionText || ia.question || 'Unknown Question'),
            mistakes: []
          })
        });

        if (response.ok) {
          const result = await response.json();
          // Server now returns pre-parsed object OR string — handle both
          let insights: any = result.response;
          if (typeof insights === 'string') {
            try {
              const jsonMatch = insights.match(/\{[\s\S]*\}/);
              insights = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(insights);
            } catch (e) {
              insights = {};
            }
          }
          // Ensure all fields exist
          insights = {
            weak_topics: [], reason: '', what_to_learn_next: [], books: [], youtube: [], motivation: '',
            ...insights
          };

          setQuizInsights(insights);
          
          if (addStudentPerformance) {
            await addStudentPerformance({
              studentEmail: user.email,
              quizId: activeQuiz.id,
              topic: activeQuiz.topic,
              score,
              totalQuestions: total,
              analysis: {
                 weak_topics: Array.isArray(insights.weak_topics) ? insights.weak_topics : [],
                 reason: insights.reason || "",
                 what_to_learn_next: Array.isArray(insights.what_to_learn_next) ? insights.what_to_learn_next : [],
                 books: Array.isArray(insights.books) ? insights.books : [],
                 youtube: Array.isArray(insights.youtube) ? insights.youtube : [],
                 motivation: insights.motivation || "",
                 strong_topics: Array.isArray(insights.strong_topics) ? insights.strong_topics : [],
                 medium_topics: [],
                 mistake_analysis: [],
                 study_plan: Array.isArray(insights.study_plan) ? insights.study_plan : [],
                 practice_questions: []
              }
            });
          }
        } else {
           throw new Error("AI Failed");
        }
      } catch (err) {
        console.error("Analysis failed", err);
        setQuizInsights({ error: "AI insights not available. Check local AI (Ollama)." });
      } finally {
        setIsAnalyzing(false);
      }
    }
    setActiveQuiz(null);
    setActivePage('quizzes');
  };

  if (activeQuiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizTaker quiz={activeQuiz} onComplete={handleQuizComplete} />
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar activePage={activePage} onNavigate={setActivePage} title={<>Vidya<br/>AI</>} navItems={navItems} isOfflineMode={isOfflineMode} toggleOfflineMode={toggleOfflineMode} />
      <div className="flex-1 ml-64">
        <div className="p-8 max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-8 gap-8">
            <h1 className="text-4xl font-bold text-brand-cyan capitalize whitespace-nowrap">
               {activePage.replace(/-/g, ' ')}
            </h1>
            <SmartSearch knowledgeBase={knowledgeBase} />
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-gray-400">Welcome, {user.name}</span>
              <button onClick={onLogout} className="flex items-center gap-2 text-brand-cyan hover:underline"><LogoutIcon /> Logout</button>
            </div>
          </header>
          <main>
            <div style={{ display: activePage === 'home' ? 'block' : 'none' }}><HomePage user={user} quizzes={quizzes} userSubmissions={userSubmissions} sharedContent={sharedContent} onStartQuiz={handleStartQuiz} /></div>
            <div style={{ display: activePage === 'study-mode' ? 'block' : 'none' }}><StudyModePage availableQuizzes={availableQuizzes} availableAssignments={availableAssignments} incompleteLectures={incompleteLectures} onStartQuiz={handleStartQuiz} onNavigate={setActivePage} /></div>
            <div style={{ display: activePage === 'assignments' ? 'block' : 'none' }}><StudentAssignmentsPage assignments={assignments} assignmentSubmissions={assignmentSubmissions} addAssignmentSubmission={addAssignmentSubmission} user={user} /></div>
            <div style={{ display: activePage === 'quizzes' ? 'block' : 'none' }}>
              <div className="space-y-8">
                {isAnalyzing && (
                  <div className="bg-brand-dark p-6 rounded-xl border border-brand-cyan/30">
                    <div className="text-brand-cyan font-bold flex items-center gap-2">
                       <div className="w-4 h-4 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                       Analyzing your performance...
                    </div>
                  </div>
                )}
                {quizInsights && (
                   <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 space-y-6">
                      <h3 className="text-2xl font-bold flex items-center gap-2">AI Performance Insights</h3>
                      {quizInsights.error ? (
                        <p className="text-red-400">{quizInsights.error}</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-4">
                              <div>
                                 <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">🔴 Weak Areas</h4>
                                 <ul className="list-disc list-inside text-gray-300">
                                    {(quizInsights.weak_topics || []).map((t: string, i: number) => <li key={i}>{t}</li>)}
                                 </ul>
                              </div>
                              <div>
                                 <h4 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2">🟢 Strong Areas</h4>
                                 <ul className="list-disc list-inside text-gray-300">
                                    {(quizInsights.strong_topics || []).map((t: string, i: number) => <li key={i}>{t}</li>)}
                                 </ul>
                              </div>
                           </div>
                           <div className="bg-brand-dark p-6 rounded-lg border border-brand-border">
                              <h4 className="text-sm font-bold text-brand-cyan uppercase tracking-widest mb-4">📘 Study Plan</h4>
                              <ul className="space-y-2">
                                 {(quizInsights.study_plan || []).map((p: string, i: number) => (
                                    <li key={i} className="flex gap-2 text-sm text-gray-400">
                                       <span className="text-brand-cyan">•</span>
                                       {p}
                                    </li>
                                 ))}
                              </ul>
                           </div>
                        </div>
                      )}
                   </div>
                )}
                <QuizzesPage availableQuizzes={availableQuizzes} completedQuizzes={completedQuizzes} userSubmissions={userSubmissions} quizResult={quizResult} onStartQuiz={handleStartQuiz} user={user} addStudentPerformance={addStudentPerformance} isOfflineMode={isOfflineMode} />
              </div>
            </div>
            <div style={{ display: activePage === 'lectures' ? 'block' : 'none' }}><LecturesPage videoLectures={videoLectures} generatedLectures={generatedLectures} userEmail={user.email} updateLectureProgress={updateLectureProgress} /></div>
            <div style={{ display: activePage === 'file-information' ? 'block' : 'none' }}><SharedContentPage content={sharedContent} /></div>
            <div style={{ display: activePage === 'attendance' ? 'block' : 'none' }}><AttendancePage user={user} sessions={attendanceSessions} submitAttendance={submitAttendance} /></div>
            <div style={{ display: activePage === 'curriculum' ? 'block' : 'none' }}><CurriculumPage curriculumPlans={curriculumPlans} /></div>
            <div style={{ display: activePage === 'vidya-ai' ? 'block' : 'none' }}><VidyaAI userRole="student" classCode={user.classCode!} /></div>
            <div style={{ display: activePage === 'assistance' ? 'block' : 'none' }}><AnalysisPage submissions={userSubmissions} quizzes={quizzes} performance={studentPerformance} /></div>
            <div style={{ display: activePage === 'faq' ? 'block' : 'none' }}><FAQPage faqs={faqs} /></div>
            <div style={{ display: activePage === 'doubt-solver' ? 'block' : 'none' }}><DoubtSolverPage assistanceDisabled={assistanceDisabled} /></div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
