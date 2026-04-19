import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Quiz, User, Submission, SharedContent, SharedContentType, LectureSlide, CaseStudy, GeneratedLecture, FAQ, AttendanceSession, VideoLecture, ExamPaper, CurriculumPlan, CurriculumTopic, CurriculumStatus, Assignment, AssignmentSubmission, AnimationScript, EklavyaAnalysis, SavedResourceHub, ResourceHubData } from '../types';
import { generateQuiz, generateLectureSlides, generateCaseStudy, generateQuizFromContent, generateNotesFromTranscript, generateExamPaperAI, generateResources, generateCurriculumIntelligenceAI, generateAnimationScript, generateEklavyaAnalysis } from '../services/aiService';
import { SparklesIcon, LogoutIcon, BookOpenIcon, HomeIcon, QuizIcon, VisualizationIcon, EditIcon, TrashIcon, ShareIcon, UploadIcon, FileTextIcon, ImageIcon, AIGeneratorIcon, UserCheckIcon, UsersIcon, PlayIcon } from './Icons';
import Sidebar from './Sidebar';
import SmartSearch from './SmartSearch';
import TTSPlayer from './TTSPlayer';
import AnimationEngine from './AnimationEngine';

interface TeacherPortalProps {
  onLogout: () => void;
  user: User;
  allUsers: User[];
  quizzes: Quiz[];
  addQuiz: (quiz: Omit<Quiz, 'id'>) => Promise<void>;
  updateQuiz: (quiz: Quiz) => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<void>;
  studentSubmissions: Submission[];
  sharedContent: SharedContent[];
  addSharedContent: (content: Omit<SharedContent, 'id'>) => Promise<void>;
  updateSharedContent: (content: SharedContent) => Promise<void>;
  deleteSharedContent: (contentId: string) => Promise<void>;
  generatedLectures: GeneratedLecture[];
  addGeneratedLecture: (lecture: Omit<GeneratedLecture, 'id'>) => Promise<void>;
  generatedCaseStudies: CaseStudy[];
  addGeneratedCaseStudy: (study: Omit<CaseStudy, 'id'>) => Promise<void>;
  faqs: FAQ[];
  attendanceSessions: AttendanceSession[];
  startAttendance: (classCode: string) => Promise<void>;
  stopAttendance: (sessionId: string) => Promise<void>;
  videoLectures: VideoLecture[];
  addVideoLecture: (vl: VideoLectureFormPayload) => Promise<VideoLecture | null>;
  deleteVideoLecture: (id: string) => Promise<void>;
  examPapers: ExamPaper[];
  addExamPaper: (ep: Omit<ExamPaper, 'id'>) => Promise<void>;
  updateExamPaper: (ep: ExamPaper) => Promise<void>;
  deleteExamPaper: (id: string) => Promise<void>;
  curriculumPlans: CurriculumPlan[];
  addCurriculumPlan: (cp: Omit<CurriculumPlan, 'id'>) => Promise<void>;
  deleteCurriculumPlan: (id: string) => Promise<void>;
  assignments: Assignment[];
  addAssignment: (a: Omit<Assignment, 'id'>) => Promise<void>;
  updateAssignment: (a: Assignment) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  assignmentSubmissions: AssignmentSubmission[];
  updateAssignmentSubmission: (id: string, score: number, aiFeedback?: string) => Promise<void>;
  assistanceDisabled: boolean;
  onToggleAssistance: (disabled: boolean) => Promise<void>;
  setQuizStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setGeneratedLectureStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setVideoLectureStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setExamPaperStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setAssignmentStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setCurriculumPlanStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setCurriculumItemStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setCaseStudyStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setSharedContentStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  deleteGeneratedLecture: (id: string) => Promise<void>;
  deleteCaseStudy: (id: string) => Promise<void>;
  updateGeneratedLecture: (l: GeneratedLecture) => Promise<void>;
  updateGeneratedCaseStudy: (s: CaseStudy) => Promise<void>;
  isOfflineMode: boolean;
  toggleOfflineMode: (val: boolean) => void;
  animationScripts: AnimationScript[];
  addAnimationScript: (a: Omit<AnimationScript, 'id'>) => Promise<void>;
  updateAnimationScript: (a: AnimationScript) => Promise<void>;
  deleteAnimationScript: (id: string) => Promise<void>;
  setAnimationScriptStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  resourceHubs: SavedResourceHub[];
  addResourceHub: (a: Omit<SavedResourceHub, 'id'>) => Promise<void>;
  updateResourceHub: (a: SavedResourceHub) => Promise<void>;
  deleteResourceHub: (id: string) => Promise<void>;
  setResourceHubStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  /** Called on mount so VoiceController can navigate between pages */
  onVoiceReady?: (navigate: (page: string) => void) => void;
}

type AttendancePageSession = AttendanceSession & {
  otp?: string;
  sessionCode?: string;
  qrPayload?: string;
  startedAt?: string;
  endsAt?: string;
};



type TeacherCurriculumPlan = CurriculumPlan & {
  title?: string;
  description?: string;
  status?: CurriculumStatus;
  updatedAt?: string;
};

type LectureSourceType = 'transcript' | 'youtube' | 'video';

type NotesPreview = {
  summary?: string;
  keyPoints?: string[];
  definitions?: Array<{ term: string; meaning: string }>;
  slides: LectureSlide[];
};

type GeneratedLectureFormPayload = Omit<GeneratedLecture, 'id'> & {
  summary?: string;
  keyPoints?: string[];
  definitions?: Array<{ term: string; meaning: string }>;
  sourceType?: LectureSourceType;
  sourceUrl?: string;
  fileData?: string;
  fileName?: string;
  mimeType?: string;
  transcript?: string;
};

type VideoLectureFormPayload = Omit<VideoLecture, 'id' | 'uploadedAt' | 'completions'> & {
  sourceType?: LectureSourceType;
  sourceUrl?: string;
  fileData?: string;
  fileName?: string;
  mimeType?: string;
  lectureLanguage?: 'English' | 'Hindi';
};

const TeacherPortal: React.FC<TeacherPortalProps> = (props) => {
  const [activePage, setActivePage] = useState('home');
  const [editingLecture, setEditingLecture] = useState<GeneratedLecture | null>(null);
  const [editingAnimation, setEditingAnimation] = useState<AnimationScript | null>(null);
  const { onLogout, user, quizzes, studentSubmissions, sharedContent, generatedLectures, generatedCaseStudies, attendanceSessions, isOfflineMode, toggleOfflineMode, curriculumPlans, assignments, setQuizStatus, deleteGeneratedLecture, setGeneratedLectureStatus, examPapers, setExamPaperStatus, deleteExamPaper, resourceHubs, addResourceHub, deleteResourceHub, setResourceHubStatus, animationScripts, setAnimationScriptStatus, deleteAnimationScript, students, faqs } = props;

  // Register voice navigation
  useEffect(() => {
    props.onVoiceReady?.(setActivePage);
  }, [props.onVoiceReady]);

  // Listen for voice-triggered AI actions
  useEffect(() => {
    const handleVoiceQuiz = (e: CustomEvent) => {
      setActivePage('quiz-generation');
      // Dispatch a second event that QuizGenerationPage listens to
      window.dispatchEvent(new CustomEvent('voiceFillQuizTopic', { detail: { topic: e.detail?.topic } }));
    };
    const handleVoicePPT = (e: CustomEvent) => {
      setActivePage('content-generator');
      window.dispatchEvent(new CustomEvent('voiceFillPPTTopic', { detail: { topic: e.detail?.topic } }));
    };
    window.addEventListener('voiceGenerateQuiz', handleVoiceQuiz as EventListener);
    window.addEventListener('voiceGeneratePPT', handleVoicePPT as EventListener);
    return () => {
      window.removeEventListener('voiceGenerateQuiz', handleVoiceQuiz as EventListener);
      window.removeEventListener('voiceGeneratePPT', handleVoicePPT as EventListener);
    };
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon /> },
    { id: 'shared-content', label: 'Shared Content', icon: <ShareIcon /> },
    { id: 'content-generator', label: 'AI Content Generator', icon: <AIGeneratorIcon /> },
    { id: 'video-lectures', label: 'Academic Notes', icon: <FileTextIcon /> },
    { id: 'quiz-generation', label: 'Quiz Generation', icon: <QuizIcon /> },
    { id: 'question-paper', label: 'Question Paper', icon: <BookOpenIcon /> },
    { id: 'resource-hub', label: 'Smart Resource Hub', icon: <SparklesIcon /> },
    { id: 'curriculum', label: 'Curriculum Intel', icon: <SparklesIcon /> },
    { id: 'assignments', label: 'Assignments', icon: <FileTextIcon /> },
    { id: 'attendance', label: 'Attendance', icon: <UserCheckIcon /> },
    { id: 'animation-generator', label: 'Animation Generator', icon: <PlayIcon /> },
    { id: 'eklavya', label: 'EKLAVYA (AI Analytics)', icon: <VisualizationIcon /> },
    { id: 'students', label: 'Students', icon: <UsersIcon /> },
    { id: 'visualization', label: 'Visualization', icon: <VisualizationIcon /> },
  ];

  const knowledgeBase = { quizzes, lectures: generatedLectures, caseStudies: generatedCaseStudies, sharedContent, faqs };
  const activeSession = attendanceSessions.find(s => s.isActive) as AttendancePageSession | undefined;
  const isTeacher = user.role === 'teacher';

  return (
    <div className="flex">
      <Sidebar activePage={activePage} onNavigate={setActivePage} title={<>Vidya<br />AI</>} navItems={navItems} isOfflineMode={props.isOfflineMode} toggleOfflineMode={props.toggleOfflineMode} />
      <div className="flex-1 ml-64">
        <div className="p-8 max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-8 gap-8">
            <h1 className="text-4xl font-bold text-brand-cyan capitalize whitespace-nowrap">{activePage.replace(/-/g, ' ')}</h1>
            <SmartSearch knowledgeBase={knowledgeBase} />
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-gray-400">Welcome, {user.name}</span>
              <button onClick={onLogout} className="flex items-center gap-2 text-brand-cyan hover:underline"><LogoutIcon /> Logout</button>
            </div>
          </header>
          <main>
            {!isTeacher ? (
              <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Teacher access only</h2>
                <p className="text-gray-400">This dashboard is restricted to teacher actions.</p>
              </div>
            ) : (
              <>
                <div style={{ display: activePage === 'home' ? 'block' : 'none' }}><HomePage user={user} quizzes={quizzes} allUsers={props.allUsers} sharedContent={sharedContent} activeSession={activeSession} onNavigate={setActivePage} /></div>
                <div style={{ display: activePage === 'shared-content' ? 'block' : 'none' }}><SharedContentPage {...props} setSharedContentStatus={props.setSharedContentStatus} /></div>
                <div style={{ display: activePage === 'content-generator' ? 'block' : 'none' }}><ContentGeneratorPage 
                  user={user} 
                  addGeneratedLecture={props.addGeneratedLecture} 
                  addGeneratedCaseStudy={props.addGeneratedCaseStudy} 
                  generatedLectures={props.generatedLectures}
                  generatedCaseStudies={props.generatedCaseStudies}
                  setGeneratedLectureStatus={props.setGeneratedLectureStatus}
                  setCaseStudyStatus={props.setCaseStudyStatus}
                  deleteGeneratedLecture={props.deleteGeneratedLecture}
                  deleteCaseStudy={props.deleteCaseStudy}
                  isOfflineMode={isOfflineMode}
                /></div>
                <div style={{ display: activePage === 'video-lectures' ? 'block' : 'none' }}><VideoLecturesPage user={user} videoLectures={props.videoLectures} addVideoLecture={props.addVideoLecture} deleteVideoLecture={props.deleteVideoLecture} generatedLectures={props.generatedLectures} addGeneratedLecture={props.addGeneratedLecture} addQuiz={props.addQuiz} setVideoLectureStatus={props.setVideoLectureStatus} isOfflineMode={isOfflineMode} /></div>
                <div style={{ display: activePage === 'quiz-generation' ? 'block' : 'none' }}><QuizGenerationPage user={user} quizzes={props.quizzes} addQuiz={props.addQuiz} updateQuiz={props.updateQuiz} deleteQuiz={props.deleteQuiz} generatedLectures={props.generatedLectures} setQuizStatus={props.setQuizStatus} /></div>
                <div style={{ display: activePage === 'question-paper' ? 'block' : 'none' }}><QuestionPaperPage user={user} examPapers={props.examPapers} addExamPaper={props.addExamPaper} updateExamPaper={props.updateExamPaper} deleteExamPaper={props.deleteExamPaper} setExamPaperStatus={props.setExamPaperStatus} /></div>
                <div style={{ display: activePage === 'resource-hub' ? 'block' : 'none' }}><SmartResourceHubPage user={user} resourceHubs={props.resourceHubs} addResourceHub={props.addResourceHub} updateResourceHub={props.updateResourceHub} deleteResourceHub={props.deleteResourceHub} setResourceHubStatus={props.setResourceHubStatus} /></div>
                <div style={{ display: activePage === 'curriculum' ? 'block' : 'none' }}><CurriculumPage user={user} curriculumPlans={props.curriculumPlans} addCurriculumPlan={props.addCurriculumPlan} deleteCurriculumPlan={props.deleteCurriculumPlan} setCurriculumPlanStatus={props.setCurriculumPlanStatus} /></div>
                <div style={{ display: activePage === 'assignments' ? 'block' : 'none' }}><AssignmentsPage assignments={props.assignments} addAssignment={props.addAssignment} updateAssignment={props.updateAssignment} deleteAssignment={props.deleteAssignment} assignmentSubmissions={props.assignmentSubmissions} updateAssignmentSubmission={props.updateAssignmentSubmission} user={props.user} setAssignmentStatus={props.setAssignmentStatus} /></div>
                <div style={{ display: activePage === 'animation-generator' ? 'block' : 'none' }}><AnimationGeneratorPage user={user} animationScripts={props.animationScripts} addAnimationScript={props.addAnimationScript} updateAnimationScript={props.updateAnimationScript} deleteAnimationScript={props.deleteAnimationScript} setAnimationScriptStatus={props.setAnimationScriptStatus} isOfflineMode={isOfflineMode} /></div>
                <div style={{ display: activePage === 'eklavya' ? 'block' : 'none' }}><EklavyaPage user={user} submissions={props.studentSubmissions} students={props.allUsers} isOfflineMode={isOfflineMode} /></div>
                <div style={{ display: activePage === 'visualization' ? 'block' : 'none' }}><VisualizationPage quizzes={props.quizzes} submissions={props.studentSubmissions} /></div>
                <div style={{ display: activePage === 'attendance' ? 'block' : 'none' }}><AttendancePage activeSession={activeSession} sessions={attendanceSessions as AttendancePageSession[]} onStart={() => Object(props.startAttendance)()} onStop={() => activeSession && props.stopAttendance(activeSession.id)} assistanceDisabled={props.assistanceDisabled} onToggleAssistance={props.onToggleAssistance} /></div>
                <div style={{ display: activePage === 'students' ? 'block' : 'none' }}><StudentsPage allUsers={props.allUsers} user={user} /></div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: number | string }> = ({ icon, title, value }) => (
  <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 flex items-center gap-4">
    <div className="p-3 bg-brand-dark rounded-full">{icon}</div>
    <div><p className="text-sm text-gray-400">{title}</p><p className="text-2xl font-bold">{value}</p></div>
  </div>
);

const ActionCard: React.FC<{ icon: React.ReactNode, title: string, description: string, onClick: () => void }> = ({ icon, title, description, onClick }) => (
  <button onClick={onClick} className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 text-left hover:border-brand-cyan transition-colors w-full">
    <div className="text-brand-cyan mb-3">{icon}</div>
    <h3 className="font-bold mb-1">{title}</h3>
    <p className="text-sm text-gray-400">{description}</p>
  </button>
);

const FeedbackBanner: React.FC<{ type: 'success' | 'error'; message: string }> = ({ type, message }) => (
  <div className={`rounded-lg border px-4 py-3 text-sm ${type === 'success' ? 'border-green-700 bg-green-950/40 text-green-300' : 'border-red-700 bg-red-950/40 text-red-300'}`}>
    {message}
  </div>
);

const getSessionStartTime = (session: AttendancePageSession) => session.startedAt ?? session.date;
const getSessionEndTime = (session: AttendancePageSession) => session.endsAt;
const getSessionCode = (session: AttendancePageSession) => session.sessionCode ?? `ATT-${session.id.slice(0, 8).toUpperCase()}`;
const getRemainingSeconds = (session: AttendancePageSession) => {
  const endsAt = getSessionEndTime(session);
  if (!endsAt) return null;
  const diff = Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
};
const formatCountdown = (totalSeconds: number | null) => {
  if (totalSeconds === null) return 'Open until stopped';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')} remaining`;
};
const normalizeNotesPreview = (notes: any): NotesPreview => ({
  summary: notes?.summary ?? '',
  keyPoints: Array.isArray(notes?.keyPoints) ? notes.keyPoints : [],
  definitions: Array.isArray(notes?.definitions) ? notes.definitions : [],
  slides: Array.isArray(notes?.slides) ? notes.slides : [],
});

const HomePage: React.FC<{ user: User; quizzes: Quiz[]; allUsers: User[]; sharedContent: SharedContent[]; activeSession: AttendanceSession | undefined; onNavigate: (page: string) => void }> = ({ user, quizzes, allUsers, sharedContent, activeSession, onNavigate }) => {
  const totalQuizzes = quizzes.length;
  const activeStudents = allUsers.filter(u => u.role === 'student' && u.classCode === user.classCode).length;
  const totalSharedContent = sharedContent.length;
  const recentQuizzes = [...quizzes].reverse().slice(0, 3);
  return (
    <div className="space-y-8">
      <div className="mb-6"><h2 className="text-3xl font-bold">Welcome, {user.name}!</h2><p className="text-gray-400">Here's a snapshot of your classroom activity.</p></div>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-3">Your Class Code</h3>
        <div className="bg-brand-dark p-4 rounded-md text-center">
          <p className="text-4xl font-mono tracking-widest text-brand-cyan">{user.classCode}</p>
          <p className="text-xs text-gray-400 mt-2">Share this code with your students to have them join your class.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<QuizIcon />} title="Total Quizzes" value={totalQuizzes} />
        <StatCard icon={<UsersIcon />} title="Enrolled Students" value={activeStudents} />
        <StatCard icon={<ShareIcon />} title="Shared Content" value={totalSharedContent} />
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-brand-dark rounded-full"><UserCheckIcon /></div>
          <div><p className="text-sm text-gray-400">Attendance</p><p className={`text-xl font-bold ${activeSession ? 'text-green-400' : 'text-red-500'}`}>{activeSession ? 'Active' : 'Inactive'}</p></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ActionCard icon={<SparklesIcon />} title="Create New Quiz" description="Generate a quiz on any topic with AI." onClick={() => onNavigate('quiz-generation')} />
              <ActionCard icon={<UploadIcon />} title="Share New Content" description="Upload files, images, or notes for students." onClick={() => onNavigate('shared-content')} />
              <ActionCard icon={<FileTextIcon />} title="Video Lecture + Notes" description="Upload a lecture and auto-generate student notes." onClick={() => onNavigate('video-lectures')} />
              <ActionCard icon={<BookOpenIcon />} title="Generate Exam Paper" description="Create a full structured question paper with AI." onClick={() => onNavigate('question-paper')} />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4">Recent Quizzes</h3>
            {recentQuizzes.length > 0 ? (
              <div className="space-y-3">{recentQuizzes.map(q => (<div key={q.id} className="bg-brand-dark p-3 rounded-md"><p className="font-semibold">{q.topic}</p><p className="text-xs text-gray-400">{q.questions.length} questions</p></div>))}</div>
            ) : <p className="text-sm text-gray-500">No quizzes created yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AttendancePage: React.FC<{ activeSession: AttendancePageSession | undefined; sessions: AttendancePageSession[]; onStart: () => Promise<void>; onStop: () => Promise<void>; assistanceDisabled: boolean; onToggleAssistance: (disabled: boolean) => Promise<void>; }> = ({ activeSession, sessions, onStart, onStop, assistanceDisabled, onToggleAssistance }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(activeSession ? getRemainingSeconds(activeSession) : null);

  useEffect(() => {
    setRemainingSeconds(activeSession ? getRemainingSeconds(activeSession) : null);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(activeSession));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  const historicalSessions = sessions.filter(s => s.id !== activeSession?.id).sort((a, b) => new Date(getSessionStartTime(b)).getTime() - new Date(getSessionStartTime(a)).getTime());

  const handleStart = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      await onStart();
      setFeedback({ type: 'success', message: 'Attendance session started. Share the OTP or QR payload with students.' });
    } catch (error) {
      setFeedback({ type: 'error', message: (error as Error).message || 'Failed to start attendance session.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      await onStop();
      setFeedback({ type: 'success', message: 'Attendance session stopped successfully.' });
    } catch (error) {
      setFeedback({ type: 'error', message: (error as Error).message || 'Failed to stop attendance session.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    setFeedback(null);
    try {
      await onToggleAssistance(!assistanceDisabled);
      setFeedback({ type: 'success', message: `Student AI assistance ${!assistanceDisabled ? 'disabled' : 'enabled'} successfully.` });
    } catch (error) {
      setFeedback({ type: 'error', message: (error as Error).message || 'Failed to update AI assistance settings.' });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-8">
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Live Attendance Session</h2>
          {activeSession ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <p className="text-green-400 font-semibold flex items-center gap-2"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>Session is Active</p>
                <button onClick={handleStop} disabled={isLoading} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed">{isLoading ? 'Stopping...' : 'Stop Session'}</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-dark p-4 rounded-lg border border-brand-border">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Session Code</p>
                  <p className="text-lg font-mono text-white break-all">{getSessionCode(activeSession)}</p>
                </div>
                <div className="bg-brand-dark p-4 rounded-lg border border-brand-border">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Status</p>
                  <p className={`text-lg font-semibold ${remainingSeconds === 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCountdown(remainingSeconds)}</p>
                  <p className="text-xs text-gray-500 mt-1">Started {new Date(getSessionStartTime(activeSession)).toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="bg-brand-dark p-4 rounded-lg border border-brand-border">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2"><SparklesIcon /> Face Recognition Active</p>
                <p className="text-xs text-gray-400">Students will verify via face camera on their devices. Attendance is automatically recorded.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Live Records ({activeSession.records.length})</h3>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                  {activeSession.records.length > 0 ? activeSession.records.map((record, index) => (
                    <div key={`${record.studentName}-${record.timestamp}-${index}`} className="bg-brand-dark p-3 rounded-md flex justify-between items-center gap-4">
                      <span className="font-medium">{record.studentName}</span>
                      <span className="text-xs text-gray-400">{new Date(record.timestamp).toLocaleString()}</span>
                    </div>
                  )) : <p className="text-gray-500">No students have checked in yet.</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-400">No session is currently active.</p>
              <button onClick={handleStart} disabled={isLoading} className="bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed">{isLoading ? 'Starting...' : "Start Today's Attendance"}</button>
              <p className="text-xs text-gray-500">Live Face Recognition limits manual bypass.</p>
            </div>
          )}
        </div>
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Attendance History</h2>
          <div className="max-h-[32rem] overflow-y-auto space-y-3 pr-2">
            {historicalSessions.length > 0 ? historicalSessions.map(session => (
              <div key={session.id} className="bg-brand-dark p-4 rounded-md space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold">{new Date(getSessionStartTime(session)).toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-sm text-gray-400">{session.records.length} students were present.</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${session.isActive ? 'bg-green-900/60 text-green-300' : 'bg-gray-800 text-gray-300'}`}>{session.isActive ? 'Active' : 'Closed'}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Session: {getSessionCode(session)}</p>
                  <p>{getSessionEndTime(session) ? `Ended ${new Date(getSessionEndTime(session) as string).toLocaleTimeString()}` : 'Ended manually'}</p>
                </div>
              </div>
            )) : <p className="text-gray-500">No past attendance records found.</p>}
          </div>
        </div>
      </div>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-2">AI Assistance Control</h2>
        <p className="text-gray-400 mb-6">Disable the AI Doubt Solver for all students during exams or assessments.</p>
        <div className="flex items-center justify-between bg-brand-dark p-4 rounded-lg gap-4">
          <div><p className="font-semibold">Student AI Doubt Solver</p><p className={`text-sm ${assistanceDisabled ? 'text-red-400' : 'text-green-400'}`}>{assistanceDisabled ? 'Disabled — students cannot use the doubt solver' : 'Enabled — students can ask AI questions'}</p></div>
          <button onClick={handleToggle} disabled={isToggling} className={`font-bold py-2 px-6 rounded-lg transition-colors disabled:cursor-not-allowed ${assistanceDisabled ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>{isToggling ? 'Updating...' : (assistanceDisabled ? 'Enable Assistance' : 'Disable for Exam')}</button>
        </div>
      </div>
    </div>
  );
};

const StudentsPage: React.FC<{ allUsers: User[]; user: User }> = ({ allUsers, user }) => {
  const enrolledStudents = allUsers.filter(u => u.role === 'student' && u.classCode === user.classCode);
  return (
    <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
      <h2 className="text-2xl font-bold mb-6">Enrolled Students ({enrolledStudents.length})</h2>
      {enrolledStudents.length > 0 ? (<div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-brand-dark"><tr><th className="p-3">Name</th><th className="p-3">Email</th></tr></thead><tbody>{enrolledStudents.map(student => (<tr key={student.email} className="border-b border-brand-border"><td className="p-3">{student.name}</td><td className="p-3">{student.email}</td></tr>))}</tbody></table></div>) : <p className="text-gray-500 text-center py-4">No students have joined your class yet.</p>}
    </div>
  );
};

const SharedContentPage: React.FC<Pick<TeacherPortalProps, 'user' | 'sharedContent' | 'addSharedContent' | 'updateSharedContent' | 'deleteSharedContent'>> = ({ user, sharedContent, addSharedContent, updateSharedContent, deleteSharedContent }) => {
  const [editingContent, setEditingContent] = useState<SharedContent | null>(null);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1"><ContentForm user={user} key={editingContent?.id ?? 'new'} existingContent={editingContent} onSuccess={() => setEditingContent(null)} addSharedContent={addSharedContent} updateSharedContent={updateSharedContent} /></div>
      <div className="lg:col-span-2"><ContentList contentItems={sharedContent} onEdit={setEditingContent} onDelete={deleteSharedContent} /></div>
    </div>
  );
};

const ContentForm: React.FC<{ user: User, existingContent: SharedContent | null, onSuccess: () => void, addSharedContent: (content: Omit<SharedContent, 'id'>) => Promise<void>, updateSharedContent: (content: SharedContent) => Promise<void> }> = ({ user, existingContent, onSuccess, addSharedContent, updateSharedContent }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<SharedContentType>('text');
  const [textContent, setTextContent] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingContent) {
      setTitle(existingContent.title);
      setDescription(existingContent.description);
      setContentType(existingContent.type);
      setTextContent(existingContent.content ?? '');
      setFileData(existingContent.fileData ?? null);
      setFileName(existingContent.fileName ?? null);
      setMimeType(existingContent.mimeType ?? null);
    }
  }, [existingContent]);

  const resetForm = () => { setTitle(''); setDescription(''); setContentType('text'); setTextContent(''); setFileData(null); setFileName(null); setMimeType(null); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData(reader.result as string);
        setFileName(file.name);
        setMimeType(file.type);
        setContentType(file.type.startsWith('image/') ? 'image' : 'file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.classCode) { alert("Error: cannot create content without a class."); return; }
    setIsSubmitting(true);
    try {
      const commonData = { title, description, classCode: user.classCode };
      let contentData: Omit<SharedContent, 'id'>;
      if (contentType === 'text') { contentData = { ...commonData, type: 'text', content: textContent }; }
      else { if (!fileData) { alert('Please upload a file.'); setIsSubmitting(false); return; } contentData = { ...commonData, type: contentType, fileData, fileName: fileName!, mimeType: mimeType! }; }
      if (existingContent) { await updateSharedContent({ ...contentData, id: existingContent.id }); } else { await addSharedContent(contentData); }
      resetForm(); onSuccess();
    } catch (error) { alert(`An error occurred while saving: ${(error as Error).message}`); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 sticky top-8">
      <h2 className="text-2xl font-bold mb-6">{existingContent ? 'Edit Content' : 'Share New Content / Circular'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-300 mb-1">Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" disabled={isSubmitting} /></div>
        <div><label className="block text-sm font-medium text-gray-300 mb-1">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" disabled={isSubmitting}></textarea></div>
        <div><label className="block text-sm font-medium text-gray-300 mb-1">Content Type</label><div className="flex gap-4"><label className="flex items-center gap-2"><input type="radio" name="contentType" value="text" checked={contentType === 'text'} onChange={() => setContentType('text')} disabled={isSubmitting} /> Text</label><label className="flex items-center gap-2"><input type="radio" name="contentType" value="file" checked={contentType === 'file' || contentType === 'image'} onChange={() => setContentType('file')} disabled={isSubmitting} /> File/Image</label></div></div>
        {contentType === 'text' ? (<div><label className="block text-sm font-medium text-gray-300 mb-1">Content</label><textarea value={textContent} onChange={e => setTextContent(e.target.value)} required rows={4} className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" disabled={isSubmitting}></textarea></div>) : (<div><label className="block text-sm font-medium text-gray-300 mb-1">Upload File</label><input type="file" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-cyan file:text-white hover:file:bg-cyan-500" disabled={isSubmitting} />{fileName && <p className="text-xs text-gray-400 mt-2">Uploaded: {fileName}</p>}</div>)}
        <div className="flex gap-2 pt-4">
          {existingContent && <button type="button" onClick={() => { resetForm(); onSuccess(); }} className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700" disabled={isSubmitting}>Cancel</button>}
          <button type="submit" disabled={isSubmitting} className="w-full bg-brand-cyan text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500 flex items-center justify-center gap-2 disabled:bg-cyan-800 disabled:cursor-not-allowed">{isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <UploadIcon />}{isSubmitting ? 'Saving...' : (existingContent ? 'Update' : 'Share')}</button>
        </div>
      </form>
    </div>
  );
};

const ContentList: React.FC<{ contentItems: SharedContent[], onEdit: (content: SharedContent) => void, onDelete: (id: string) => Promise<void>, setSharedContentStatus: (id: string, status: CurriculumStatus) => Promise<void> }> = ({ contentItems, onEdit, onDelete, setSharedContentStatus }) => (
  <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
    <h2 className="text-2xl font-bold mb-6">Shared Materials & Announcements</h2>
    {contentItems.length === 0 ? <p className="text-gray-500">No content has been shared yet.</p> : (
      <div className="space-y-4">{contentItems.map(item => (
        <div key={item.id} className="bg-brand-dark p-4 rounded-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                {item.type === 'image' ? <ImageIcon /> : <FileTextIcon />}
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{item.status === 'published' ? 'Published' : 'Draft'}</span>
              </div>
              <p className="text-sm text-gray-400">{item.description}</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <button onClick={() => setSharedContentStatus(item.id, item.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${item.status === 'published' ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700 text-green-400 hover:bg-green-900/20'}`}>{item.status === 'published' ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => onEdit(item)} className="text-yellow-400 hover:text-yellow-300 p-2 rounded-full bg-brand-dark-blue"><EditIcon /></button>
              <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-400 p-2 rounded-full bg-brand-dark-blue"><TrashIcon /></button>
            </div>
          </div>
        </div>
      ))}</div>
    )}
  </div>
);

const ContentGeneratorPage: React.FC<{ 
  user: User; 
  addGeneratedLecture: (l: Omit<GeneratedLecture, 'id'>) => Promise<void>; 
  addGeneratedCaseStudy: (s: Omit<CaseStudy, 'id'>) => Promise<void>; 
  updateGeneratedLecture: (l: GeneratedLecture) => Promise<void>;
  updateGeneratedCaseStudy: (s: CaseStudy) => Promise<void>;
  generatedLectures: GeneratedLecture[];
  generatedCaseStudies: CaseStudy[];
  setGeneratedLectureStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setCaseStudyStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  deleteGeneratedLecture: (id: string) => Promise<void>;
  deleteCaseStudy: (id: string) => Promise<void>;
  isOfflineMode: boolean;
}> = ({ user, addGeneratedLecture, addGeneratedCaseStudy, updateGeneratedLecture, updateGeneratedCaseStudy, generatedLectures, generatedCaseStudies, setGeneratedLectureStatus, setCaseStudyStatus, deleteGeneratedLecture, deleteCaseStudy, isOfflineMode }) => {
  const [outline, setOutline] = useState('');
  const [contentType, setContentType] = useState<'slides' | 'case-study' | 'ppt'>('slides');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [generatedContent, setGeneratedContent] = useState<({ slides: LectureSlide[] } | Omit<CaseStudy, 'id'>) | null>(null);
  const [editingItem, setEditingItem] = useState<GeneratedLecture | CaseStudy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // PPT-specific state
  const [pptSlides, setPptSlides] = useState<any[]>([]);
  const [pptTheme, setPptTheme] = useState<'modern' | 'academic' | 'dark'>('modern');
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  // PPT Theme config
  const PPT_THEMES = {
    modern:   { bg: 'bg-[#0f1117]',    card: 'bg-[#1a1f2e]',   title: 'text-cyan-400',    accent: '#06b6d4', name: '🎨 Modern'   },
    academic: { bg: 'bg-blue-950',      card: 'bg-blue-900/60', title: 'text-blue-200',    accent: '#3b82f6', name: '📚 Academic' },
    dark:     { bg: 'bg-gray-950',      card: 'bg-gray-900',    title: 'text-purple-300',  accent: '#a855f7', name: '🌙 Dark'     },
  };

  // Layout badge colors
  const LAYOUT_STYLE: Record<string, { border: string; badge: string; dot: string; icon: string }> = {
    'two-column': { border: 'border-purple-500/50', badge: 'bg-purple-500/20 text-purple-300', dot: 'bg-purple-400', icon: '📊' },
    timeline:     { border: 'border-orange-500/50', badge: 'bg-orange-500/20 text-orange-300', dot: 'bg-orange-400', icon: '⏱️' },
    bullets:      { border: 'border-blue-500/50',   badge: 'bg-blue-500/20 text-blue-300',     dot: 'bg-blue-400',   icon: '📝' },
    infographic:  { border: 'border-green-500/50',  badge: 'bg-green-500/20 text-green-300',   dot: 'bg-green-400',  icon: '📈' },
    hero:         { border: 'border-cyan-500/50',   badge: 'bg-cyan-500/20 text-cyan-300',     dot: 'bg-cyan-400',   icon: '⭐' },
    comparison:   { border: 'border-pink-500/50',   badge: 'bg-pink-500/20 text-pink-300',     dot: 'bg-pink-400',   icon: '⚖️' },
  };

  const theme = PPT_THEMES[pptTheme];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outline.trim()) { setError('Please provide a topic outline.'); return; }
    if (!user.classCode) { setError('Cannot generate content without a class.'); return; }
    setIsLoading(true); setError(null); setGeneratedContent(null); setSuccessMessage(null); setEditingItem(null);
    try {
      if (contentType === 'slides') {
        const content = await generateLectureSlides(outline, selectedLanguage);
        setGeneratedContent(content);
        await addGeneratedLecture({ topic: outline.trim().split('\n')[0].replace(/^- /, ''), slides: content.slides, classCode: user.classCode });
        setSuccessMessage('Lecture slides generated and saved as draft!');
      } else if (contentType === 'case-study') {
        const content = await generateCaseStudy(outline, selectedLanguage);
        const newCaseStudy: Omit<CaseStudy, 'id'> = { ...content, classCode: user.classCode };
        setGeneratedContent(newCaseStudy);
        await addGeneratedCaseStudy(newCaseStudy);
        setSuccessMessage('Case study generated and saved as draft!');
      }
    } catch (err: any) { setError(err.message || 'An unknown error occurred.'); }
    finally { setIsLoading(false); }
  };

  // --- Generate PPT via Gemini/OpenAI (AI Router) ---
  const handleGeneratePPT = async () => {
    if (!outline.trim()) { setError('Please enter a topic first.'); return; }
    setIsLoading(true); setError(null); setPptSlides([]); setSuccessMessage(null);
    try {
      const resp = await fetch('/api/vidya/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: outline.trim(), language: selectedLanguage }),
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const data = await resp.json();
      if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        setPptSlides(data.slides);
        setSuccessMessage(`✅ ${data.slides.length} Canva-style slides generated successfully!`);
      } else {
        throw new Error('No slides returned from AI');
      }
    } catch (err: any) {
      setError('PPT generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Download real .pptx via pptxgenjs ---
  const handleDownloadPPT = async () => {
    if (pptSlides.length === 0) return;
    setIsDownloading(true);
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pres = new PptxGenJS();
      pres.layout = 'LAYOUT_WIDE';
      pres.title = outline.trim() || 'Presentation';
      const accentRaw = pptTheme === 'modern' ? '06b6d4' : pptTheme === 'academic' ? '3b82f6' : 'a855f7';
      const bgRaw     = pptTheme === 'modern' ? '0f1117' : pptTheme === 'academic' ? '1e3a5f' : '111118';

      pptSlides.forEach((slide: any, idx: number) => {
        const s = pres.addSlide();
        s.background = { color: bgRaw };
        // Slide number
        s.addText(`${idx + 1}`, { x: 9.0, y: 0.1, w: 0.5, h: 0.35, fontSize: 9, bold: true, color: 'AAAAAA', align: 'center' });
        // Layout badge
        if (slide.layout) {
          s.addText(slide.layout.toUpperCase(), { x: 0.3, y: 0.12, w: 1.5, h: 0.3, fontSize: 8, bold: true, color: accentRaw, fill: { color: accentRaw + '22' }, align: 'center' });
        }
        // Title
        s.addText(slide.title || `Slide ${idx + 1}`, { x: 0.3, y: 0.5, w: 9.1, h: 0.7, fontSize: 28, bold: true, color: accentRaw, fontFace: 'Calibri' });
        // Divider
        s.addShape(pres.ShapeType.rect, { x: 0.3, y: 1.25, w: 9.1, h: 0.04, fill: { color: accentRaw }, line: { color: accentRaw, width: 0 } });
        // Bullet points (left column)
        const points: string[] = slide.points || [];
        if (points.length > 0) {
          s.addText(points.map((p: string) => ({ text: `• ${p}`, options: { paraSpaceAfter: 8 } })) as any, { x: 0.3, y: 1.4, w: 5.8, h: 4.0, fontSize: 13, color: 'D1D5DB', valign: 'top', fontFace: 'Calibri' });
        }
        // Example box (right column)
        if (slide.example) {
          s.addShape(pres.ShapeType.rect, { x: 6.3, y: 1.4, w: 3.2, h: 2.5, fill: { color: accentRaw + '15' }, line: { color: accentRaw, width: 1 } });
          s.addText('💡 Real-World Example', { x: 6.4, y: 1.5, w: 3.0, h: 0.3, fontSize: 9, bold: true, color: accentRaw });
          s.addText(slide.example, { x: 6.4, y: 1.85, w: 3.0, h: 1.9, fontSize: 11, color: 'D1D5DB', wrap: true, valign: 'top' });
        }
        // Design hint footer
        if (slide.design_hint) {
          s.addText(`🎨 ${slide.design_hint}`, { x: 0.3, y: 6.8, w: 9.1, h: 0.3, fontSize: 9, italic: true, color: '6B7280' });
        }
        // Speaker notes
        if (slide.speaker_notes) { s.addNotes(slide.speaker_notes); }
      });

      const safeName = outline.trim().replace(/[^a-z0-9]/gi, '_').slice(0, 40);
      await pres.writeFile({ fileName: `${safeName}_presentation.pptx` });
    } catch (err: any) {
      setError('Download failed: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleNotes = (idx: number) => {
    setExpandedNotes(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  };

  const handleUpdateSlide = (slideIndex: number, field: keyof LectureSlide, value: any) => {
    if (!editingItem || !('slides' in editingItem)) return;
    const nextItem = { ...editingItem } as GeneratedLecture;
    const nextSlides = [...nextItem.slides];
    nextSlides[slideIndex] = { ...nextSlides[slideIndex], [field]: value };
    nextItem.slides = nextSlides;
    setEditingItem(nextItem);
  };

  const handleAddSlide = () => {
    if (!editingItem || !('slides' in editingItem)) return;
    const nextItem = { ...editingItem } as GeneratedLecture;
    nextItem.slides = [...nextItem.slides, { title: 'New Slide', points: ['- Add your content here'] }];
    setEditingItem(nextItem);
  };

  const handleSaveUpdate = async () => {
    if (!editingItem) return;
    try {
      if ('slides' in editingItem) {
        await updateGeneratedLecture(editingItem as GeneratedLecture);
      } else {
        await updateGeneratedCaseStudy(editingItem as CaseStudy);
      }
      setSuccessMessage('Content updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ===== LEFT: Input Panel ===== */}
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Generate Course Content</h2>
          <div className="space-y-6">
            {/* Topic Input */}
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Topic / Outline</label><textarea value={outline} onChange={e => setOutline(e.target.value)} placeholder={"e.g., Introduction to Photosynthesis\n- What is it?\n- The chemical equation"} rows={6} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none resize-y" /></div>

            {/* Content Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
              <div className="flex bg-brand-dark rounded-lg p-1 gap-1">
                {(['slides', 'ppt', 'case-study'] as const).map(type => (
                  <button key={type} type="button" onClick={() => { setContentType(type); setError(null); setSuccessMessage(null); }}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                      contentType === type
                        ? type === 'ppt' ? 'bg-purple-600 text-white shadow' : 'bg-brand-cyan text-white shadow'
                        : 'text-gray-400 hover:bg-brand-border'
                    }`}>
                    {type === 'slides' ? '📄 Lecture Slides' : type === 'ppt' ? '🎨 PPT Presentation' : '📋 Case Study'}
                  </button>
                ))}
              </div>
            </div>

            {/* PPT Theme (only for PPT tab) */}
            {contentType === 'ppt' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Presentation Theme</label>
                <div className="flex gap-2">
                  {(Object.entries(PPT_THEMES) as [typeof pptTheme, any][]).map(([key, t]) => (
                    <button key={key} onClick={() => setPptTheme(key)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        pptTheme === key ? 'border-purple-500 bg-purple-900/30 text-purple-300' : 'border-brand-border text-gray-400 hover:border-gray-500'
                      }`}>{t.name}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Language (for slides & case-study only) */}
            {contentType !== 'ppt' && (
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none">
                  <option>English</option><option>Marathi</option><option>Hindi</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            {contentType === 'ppt' ? (
              <div className="space-y-3">
                <button onClick={handleGeneratePPT} disabled={isLoading || !outline.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-500 hover:to-indigo-500 flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20">
                  {isLoading
                    ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating PPT (5–8s)...</>
                    : <><SparklesIcon /> Generate Canva-Style PPT</>}
                </button>
                {pptSlides.length > 0 && (
                  <button onClick={handleDownloadPPT} disabled={isDownloading}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {isDownloading
                      ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Building .pptx file...</>
                      : <>⬇️ Download PPT (.pptx)</>}
                  </button>
                )}
                <div className="text-xs text-gray-500 bg-brand-dark rounded-lg p-3 border border-brand-border space-y-1">
                  <p>🤖 <span className="text-purple-400 font-bold">Uses Gemini/OpenAI</span> — not Ollama</p>
                  <p>⬇️ Downloads real <span className="text-green-400 font-bold">.pptx</span> (opens in PowerPoint/Google Slides)</p>
                  <p>🕐 May take <span className="text-yellow-400 font-bold">5–8 seconds</span> — cloud AI is working!</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate}>
                <button type="submit" disabled={isLoading} className="w-full bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 flex items-center justify-center gap-2">
                  {isLoading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating...</> : <><SparklesIcon /> Generate Content</>}
                </button>
              </form>
            )}

            {error && <p className="text-red-400 text-sm bg-red-900/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
            {successMessage && <p className="text-green-400 text-sm bg-green-900/10 border border-green-500/30 rounded-lg px-4 py-2">{successMessage}</p>}
          </div>
        </div>

        {/* ===== RIGHT: Preview Panel ===== */}
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {contentType === 'ppt' ? '🎨 Slide Preview' : editingItem ? 'Edit Content' : 'Generated Content Preview'}
            </h2>
            {contentType === 'ppt' && pptSlides.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-brand-dark px-3 py-1 rounded-full border border-brand-border">{pptSlides.length} slides</span>
                <button onClick={handleGeneratePPT} disabled={isLoading}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-purple-500 text-purple-300 hover:bg-purple-900/30 transition-all disabled:opacity-40">🔄 Regenerate</button>
              </div>
            )}
            {contentType !== 'ppt' && editingItem && (
              <div className="flex gap-2">
                <button onClick={() => setEditingItem(null)} className="text-xs bg-brand-dark border border-brand-border px-3 py-1 rounded hover:bg-brand-border transition-colors">Cancel</button>
                <button onClick={handleSaveUpdate} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors font-bold">Save Changes</button>
              </div>
            )}
          </div>

          <div className="flex-1 max-h-[70vh] overflow-y-auto pr-2">

            {/* PPT Preview */}
            {contentType === 'ppt' && (
              <>
                {!isLoading && pptSlides.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 space-y-3">
                    <div className="text-5xl">🎨</div>
                    <p className="font-semibold">Enter a topic and click Generate</p>
                    <p className="text-xs text-gray-600">AI creates 5–6 Canva-style slides with examples,<br />layout hints, and speaker notes</p>
                  </div>
                )}
                {isLoading && (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-xl">✨</div>
                    </div>
                    <p className="text-purple-400 font-bold animate-pulse">AI is crafting your presentation...</p>
                    <p className="text-gray-600 text-xs">Using Gemini/OpenAI — may take 5–8 seconds</p>
                  </div>
                )}
                {pptSlides.length > 0 && (
                  <div className={`space-y-4 rounded-xl p-3 ${theme.bg}`}>
                    {pptSlides.map((slide: any, idx: number) => {
                      const layout = (slide.layout || 'bullets').toLowerCase();
                      const ls = LAYOUT_STYLE[layout] || LAYOUT_STYLE['bullets'];
                      const notesOpen = expandedNotes.has(idx);
                      return (
                        <div key={idx} className={`${theme.card} border-l-4 ${ls.border} rounded-xl overflow-hidden transition-all hover:shadow-lg`}>
                          <div className="p-4 pb-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${ls.badge}`}>{ls.icon} {layout.replace('-','_').toUpperCase()}</span>
                                <span className="text-[10px] text-gray-600 font-mono">#{idx + 1}</span>
                              </div>
                              {slide.visual_type && <span className="text-[10px] text-gray-500 italic">{slide.visual_type}</span>}
                            </div>
                            <h3 className={`text-base font-black leading-snug ${theme.title}`}>{slide.title}</h3>
                          </div>
                          <div className="px-4 pb-3">
                            <ul className="space-y-1.5">
                              {(slide.points || []).map((pt: string, pi: number) => (
                                <li key={pi} className="flex items-start gap-2 text-xs text-gray-300">
                                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${ls.dot}`} />{pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {slide.example && (
                            <div className="mx-4 mb-3 p-3 bg-white/5 rounded-lg border border-white/10">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">💡 Real-World Example</p>
                              <p className="text-xs text-gray-300 italic">{slide.example}</p>
                            </div>
                          )}
                          {slide.design_hint && <div className="px-4 pb-2"><p className="text-[10px] text-gray-500">🎨 <span className="italic">{slide.design_hint}</span></p></div>}
                          {slide.speaker_notes && (
                            <div className="border-t border-white/5">
                              <button onClick={() => toggleNotes(idx)} className="w-full px-4 py-2 text-[10px] font-bold text-gray-500 hover:text-gray-300 flex items-center justify-between transition-all hover:bg-white/5">
                                <span>🎤 Speaker Notes</span><span>{notesOpen ? '▲ Hide' : '▼ Show'}</span>
                              </button>
                              {notesOpen && <div className="px-4 pb-3"><p className="text-xs text-gray-400 italic bg-black/20 p-3 rounded-lg leading-relaxed">{slide.speaker_notes}</p></div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Existing: Edit Lecture Slides */}
            {contentType !== 'ppt' && editingItem && 'slides' in editingItem && (
              <div className="space-y-6">
                {editingItem.slides.map((slide, sIdx) => (
                  <div key={sIdx} className="bg-brand-dark p-6 rounded-lg border border-brand-border relative group shadow-xl">
                    <div className="space-y-4">
                      <input type="text" value={slide.title} onChange={(e) => handleUpdateSlide(sIdx, 'title', e.target.value)} className="w-full bg-brand-dark-blue border border-brand-border rounded p-2 text-xl font-bold text-brand-cyan focus:border-brand-cyan" />
                      <textarea value={slide.points.join('\n')} onChange={(e) => handleUpdateSlide(sIdx, 'points', e.target.value.split('\n'))} className="w-full bg-brand-dark-blue border border-brand-border rounded p-2 text-gray-200 text-sm focus:border-brand-cyan" rows={5} />
                      <input type="text" value={slide.visual || ''} onChange={(e) => handleUpdateSlide(sIdx, 'visual', e.target.value)} placeholder="Visual description..." className="w-full bg-brand-dark-blue border border-brand-border rounded p-2 text-gray-400 text-xs italic" />
                    </div>
                  </div>
                ))}
                <button onClick={handleAddSlide} className="w-full py-4 border-2 border-dashed border-brand-border rounded-xl text-gray-500 hover:border-brand-cyan hover:text-brand-cyan transition-all flex items-center justify-center gap-2 font-bold">+ Add Teacher Slide</button>
              </div>
            )}

            {/* Existing: Preview Lecture Slides */}
            {contentType !== 'ppt' && !editingItem && generatedContent && 'slides' in generatedContent && (
              <div className="space-y-6">
                {(generatedContent as any).slides.map((slide: any, index: number) => (
                  <div key={index} className="bg-brand-dark p-6 rounded-lg border border-brand-border relative group shadow-xl hover:border-brand-cyan transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-bold text-brand-cyan">Slide {index + 1}: {slide.title}</h3>
                      {slide.visualSuggestion && <span className="text-[10px] bg-brand-cyan/20 text-brand-cyan px-2 py-1 rounded-md font-bold uppercase tracking-widest">Visual: {slide.visualSuggestion}</span>}
                    </div>
                    <ul className="list-disc list-inside space-y-3 text-gray-200 pl-2 mb-6 text-lg">{slide.points.map((point: string, pIndex: number) => (<li key={pIndex}>{point}</li>))}</ul>
                    {slide.visual && (
                      <div className="bg-brand-dark-blue/50 p-4 rounded-xl border border-brand-cyan/30 mb-4 bg-gradient-to-br from-brand-cyan/10 to-transparent">
                        <p className="text-xs text-brand-cyan font-black flex items-center gap-2 uppercase tracking-tighter mb-2"><ImageIcon /> Modern Visual Illustration Keyword</p>
                        <p className="text-lg font-bold text-white italic">"{slide.visual}"</p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-brand-border/50"><TTSPlayer text={`${slide.title}. ${slide.points.join('. ')}`} language={selectedLanguage as any} /></div>
                  </div>
                ))}
              </div>
            )}

            {/* Existing: Case Study Preview */}
            {contentType !== 'ppt' && generatedContent && 'introduction' in generatedContent && (
              <div className="space-y-4 text-gray-300 prose prose-invert max-w-none">
                <h3 className="text-2xl font-bold text-brand-cyan">{(generatedContent as any).title}</h3>
                <div className="pt-2 mb-4"><TTSPlayer text={`Case study: ${(generatedContent as any).title}. Introduction: ${(generatedContent as any).introduction}.`} language={selectedLanguage as any} /></div>
                <h4>Introduction</h4><p>{(generatedContent as any).introduction}</p>
                <h4>Problem</h4><p>{(generatedContent as any).problem}</p>
                <h4>Solution</h4><p>{(generatedContent as any).solution}</p>
                <h4>Conclusion</h4><p>{(generatedContent as any).conclusion}</p>
              </div>
            )}

            {/* Empty / Loading states */}
            {contentType !== 'ppt' && !generatedContent && !editingItem && !isLoading && <div className="flex items-center justify-center h-full text-center text-gray-500"><p>Generated content will appear here.</p></div>}
            {contentType !== 'ppt' && isLoading && <div className="flex items-center justify-center h-full text-center text-gray-400"><p>{isOfflineMode ? 'Processing locally...' : 'AI is thinking...'}</p></div>}
          </div>
        </div>
      </div>

      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Manage AI-Generated Content</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-brand-cyan">AI Lectures ({generatedLectures.length})</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {generatedLectures.length === 0 ? <p className="text-gray-500">No AI lectures generated yet.</p> : generatedLectures.map(l => (
                <div key={l.id} className="bg-brand-dark p-4 rounded-lg border border-brand-border flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{l.topic}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${l.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{l.status === 'published' ? 'Published' : 'Draft'}</span>
                    </div>
                    <p className="text-xs text-gray-400">{l.slides.length} slides</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditingItem(l)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-brand-cyan text-brand-cyan hover:bg-brand-cyan/20">View / Edit</button>
                    <button onClick={() => setGeneratedLectureStatus(l.id, l.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${l.status === 'published' ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700 text-green-400 hover:bg-green-900/20'}`}>{l.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                    <button onClick={() => deleteGeneratedLecture(l.id)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 text-brand-cyan">AI Case Studies ({generatedCaseStudies.length})</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {generatedCaseStudies.length === 0 ? <p className="text-gray-500">No AI case studies generated yet.</p> : generatedCaseStudies.map(cs => (
                <div key={cs.id} className="bg-brand-dark p-4 rounded-lg border border-brand-border flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{cs.topic || cs.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cs.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{cs.status === 'published' ? 'Published' : 'Draft'}</span>
                    </div>
                    <p className="text-xs text-gray-400">Case Study Format</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditingItem(cs)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-brand-cyan text-brand-cyan hover:bg-brand-cyan/20">View / Edit</button>
                    <button onClick={() => setCaseStudyStatus(cs.id, cs.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${cs.status === 'published' ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700 text-green-400 hover:bg-green-900/20'}`}>{cs.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                    <button onClick={() => deleteCaseStudy(cs.id)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VideoLecturesPage: React.FC<{ user: User; videoLectures: VideoLecture[]; addVideoLecture: (vl: VideoLectureFormPayload) => Promise<VideoLecture | null>; deleteVideoLecture: (id: string) => Promise<void>; generatedLectures: GeneratedLecture[]; addGeneratedLecture: (l: GeneratedLectureFormPayload) => Promise<void>; addQuiz: (quiz: Omit<Quiz, 'id'>) => Promise<void>; setVideoLectureStatus: (id: string, status: CurriculumStatus) => Promise<void>; isOfflineMode: boolean; }> = ({ user, videoLectures, addVideoLecture, deleteVideoLecture, addGeneratedLecture, addQuiz, setVideoLectureStatus, isOfflineMode }) => {
  const [lectureMode, setLectureMode] = useState<LectureSourceType>('transcript');
  const [topic, setTopic] = useState('');
  const [transcript, setTranscript] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [notesPreview, setNotesPreview] = useState<NotesPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const sortedLectures = useMemo(() => [...videoLectures].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()), [videoLectures]);

  const resetForm = () => {
    setTopic('');
    setTranscript('');
    setYoutubeUrl('');
    setFileData(undefined);
    setFileName(undefined);
    setMimeType(undefined);
    setNotesPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // MOCK UPLOAD TO AVOID LOCALSTORAGE QUOTA LIMITS (5MB max)
    // We intercept the file and just provide a dummy public video URL.
    setFileData('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    setFileName(file.name);
    setMimeType(file.type || 'application/octet-stream');
    setFeedback({ type: 'success', message: 'File uploaded (mocked URL used to save browser storage quota).' });
  };

  const buildTranscriptForGeneration = () => {
    if (lectureMode === 'transcript') return transcript.trim();
    if (lectureMode === 'youtube') return `Lecture Topic: ${topic}\nYouTube URL: ${youtubeUrl.trim()}\nTeacher Notes: ${transcript.trim()}`;
    return `Lecture Topic: ${topic}\nUploaded File: ${fileName ?? 'lecture-file'}\nMime Type: ${mimeType ?? 'unknown'}\nTeacher Notes: ${transcript.trim()}`;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !user.classCode) {
      setFeedback({ type: 'error', message: 'Lecture topic and class are required.' });
      return;
    }
    if (lectureMode === 'transcript' && !transcript.trim()) {
      setFeedback({ type: 'error', message: 'Please paste the lecture transcript.' });
      return;
    }
    if (lectureMode === 'youtube' && !youtubeUrl.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a YouTube link.' });
      return;
    }
    if (isOfflineMode && lectureMode === 'youtube') {
      setFeedback({ type: 'error', message: 'This feature (YouTube) requires internet connection. Please use Transcript mode for offline AI.' });
      return;
    }

    setIsGenerating(true);
    setFeedback(null);

    try {
      const transcriptForGeneration = buildTranscriptForGeneration();
      const notes = normalizeNotesPreview(await generateNotesFromTranscript(transcriptForGeneration));

      const lecturePayload: GeneratedLectureFormPayload = {
        topic,
        slides: notes.slides,
        classCode: user.classCode,
        summary: notes.summary,
        keyPoints: notes.keyPoints,
        definitions: notes.definitions,
        sourceType: lectureMode,
        sourceUrl: lectureMode === 'youtube' ? youtubeUrl.trim() : undefined,
        fileData: lectureMode === 'video' ? fileData : undefined,
        fileName: lectureMode === 'video' ? fileName : undefined,
        mimeType: lectureMode === 'video' ? mimeType : undefined,
        transcript: lectureMode === 'transcript' ? transcript.trim() : transcriptForGeneration,
      };

      await addGeneratedLecture(lecturePayload);

      const generatedLectureForVideo: GeneratedLecture = {
        id: crypto.randomUUID(),
        topic,
        slides: notes.slides,
        classCode: user.classCode,
      };

      const videoPayload: VideoLectureFormPayload = {
        topic,
        transcript: lectureMode === 'transcript' ? transcript.trim() : transcriptForGeneration,
        notes: {
          summary: notes.summary || 'Summary unavailable.',
          keyPoints: notes.keyPoints || [],
          definitions: notes.definitions || [],
          slides: notes.slides || []
        },
        classCode: user.classCode,
        sourceType: lectureMode,
        sourceUrl: lectureMode === 'youtube' ? youtubeUrl.trim() : undefined,
        fileData: lectureMode === 'video' ? fileData : undefined,
        fileName: lectureMode === 'video' ? fileName : undefined,
        mimeType: lectureMode === 'video' ? mimeType : undefined,
        lectureLanguage: 'English',
      };

      const createdVideo = await addVideoLecture(videoPayload);
      setNotesPreview(notes);

      try {
        const lectureContent = [
          notes.summary ? `Summary: ${notes.summary}` : '',
          ...(notes.keyPoints ?? []).map(point => `Key Point: ${point}`),
          ...(notes.slides ?? []).map(slide => `Slide: ${slide.title}\n${slide.points.map(point => `- ${point}`).join('\n')}`),
        ].filter(Boolean).join('\n\n');

        if (lectureContent.trim()) {
          const autoQuiz = await generateQuizFromContent(lectureContent, 5, 'Medium');
          await addQuiz({
            topic: `Quiz on: ${topic}`,
            questions: autoQuiz.questions,
            classCode: user.classCode,
            lectureId: createdVideo?.id,
          });
        }
        setFeedback({ type: 'success', message: 'Lecture published, notes generated, and lecture quiz auto-created.' });
      } catch {
        setFeedback({ type: 'success', message: 'Lecture published and notes generated. Auto-quiz could not be created with current contracts.' });
      }

      resetForm();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate lecture notes.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} />}
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-2">Upload Lecture & Auto-Generate Notes</h2>
        <p className="text-gray-400 mb-6">Create a student-facing lecture from a transcript, YouTube link, or uploaded file while preserving the same dashboard flow.</p>
        <form onSubmit={handleGenerate} className="space-y-5">
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Lecture Topic</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g., Introduction to Machine Learning" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" disabled={isGenerating} /></div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lecture Source</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button type="button" onClick={() => setLectureMode('transcript')} disabled={isGenerating} className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${lectureMode === 'transcript' ? 'border-brand-cyan bg-brand-cyan text-white' : 'border-brand-border bg-brand-dark text-gray-300 hover:border-brand-cyan'}`}>Transcript Paste</button>
              <button type="button" onClick={() => setLectureMode('youtube')} disabled={isGenerating} className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${lectureMode === 'youtube' ? 'border-brand-cyan bg-brand-cyan text-white' : 'border-brand-border bg-brand-dark text-gray-300 hover:border-brand-cyan'}`}>YouTube Link</button>
              <button type="button" onClick={() => setLectureMode('video')} disabled={isGenerating} className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${lectureMode === 'video' ? 'border-brand-cyan bg-brand-cyan text-white' : 'border-brand-border bg-brand-dark text-gray-300 hover:border-brand-cyan'}`}>File Upload</button>
            </div>
          </div>

          {lectureMode === 'transcript' && (
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Lecture Transcript / Content</label><textarea value={transcript} onChange={e => setTranscript(e.target.value)} required rows={8} placeholder="Paste the lecture transcript, notes, or key content here..." className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none resize-y" disabled={isGenerating} /></div>
          )}

          {lectureMode === 'youtube' && (
            <>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">YouTube Link</label><input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" disabled={isGenerating} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Optional Teacher Notes / Transcript</label><textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={5} placeholder="Paste supporting notes for better AI-generated student notes..." className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none resize-y" disabled={isGenerating} /></div>
            </>
          )}

          {lectureMode === 'video' && (
            <>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Upload Lecture File</label><input type="file" accept="video/*,audio/*,.pdf,.txt,.doc,.docx" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-cyan file:text-white hover:file:bg-cyan-500" disabled={isGenerating} />{fileName && <p className="text-xs text-gray-400 mt-2">Selected: {fileName}</p>}</div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Optional Transcript / Teacher Notes</label><textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={5} placeholder="Add transcript snippets or teaching notes to improve note generation..." className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none resize-y" disabled={isGenerating} /></div>
            </>
          )}

          <button type="submit" disabled={isGenerating} className="bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center gap-2">{isGenerating ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Generating Notes...</> : <><SparklesIcon />Generate & Publish Notes</>}</button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">AI Notes Preview</h2>
          {!notesPreview ? (
            <p className="text-gray-500">Generate a lecture to preview the summary, key points, definitions, and slide structure here.</p>
          ) : (
            <div className="space-y-5 max-h-[42rem] overflow-y-auto pr-2">
              <div className="bg-brand-dark p-4 rounded-lg">
                <h3 className="font-semibold text-brand-cyan mb-2">Summary</h3>
                <p className="text-sm text-gray-300">{notesPreview.summary || 'Summary not available.'}</p>
              </div>

              <div className="bg-brand-dark p-4 rounded-lg">
                <h3 className="font-semibold text-brand-cyan mb-2">Key Points</h3>
                {notesPreview.keyPoints && notesPreview.keyPoints.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {notesPreview.keyPoints.map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}
                  </ul>
                ) : <p className="text-sm text-gray-500">No key points available.</p>}
              </div>

              <div className="bg-brand-dark p-4 rounded-lg">
                <h3 className="font-semibold text-brand-cyan mb-2">Definitions</h3>
                {notesPreview.definitions && notesPreview.definitions.length > 0 ? (
                  <div className="space-y-2">
                    {notesPreview.definitions.map((definition, index) => (
                      <div key={`${definition.term}-${index}`} className="bg-brand-dark-blue border border-brand-border rounded-md p-3">
                        <p className="font-medium">{definition.term}</p>
                        <p className="text-sm text-gray-400 mt-1">{definition.meaning}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-500">No definitions available.</p>}
              </div>

              <div className="bg-brand-dark p-4 rounded-lg">
                <h3 className="font-semibold text-brand-cyan mb-3">Structured Slides</h3>
                <div className="space-y-3">
                  {notesPreview.slides.map((slide, index) => (
                    <div key={`${slide.title}-${index}`} className="bg-brand-dark-blue border border-brand-border rounded-md p-3">
                      <p className="font-semibold mb-2">Slide {index + 1}: {slide.title}</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                        {slide.points.map((point, pointIndex) => <li key={`${point}-${pointIndex}`}>{point}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Past Academic Notes ({sortedLectures.length})</h2>
          {sortedLectures.length === 0 ? <p className="text-gray-500">No academic notes uploaded yet.</p> : (
            <div className="space-y-4 max-h-[42rem] overflow-y-auto pr-2">
              {sortedLectures.map(vl => (
                <div key={vl.id} className="bg-brand-dark rounded-lg p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{vl.topic}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${vl.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{vl.status === 'published' ? 'Published' : 'Draft'}</span>
                      </div>
                      <p className="text-sm text-gray-400">{new Date(vl.uploadedAt).toLocaleDateString()} · {vl.notes.slides.length} slides generated</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button onClick={() => setVideoLectureStatus(vl.id, vl.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${vl.status === 'published' ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700 text-green-400 hover:bg-green-900/20'}`}>{vl.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                      <button onClick={() => setExpandedId(expandedId === vl.id ? null : vl.id)} className="text-brand-cyan text-sm hover:underline">{expandedId === vl.id ? 'Collapse' : 'View Notes'}</button>
                      <button onClick={() => deleteVideoLecture(vl.id)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon /></button>
                    </div>
                  </div>
                  {expandedId === vl.id && (
                    <div className="mt-4 space-y-3 border-t border-brand-border pt-4">
                      <div className="bg-brand-dark-blue p-3 rounded-md">
                        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Stored Transcript</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{vl.transcript || 'No transcript stored.'}</p>
                      </div>
                      {vl.notes.slides.map((slide, i) => (
                        <div key={i} className="bg-brand-dark-blue p-3 rounded-md">
                          <p className="font-bold text-brand-cyan mb-1">Slide {i + 1}: {slide.title}</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 pl-2">{slide.points.map((p, j) => <li key={j}>{p}</li>)}</ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const QuestionPaperPage: React.FC<{ user: User; examPapers: ExamPaper[]; addExamPaper: (ep: Omit<ExamPaper, 'id'>) => Promise<void>; updateExamPaper: (ep: ExamPaper) => Promise<void>; deleteExamPaper: (id: string) => Promise<void>; setExamPaperStatus: (id: string, status: CurriculumStatus) => Promise<void>; }> = ({ user, examPapers, addExamPaper, deleteExamPaper, setExamPaperStatus }) => {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [sections, setSections] = useState(3);
  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [customQ, setCustomQ] = useState('');
  const [customMarks, setCustomMarks] = useState(5);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !topic.trim()) return;
    setIsGenerating(true); setError(null); setPreview(null);
    try { const paper = await generateExamPaperAI(subject, topic, sections, difficulty, selectedLanguage); setPreview(paper); }
    catch (err: any) { setError(err.message || 'Failed to generate paper.'); }
    finally { setIsGenerating(false); }
  };

  const handleAddCustomQuestion = () => {
    if (!preview || !customQ.trim()) return;
    const updated = { ...preview, sections: preview.sections.map((s: any, i: number) => i === preview.sections.length - 1 ? { ...s, questions: [...s.questions, { questionText: customQ, marks: customMarks, isCustom: true }] } : s) };
    updated.totalMarks = updated.sections.reduce((t: number, s: any) => t + s.questions.reduce((st: number, q: any) => st + q.marks, 0), 0);
    setPreview(updated); setCustomQ('');
  };

  const handleSave = async () => {
    if (!preview || !user.classCode) return;
    try { await addExamPaper({ ...preview, classCode: user.classCode, createdAt: new Date().toISOString() }); setPreview(null); setSubject(''); setTopic(''); alert('Exam paper saved!'); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Generate Question Paper</h2>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Subject</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required placeholder="e.g., Computer Science" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Topic / Chapter</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g., Data Structures and Algorithms" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
            <div className="flex gap-4">
              <div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Sections</label><input type="number" min={1} max={5} value={sections} onChange={e => setSections(Number(e.target.value))} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
              <div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label><select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
              <div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Language</label><select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"><option>English</option><option>Marathi</option><option>Hindi</option></select></div>
            </div>
            <button type="submit" disabled={isGenerating} className="w-full bg-brand-cyan text-white font-bold py-3 rounded-lg hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isGenerating ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Generating...</> : <><SparklesIcon />Generate Paper</>}</button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
          {preview && (<div className="mt-6 border-t border-brand-border pt-6"><h3 className="font-bold mb-3">Add Custom Question</h3><div className="space-y-3"><textarea value={customQ} onChange={e => setCustomQ(e.target.value)} rows={3} placeholder="Type your question..." className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /><div className="flex gap-3"><input type="number" value={customMarks} onChange={e => setCustomMarks(Number(e.target.value))} min={1} className="w-24 bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /><span className="text-gray-400 self-center text-sm">marks</span><button type="button" onClick={handleAddCustomQuestion} className="flex-1 bg-brand-dark-blue border border-brand-border text-white font-semibold py-2 px-4 rounded-lg hover:border-brand-cyan">Add to Paper</button></div></div><button onClick={handleSave} className="mt-4 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Save Exam Paper</button></div>)}
        </div>
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 overflow-y-auto max-h-[80vh]">
          <h2 className="text-2xl font-bold mb-6">Preview</h2>
          {!preview ? <p className="text-gray-500">Generated paper will appear here.</p> : (
            <div className="space-y-4"><div className="border-b border-brand-border pb-4"><h3 className="text-xl font-bold text-brand-cyan">{preview.title}</h3><p className="text-sm text-gray-400">{preview.subject} · {preview.duration} · Total: {preview.totalMarks} marks</p><p className="text-sm text-gray-300 mt-2 italic">{preview.instructions}</p></div>{preview.sections?.map((section: any, si: number) => (<div key={si} className="space-y-3"><h4 className="font-bold text-lg">{section.title}</h4>{section.instructions && <p className="text-sm text-gray-400 italic">{section.instructions}</p>}{section.questions?.map((q: any, qi: number) => (<div key={qi} className={`bg-brand-dark p-3 rounded-md text-sm ${q.isCustom ? 'border border-brand-cyan' : ''}`}><div className="flex justify-between"><p><span className="font-semibold">{qi + 1}. </span>{q.questionText}</p><span className="text-gray-400 ml-4 flex-shrink-0">[{q.marks}M]</span></div></div>))}</div>))}</div>
          )}
        </div>
      </div>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Saved Exam Papers ({examPapers.length})</h2>
        {examPapers.length === 0 ? <p className="text-gray-500">No exam papers saved yet.</p> : (
          <div className="space-y-4">{examPapers.map(ep => (
            <div key={ep.id} className="bg-brand-dark rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{ep.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${ep.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{ep.status === 'published' ? 'Published' : 'Draft'}</span>
                  </div>
                  <p className="text-sm text-gray-400">{ep.subject} · {ep.totalMarks} marks · {new Date(ep.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setExamPaperStatus(ep.id, ep.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${ep.status === 'published' ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700 text-green-400 hover:bg-green-900/20'}`}>{ep.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)} className="text-brand-cyan text-sm hover:underline">{expandedId === ep.id ? 'Collapse' : 'View'}</button>
                  <button onClick={() => deleteExamPaper(ep.id)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon /></button>
                </div>
              </div>
              {expandedId === ep.id && (<div className="mt-4 border-t border-brand-border pt-4 space-y-3"><p className="text-sm text-gray-400 italic">{ep.instructions}</p>{ep.sections?.map((s: any, si: number) => (<div key={si}><p className="font-bold text-sm mb-2">{s.title}</p>{s.questions?.map((q: any, qi: number) => (<div key={qi} className="flex justify-between text-sm bg-brand-dark-blue p-2 rounded mb-1"><span>{qi + 1}. {q.questionText}</span><span className="text-gray-400 ml-2">[{q.marks}M]</span></div>))}</div>))}</div>)}
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
};

const SmartResourceHubPage: React.FC<{ 
  user: User; 
  resourceHubs: SavedResourceHub[]; 
  addResourceHub: (a: Omit<SavedResourceHub, 'id'>) => Promise<void>; 
  updateResourceHub: (a: SavedResourceHub) => Promise<void>;
  deleteResourceHub: (id: string) => Promise<void>; 
  setResourceHubStatus: (id: string, status: CurriculumStatus) => Promise<void>; 
}> = ({ user, resourceHubs, addResourceHub, updateResourceHub, deleteResourceHub, setResourceHubStatus }) => {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResourceHubData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !subject.trim()) return;
    setIsLoading(true); setError(null); setResult(null);
    try {
      const data = await generateResources(topic, subject);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to suggest resources.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !user.classCode) return;
    try {
      await addResourceHub({
        topic,
        data: result,
        classCode: user.classCode,
        createdAt: new Date().toISOString(),
        status: 'draft'
      });
      setResult(null);
      setTopic('');
      setSubject('');
      alert('Resources saved to your hub!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-2 text-brand-cyan">Smart Resource Hub</h2>
        <p className="text-gray-400 mb-6 font-medium">Discover best real-world books, videos, and teaching guides categorized by level.</p>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required placeholder="Subject (e.g. Chemistry)" className="bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" />
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="Topic (e.g. Organic Reactions)" className="md:col-span-2 bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" />
          <button type="submit" disabled={isLoading} className="bg-brand-cyan text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">{isLoading ? 'Finding...' : <><SparklesIcon /> Find Resources</>}</button>
        </form>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>

      {result && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
              <div key={level} className="bg-brand-dark-blue border border-brand-border rounded-xl p-6 hover:border-brand-cyan transition-all shadow-lg relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-16 h-16 bg-brand-cyan/10 rounded-bl-full flex items-center justify-center">
                    <BookOpenIcon className="text-brand-cyan opacity-40" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-brand-cyan/20 text-brand-cyan mb-4 self-start`}>{level}</span>
                
                <div className="space-y-4 flex-grow">
                  <div>
                    <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Resource Name</span>
                    <input 
                      type="text" 
                      value={result[level].name} 
                      onChange={(e) => {
                        const next = {...result};
                        next[level].name = e.target.value;
                        setResult(next);
                      }}
                      className="w-full bg-brand-dark border border-brand-border rounded p-2 text-white font-bold text-sm focus:border-brand-cyan"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Type</span>
                      <input 
                        type="text" 
                        value={result[level].type} 
                        onChange={(e) => {
                          const next = {...result};
                          next[level].type = e.target.value;
                          setResult(next);
                        }}
                        className="w-full bg-brand-dark border border-brand-border rounded p-2 text-brand-cyan text-xs font-bold focus:border-brand-cyan"
                      />
                    </div>
                    <div className="opacity-60 flex items-end pb-1 text-[10px] font-bold text-gray-400">
                        {level === 'beginner' ? 'Foundational' : level === 'intermediate' ? 'Practical' : 'Expert'}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Why Useful</span>
                    <textarea 
                      value={result[level].whyUseful} 
                      onChange={(e) => {
                        const next = {...result};
                        next[level].whyUseful = e.target.value;
                        setResult(next);
                      }}
                      className="w-full bg-brand-dark border border-brand-border rounded p-2 text-gray-300 text-xs focus:border-brand-cyan"
                      rows={3}
                    />
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Suggested Use</span>
                    <textarea 
                      value={result[level].suggestedUse} 
                      onChange={(e) => {
                        const next = {...result};
                        next[level].suggestedUse = e.target.value;
                        setResult(next);
                      }}
                      className="w-full bg-brand-dark border border-brand-border rounded p-2 text-gray-400 text-xs italic focus:border-brand-cyan"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6 border-l-4 border-brand-cyan shadow-xl">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-brand-cyan"><SparklesIcon /> Pro Teaching Tip</h3>
            <textarea 
              value={result.teachingTip} 
              onChange={(e) => {
                setResult({...result, teachingTip: e.target.value});
              }}
              className="w-full bg-brand-dark border border-brand-border rounded p-3 text-sm text-gray-200 focus:border-brand-cyan"
              rows={2}
            />
          </div>

          <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-glow flex items-center justify-center gap-2">
            <UploadIcon /> Save Recommendations to Hub
          </button>
        </div>
      )}

      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Saved Topic Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resourceHubs.length === 0 ? <p className="text-gray-500 italic">No resource sets saved yet.</p> : resourceHubs.map(hub => (
            <div key={hub.id} className="bg-brand-dark p-6 rounded-xl border border-brand-border">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg">{hub.topic}</h3>
                <button onClick={() => deleteResourceHub(hub.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>
              </div>
              <div className="space-y-2 text-xs">
                <p className="text-gray-400"><span className="text-brand-cyan font-bold">Beginner:</span> {hub.data.beginner.name}</p>
                <p className="text-gray-400"><span className="text-brand-cyan font-bold">Mid:</span> {hub.data.intermediate.name}</p>
                <p className="text-gray-400"><span className="text-brand-cyan font-bold">Adv:</span> {hub.data.advanced.name}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-brand-border flex justify-between items-center">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${hub.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{hub.status || 'draft'}</span>
                <button onClick={() => setResourceHubStatus(hub.id, hub.status === 'published' ? 'draft' : 'published')} className="text-[10px] text-brand-cyan font-bold hover:underline">{hub.status === 'published' ? 'Switch to Draft' : 'Publish to Students'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CurriculumPage: React.FC<{ user: User; curriculumPlans: CurriculumPlan[]; addCurriculumPlan: (cp: Omit<CurriculumPlan, 'id'>) => Promise<void>; deleteCurriculumPlan: (id: string) => Promise<void>; }> = ({ user, curriculumPlans, addCurriculumPlan, deleteCurriculumPlan }) => {
  const [domain, setDomain] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ topics: CurriculumTopic[]; learningPath: string[] } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const trendColor = (t: string) => t === 'rising' ? 'text-green-400' : t === 'declining' ? 'text-red-400' : 'text-yellow-400';
  const trendLabel = (t: string) => t === 'rising' ? '↑ Rising' : t === 'declining' ? '↓ Declining' : '→ Stable';

  const teacherPlans = useMemo(() => {
    return [...(curriculumPlans as TeacherCurriculumPlan[])].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.generatedAt).getTime();
      const bTime = new Date(b.updatedAt ?? b.generatedAt).getTime();
      return bTime - aTime;
    });
  }, [curriculumPlans]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setIsGenerating(true); setError(null); setPreview(null); setFeedback(null);
    try {
      const result = await generateCurriculumIntelligenceAI(domain, selectedLanguage);
      setPreview(result);
      if (!title.trim()) setTitle(`${domain.trim()} Curriculum Plan`);
    }
    catch (err: any) { setError(err.message || 'Failed to generate curriculum plan.'); }
    finally { setIsGenerating(false); }
  };

  const saveCurriculum = async (status: CurriculumStatus) => {
    if (!preview || !user.classCode) return;
    try {
      if (status === 'draft') setIsSavingDraft(true);
      setFeedback(null);
      await addCurriculumPlan({
        domain,
        generatedAt: new Date().toISOString(),
        topics: preview.topics,
        learningPath: preview.learningPath,
        classCode: user.classCode,
        title: title.trim() || `${domain.trim()} Curriculum Plan`,
        description: description.trim(),
        status,
        updatedAt: new Date().toISOString(),
      } as Omit<CurriculumPlan, 'id'>);
      setPreview(null);
      setDomain('');
      setTitle('');
      setDescription('');
      setFeedback({ type: 'success', message: status === 'published' ? 'Curriculum published. Students will only see published curriculum items.' : 'Curriculum saved as draft.' });
    }
    catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save curriculum plan.' });
    }
    finally {
      setIsSavingDraft(false);
    }
  };

  const handleTogglePublish = async (plan: TeacherCurriculumPlan) => {
    try {
      await addCurriculumPlan({
        ...plan,
        status: plan.status === 'published' ? 'draft' : 'published',
        updatedAt: new Date().toISOString(),
      } as Omit<CurriculumPlan, 'id'>);
      await deleteCurriculumPlan(plan.id);
      setFeedback({ type: 'success', message: plan.status === 'published' ? 'Curriculum unpublished. Students will no longer see it.' : 'Curriculum published successfully.' });
    } catch (error) {
      setFeedback({ type: 'error', message: (error as Error).message || 'Failed to update publish status.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCurriculumPlan(id);
      setFeedback({ type: 'success', message: 'Curriculum item deleted.' });
    } catch (error) {
      setFeedback({ type: 'error', message: (error as Error).message || 'Failed to delete curriculum item.' });
    }
  };

  return (
    <div className="space-y-8">
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-2">Market-Aligned Curriculum Intelligence</h2>
          <p className="text-gray-400 mb-6">Create draft or published curriculum content. Students should later see only published items.</p>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Plan Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., AI Foundations Semester Plan" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional description shown to help organize curriculum plans..." className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none resize-y" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Technology Domain</label><input type="text" value={domain} onChange={e => setDomain(e.target.value)} required placeholder="e.g., Artificial Intelligence, Cloud Computing, DevOps" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
              <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none">
                <option>English</option>
                <option>Marathi</option>
                <option>Hindi</option>
              </select>
            </div>
            <button type="submit" disabled={isGenerating} className="w-full bg-brand-cyan text-white font-bold py-3 rounded-lg hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isGenerating ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Analyzing Market...</> : <><SparklesIcon />Generate Curriculum Intelligence</>}</button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
          {preview && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => saveCurriculum('draft')} disabled={isSavingDraft} className="w-full bg-brand-dark border border-brand-border text-white font-bold py-3 rounded-lg hover:border-brand-cyan disabled:opacity-60">{isSavingDraft ? 'Saving Draft...' : 'Save as Draft'}</button>
              <button onClick={() => saveCurriculum('published')} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Publish for Students</button>
            </div>
          )}
        </div>
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 overflow-y-auto max-h-[80vh]">
          {!preview ? <div className="text-gray-500 text-center mt-8">Analysis results will appear here.</div> : (
            <div className="space-y-6">
              <div><h3 className="text-xl font-bold mb-4">Topic Demand Analysis</h3><div className="space-y-3">{preview.topics.map((t, i) => (<div key={i} className="bg-brand-dark p-4 rounded-lg"><div className="flex justify-between items-center mb-2"><h4 className="font-semibold">{t.name}</h4><div className="flex items-center gap-3"><span className={`text-xs font-semibold ${trendColor(t.growthTrend)}`}>{trendLabel(t.growthTrend)}</span><span className="text-sm font-bold text-brand-cyan">{t.demandScore}/100</span></div></div><div className="w-full bg-gray-700 rounded-full h-2 mb-2"><div className="bg-brand-cyan h-2 rounded-full" style={{ width: `${t.demandScore}%` }}></div></div><p className="text-xs text-gray-400">Roles: {t.jobRoles.join(', ')}</p></div>))}</div></div>
              <div><h3 className="text-xl font-bold mb-4">Recommended Learning Path</h3><div className="space-y-2">{preview.learningPath.map((step, i) => (<div key={i} className="flex items-center gap-3 bg-brand-dark p-3 rounded-md"><div className="w-7 h-7 rounded-full bg-brand-cyan text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div><span className="text-sm">{step}</span></div>))}</div></div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Saved Curriculum Plans ({teacherPlans.length})</h2>
        {teacherPlans.length === 0 ? <p className="text-gray-500">No curriculum plans saved yet.</p> : (
          <div className="space-y-4">
            {teacherPlans.map(cp => (
              <div key={cp.id} className="bg-brand-dark rounded-lg p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold">{cp.title || cp.domain}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cp.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{cp.status === 'published' ? 'Published' : 'Draft'}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{cp.domain} · {cp.topics.length} topics · {new Date(cp.generatedAt).toLocaleDateString()}</p>
                    {cp.description && <p className="text-sm text-gray-500 mt-2">{cp.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button onClick={() => setExpandedId(expandedId === cp.id ? null : cp.id)} className="text-brand-cyan text-sm hover:underline">{expandedId === cp.id ? 'Collapse' : 'View'}</button>
                    <button onClick={() => handleTogglePublish(cp)} className={`text-sm font-semibold ${cp.status === 'published' ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}>{cp.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                    <button onClick={() => handleDelete(cp.id)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon /></button>
                  </div>
                </div>
                {expandedId === cp.id && (
                  <div className="mt-3 border-t border-brand-border pt-3 space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-2">Topics</p>
                      <div className="space-y-2">
                        {cp.topics.map((t, ti) => <div key={ti} className="flex justify-between text-sm bg-brand-dark-blue p-2 rounded"><span>{t.name}</span><span className={trendColor(t.growthTrend)}>{t.demandScore}/100</span></div>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Learning Path</p>
                      <div className="space-y-2">
                        {cp.learningPath.map((step, index) => <div key={`${step}-${index}`} className="text-sm bg-brand-dark-blue p-2 rounded">{index + 1}. {step}</div>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const QuizGenerationPage: React.FC<Pick<TeacherPortalProps, 'user' | 'quizzes' | 'addQuiz' | 'updateQuiz' | 'deleteQuiz' | 'generatedLectures' | 'setQuizStatus'>> = ({ user, quizzes, addQuiz, updateQuiz, deleteQuiz, generatedLectures, setQuizStatus }) => {
  const [generationMode, setGenerationMode] = useState<'topic' | 'lecture'>('topic');
  const [selectedLectureId, setSelectedLectureId] = useState('');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<Omit<Quiz, 'id' | 'classCode'> | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  useEffect(() => { if (editingQuiz) { setTopic(editingQuiz.topic); setGeneratedQuiz(null); setGenerationMode('topic'); } else { setTopic(''); } }, [editingQuiz]);

  const handleGenerateQuiz = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuiz) {
      setIsLoading(true);
      try { await updateQuiz({ ...editingQuiz, topic }); setEditingQuiz(null); alert('Quiz topic updated!'); }
      catch { alert('Failed to update quiz.'); }
      finally { setIsLoading(false); }
      return;
    }
    setIsLoading(true); setError(null); setGeneratedQuiz(null);
    try {
      let quiz: Omit<Quiz, 'id' | 'classCode'>;
      if (generationMode === 'lecture') {
        if (!selectedLectureId) throw new Error("Please select a lecture.");
        const selectedLecture = generatedLectures.find(l => l.id === selectedLectureId);
        if (!selectedLecture) throw new Error("Selected lecture not found.");
        const lectureContent = selectedLecture.slides.map(slide => `Slide: ${slide.title}\n${slide.points.map(p => `- ${p}`).join('\n')}`).join('\n\n');
        quiz = await generateQuizFromContent(lectureContent, numQuestions, difficulty, selectedLanguage);
        quiz.topic = `Quiz on: ${selectedLecture.topic}`;
      } else {
        if (!topic.trim()) throw new Error("Please enter a topic.");
        quiz = await generateQuiz(topic, numQuestions, difficulty, selectedLanguage);
      }
      setGeneratedQuiz(quiz);
    } catch (err: any) { setError(err.message || "An unknown error occurred."); }
    finally { setIsLoading(false); }
  }, [topic, numQuestions, difficulty, editingQuiz, updateQuiz, generationMode, selectedLectureId, generatedLectures, selectedLanguage]);

  const handleSaveQuiz = async () => {
    if (generatedQuiz && user.classCode) {
      setIsSaving(true);
      try { await addQuiz({ ...generatedQuiz, classCode: user.classCode }); setGeneratedQuiz(null); setTopic(''); setSelectedLectureId(''); alert('Quiz saved and is now available for students!'); }
      catch (error) { alert(`An error occurred while saving the quiz: ${(error as Error).message}`); }
      finally { setIsSaving(false); }
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">{editingQuiz ? `Editing Quiz: ${editingQuiz.topic}` : 'Create a New Quiz'}</h2>
          <form onSubmit={handleGenerateQuiz} className="space-y-4">
            {!editingQuiz && (<div><label className="block text-sm font-medium text-gray-300 mb-2">Generation Mode</label><div className="flex bg-brand-dark rounded-lg p-1"><button type="button" onClick={() => setGenerationMode('topic')} className={`w-1/2 py-2 rounded-md transition-colors ${generationMode === 'topic' ? 'bg-brand-cyan text-white' : 'text-gray-400 hover:bg-brand-border'}`}>From Topic</button><button type="button" onClick={() => setGenerationMode('lecture')} className={`w-1/2 py-2 rounded-md transition-colors ${generationMode === 'lecture' ? 'bg-brand-cyan text-white' : 'text-gray-400 hover:bg-brand-border'}`}>From Lecture</button></div></div>)}
            {generationMode === 'topic' ? (<div><label className="block text-sm font-medium text-gray-300 mb-2">Quiz Topic</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., 'React Hooks'" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>) : (<div><label className="block text-sm font-medium text-gray-300 mb-2">Select Lecture</label><select value={selectedLectureId} onChange={e => setSelectedLectureId(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" disabled={generatedLectures.length === 0}><option value="">{generatedLectures.length === 0 ? 'No lectures generated yet' : 'Select a lecture...'}</option>{generatedLectures.map(l => <option key={l.id} value={l.id}>{l.topic}</option>)}</select></div>)}
            {!editingQuiz && (
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Questions</label><input type="number" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} min="1" max="10" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
                <div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label><select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
                <div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Language</label><select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"><option>English</option><option>Marathi</option><option>Hindi</option></select></div>
              </div>
            )}
            <div className="flex gap-4 pt-2">
              {editingQuiz ? (<><button type="button" onClick={() => { setEditingQuiz(null); setError(null); }} className="w-full bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700">Cancel</button><button type="submit" disabled={isLoading} className="w-full bg-brand-light-blue text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed">{isLoading ? 'Updating...' : 'Update Topic'}</button></>) : (<button type="submit" disabled={isLoading} className="w-full bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isLoading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Generating...</> : <><SparklesIcon /> Generate with AI</>}</button>)}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </form>
        </div>
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Quiz Preview</h2>
          {generatedQuiz ? (<div className="h-full flex flex-col"><h3 className="text-xl font-bold mb-4">{generatedQuiz.topic}</h3><div className="space-y-4 mb-6 flex-grow overflow-y-auto pr-2 max-h-80">{generatedQuiz.questions.map((q, i) => (
            <div key={i} className="bg-brand-dark p-4 rounded-lg border border-brand-border group hover:border-brand-cyan transition-all">
              <p className="font-bold flex items-center gap-2">{i + 1}. {q.questionText}</p>
              <ul className="list-disc list-inside ml-6 mt-2 text-sm text-gray-400 grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((opt, j) => <li key={j} className={j === q.correctAnswerIndex ? 'text-green-400 font-bold bg-green-900/10 p-2 rounded border border-green-900/30' : 'bg-brand-dark-blue/50 p-2 rounded border border-brand-border/30'}>{opt}</li>)}
              </ul>
              {q.explanation && (
                <div className="mt-4 p-4 bg-brand-dark-blue/80 rounded-lg border-l-4 border-brand-cyan text-xs">
                  <p className="font-bold text-brand-cyan mb-1 flex items-center gap-2"><SparklesIcon /> AI Explanation:</p>
                  <p className="text-gray-300 mb-2">{q.explanation}</p>
                  {q.whyOthersWrong && <p className="text-gray-500 italic"><span className="font-bold">Why others:</span> {q.whyOthersWrong}</p>}
                </div>
              )}
            </div>
          ))}</div><button onClick={handleSaveQuiz} disabled={isSaving} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:bg-green-800 disabled:cursor-not-allowed">{isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</> : <><BookOpenIcon /> Save and Publish Quiz</>}</button></div>) : (<div className="flex items-center justify-center h-full text-center text-gray-500"><p>Generated quiz will be displayed here for review before saving.</p></div>)}
        </div>
      </div>
      <div className="mt-8 bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">My Quizzes</h2>
        {quizzes.length > 0 ? (
          <div className="space-y-4">{quizzes.map(quiz => (
            <div key={quiz.id} className="bg-brand-dark p-4 rounded-lg flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{quiz.topic}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${quiz.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{quiz.status === 'published' ? 'Published' : 'Draft'}</span>
                </div>
                <p className="text-sm text-gray-400">{quiz.questions.length} questions</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setQuizStatus(quiz.id, quiz.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${quiz.status === 'published' ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700 text-green-400 hover:bg-green-900/20'}`}>{quiz.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => setEditingQuiz(quiz)} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300"><EditIcon /> Edit</button>
                <button onClick={() => deleteQuiz(quiz.id)} className="flex items-center gap-2 text-red-500 hover:text-red-400"><TrashIcon /> Delete</button>
              </div>
            </div>
          ))}</div>
        ) : <p className="text-gray-500 text-center py-8">You haven't created any quizzes yet.</p>}
      </div>
    </>
  );
};

const VisualizationPage: React.FC<{ quizzes: Quiz[], submissions: Submission[] }> = ({ quizzes, submissions }) => {
  if (quizzes.length === 0) return (<div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 text-center"><h2 className="text-2xl font-bold mb-4">No Quizzes Found</h2><p className="text-gray-400">Create a quiz in the "Quiz Generation" tab to see student analytics here.</p></div>);
  
  const streakCount = submissions.length > 0 ? Array.from(new Set(submissions.map(s => s.submittedAt.split('T')[0]))).length : 0;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-8 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <div className="text-6xl text-orange-400 drop-shadow-glow">🔥</div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">Class Persistence Streak</h3>
            <p className="text-xl text-orange-200 font-bold">Current Streak: {streakCount} Days of Learning!</p>
            <p className="text-sm text-orange-100/70 mt-2 italic">"Consistently showing up is half the battle won. Great job, class!"</p>
          </div>
        </div>
        <div className="text-center px-6 py-3 bg-brand-dark/40 rounded-lg border border-orange-500/20">
            <div className="text-4xl font-bold text-white">{submissions.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-orange-300 font-bold">Quizzes Attempted</div>
        </div>
      </div>

      {quizzes.map(quiz => {
        const quizSubmissions = submissions.filter(s => s.quizId === quiz.id);
        const averageScore = quizSubmissions.length > 0 ? (quizSubmissions.reduce((acc, s) => acc + s.score, 0) / quizSubmissions.length).toFixed(1) : 0;
        
        const high = quizSubmissions.filter(s => (s.score / s.totalQuestions) > 0.75).length;
        const med = quizSubmissions.filter(s => {
            const p = s.score / s.totalQuestions;
            return p >= 0.4 && p <= 0.75;
        }).length;
        const low = quizSubmissions.filter(s => (s.score / s.totalQuestions) < 0.4).length;
        const total = Math.max(quizSubmissions.length, 1);

        return (
          <div key={quiz.id} className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 border-l-4 border-brand-cyan pl-4">{quiz.topic}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-brand-dark p-6 rounded-xl border border-brand-border">
                    <p className="text-sm text-gray-400 mb-1">Total Attempts</p>
                    <p className="text-4xl font-black text-white">{quizSubmissions.length}</p>
                </div>
                <div className="bg-brand-dark p-6 rounded-xl border border-brand-border">
                    <p className="text-sm text-gray-400 mb-1">Average Score</p>
                    <p className="text-4xl font-black text-brand-cyan">{averageScore} <span className="text-lg font-normal text-gray-500">/ {quiz.questions.length}</span></p>
                </div>
                <div className="bg-brand-dark p-6 rounded-xl border border-brand-border">
                    <p className="text-sm text-gray-400 mb-2">Performance Breakdown</p>
                    <div className="flex gap-2 items-end h-12">
                        <div className="w-full bg-green-500/30 border-t-2 border-green-500 rounded-t-sm" style={{ height: `${(high/total)*100 || 5}%` }}></div>
                        <div className="w-full bg-yellow-500/30 border-t-2 border-yellow-500 rounded-t-sm" style={{ height: `${(med/total)*100 || 5}%` }}></div>
                        <div className="w-full bg-red-500/30 border-t-2 border-red-500 rounded-t-sm" style={{ height: `${(low/total)*100 || 5}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-12 mb-8 bg-brand-dark/30 p-8 rounded-xl border border-brand-border/50">
                <div className="relative w-48 h-48 rounded-full border-[12px] border-brand-border flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0" style={{ 
                        background: `conic-gradient(#10b981 0% ${(high/total)*100}%, #f59e0b ${(high/total)*100}% ${((high+med)/total)*100}%, #ef4444 ${((high+med)/total)*100}% 100%)` 
                    }}></div>
                    <div className="absolute inset-4 rounded-full bg-brand-dark-blue flex items-center justify-center flex-col shadow-2xl">
                        <span className="text-3xl font-bold">{quizSubmissions.length}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Participants</span>
                    </div>
                </div>
                <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center justify-between p-3 bg-brand-dark rounded-lg border-l-4 border-green-500">
                        <span className="font-semibold">High (&gt;75%)</span>
                        <span className="font-bold text-green-400">{high} Students ({Math.round((high/total)*100)}%)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-brand-dark rounded-lg border-l-4 border-yellow-500">
                        <span className="font-semibold">Medium (40-75%)</span>
                        <span className="font-bold text-yellow-400">{med} Students ({Math.round((med/total)*100)}%)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-brand-dark rounded-lg border-l-4 border-red-500">
                        <span className="font-semibold">Low (&lt;40%)</span>
                        <span className="font-bold text-red-400">{low} Students ({Math.round((low/total)*100)}%)</span>
                    </div>
                </div>
            </div>
            </div>
          );
        })}
    </div>
  );
};

const AnimationGeneratorPage: React.FC<{ 
  user: User; 
  animationScripts: AnimationScript[];
  addAnimationScript: (a: Omit<AnimationScript, 'id'>) => Promise<void>; 
  updateAnimationScript: (a: AnimationScript) => Promise<void>;
  deleteAnimationScript: (id: string) => Promise<void>;
  setAnimationScriptStatus: (id: string, status: CurriculumStatus) => Promise<void>; 
  isOfflineMode: boolean; 
}> = ({ user, animationScripts, addAnimationScript, updateAnimationScript, deleteAnimationScript, setAnimationScriptStatus, isOfflineMode }) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewScript, setPreviewScript] = useState<Omit<AnimationScript, 'id' | 'classCode' | 'createdAt'> | null>(null);
  const [editingScript, setEditingScript] = useState<AnimationScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<AnimationScript | Omit<AnimationScript, 'id' | 'classCode' | 'createdAt'> | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsLoading(true); setError(null); setPreviewScript(null); setEditingScript(null); setSuccessMessage(null);
    try {
      const result = await generateAnimationScript(topic);
      setPreviewScript(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate script.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreview = async () => {
    if (!previewScript || !user.classCode) return;
    try {
      await addAnimationScript({
        ...previewScript,
        classCode: user.classCode,
        createdAt: new Date().toISOString()
      });
      setPreviewScript(null);
      setTopic('');
      setSuccessMessage('Animation script saved!');
    } catch (err: any) {
      setError(err.message || 'Failed to save script.');
    }
  };

  const handleUpdateField = (field: 'visual' | 'voiceScript', sceneIdx: number, value: string) => {
    if (editingScript) {
      const next = { ...editingScript };
      next.scenes[sceneIdx][field] = value;
      setEditingScript(next);
    } else if (previewScript) {
      const next = { ...previewScript };
      next.scenes[sceneIdx][field] = value;
      setPreviewScript(next);
    }
  };

  const handleSaveUpdate = async () => {
    if (!editingScript) return;
    try {
      await updateAnimationScript(editingScript);
      setSuccessMessage('Animation script updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeScript = editingScript || previewScript;

  // Direct animation launch — no script needed!
  const [directTopic, setDirectTopic] = useState('');
  const [showDirectAnim, setShowDirectAnim] = useState(false);
  const [directAnimTopic, setDirectAnimTopic] = useState('');

  const launchAnimation = (t: string) => {
    if (!t.trim()) return;
    setDirectAnimTopic(t.trim());
    setShowDirectAnim(true);
  };

  const quickTopics = [
    { label: '☀️ Solar System', topic: 'Solar System and Planets' },
    { label: '⚛️ Atomic Structure', topic: 'Atom and Electron Structure' },
    { label: '🌱 Photosynthesis', topic: 'Photosynthesis in Plants' },
    { label: '💧 Water Cycle', topic: 'Water Cycle and Precipitation' },
    { label: '🔬 Cell Biology', topic: 'Cell Structure and Organelles' },
    { label: '⚡ Electricity', topic: 'Electric Current and Circuits' },
    { label: '🧬 DNA', topic: 'DNA Structure and Genetics' },
    { label: '🌍 Gravity', topic: 'Gravity and Newton Laws' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section — Direct Animation Launcher */}
      <div className="bg-gradient-to-br from-brand-dark-blue to-brand-dark border border-brand-border rounded-2xl p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
        <div className="relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-white mb-2">3D Animation Engine</h2>
            <p className="text-gray-400 text-sm">Type any topic and watch it come alive with interactive 3D animations</p>
          </div>
          
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={directTopic}
                onChange={e => setDirectTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && launchAnimation(directTopic)}
                placeholder="Enter any topic... e.g., Solar System, Photosynthesis"
                className="flex-1 bg-black/40 border-2 border-brand-cyan/30 rounded-2xl px-6 py-4 text-white text-lg focus:ring-4 focus:ring-brand-cyan/20 focus:border-brand-cyan outline-none transition-all placeholder-gray-500"
              />
              <button
                onClick={() => launchAnimation(directTopic)}
                disabled={!directTopic.trim()}
                className="px-8 py-4 bg-brand-cyan text-black font-black rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 text-sm whitespace-nowrap"
              >
                🚀 LAUNCH
              </button>
            </div>
            
            {/* Quick Topics */}
            <div className="flex flex-wrap gap-2 justify-center">
              {quickTopics.map(qt => (
                <button
                  key={qt.topic}
                  onClick={() => launchAnimation(qt.topic)}
                  className="px-4 py-2 bg-white/5 hover:bg-brand-cyan/20 border border-white/10 hover:border-brand-cyan/50 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all"
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two columns: Saved + Script Editor (secondary) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Saved Animations */}
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h3 className="text-xl font-bold mb-4 text-brand-cyan">Saved Animations ({animationScripts.length})</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {animationScripts.length === 0 ? <p className="text-gray-500 italic">No animations saved yet. Launch an animation above!</p> : animationScripts.map(s => (
              <div key={s.id} className="bg-brand-dark p-4 rounded-lg border border-brand-border flex justify-between items-center group hover:border-brand-cyan/30 transition-all">
                <div>
                  <p className="font-semibold text-gray-100">{s.title}</p>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{s.scenes.length} Scenes · {new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => launchAnimation(s.title.replace(' - Educational Animation', ''))} className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-brand-cyan bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan hover:text-white transition-all">▶ Play</button>
                  <button onClick={() => deleteAnimationScript(s.id)} className="text-red-500/60 hover:text-red-400 p-2 transition-colors"><TrashIcon /></button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Script Generator (collapsed/secondary) */}
          <div className="mt-8 pt-6 border-t border-brand-border">
            <h3 className="text-sm font-bold text-gray-400 mb-3">📝 Generate Script (Optional)</h3>
            <form onSubmit={handleGenerate} className="flex gap-2">
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic for script..." className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-cyan outline-none text-sm" />
              <button type="submit" disabled={isLoading} className="bg-brand-cyan/20 text-brand-cyan font-bold px-4 py-2 rounded-lg hover:bg-brand-cyan/30 text-sm transition-all disabled:opacity-50">{isLoading ? '...' : 'Generate'}</button>
            </form>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            {successMessage && <p className="text-green-500 text-xs mt-2">{successMessage}</p>}
          </div>
        </div>

        {/* Script Preview (secondary) */}
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{editingScript ? 'Edit Script' : 'Script Preview'}</h2>
            <div className="flex gap-2">
              {activeScript && (
                <>
                  <button onClick={() => launchAnimation(activeScript.title.replace(' - Educational Animation', ''))} className="text-[10px] font-bold uppercase tracking-widest bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/50 px-3 py-1.5 rounded-lg hover:bg-brand-cyan hover:text-white transition-all flex items-center gap-2"><PlayIcon /> Watch</button>
                  {!editingScript && previewScript && <button onClick={handleSavePreview} className="text-[10px] font-bold uppercase bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">Save</button>}
                </>
              )}
            </div>
          </div>
          
          {activeScript ? (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {activeScript.scenes.map((scene, i) => (
                <div key={i} className="bg-brand-dark p-4 rounded-xl border border-brand-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-cyan/60 mb-2">Scene {i + 1}</p>
                  <p className="text-sm text-gray-300 mb-2">{scene.visual}</p>
                  <p className="text-sm text-brand-cyan/80 italic">{scene.voiceScript}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center text-gray-600 gap-4">
              <div className="text-5xl">🎬</div>
              <p className="text-gray-400">Use the quick topic buttons above to launch an instant animation!</p>
              <p className="text-gray-600 text-xs">Or generate a script to customize scenes</p>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen Animation Engine */}
      {showDirectAnim && (
        <AnimationEngine 
          topic={directAnimTopic}
          onClose={() => setShowDirectAnim(false)} 
        />
      )}
      {playingVideo && !showDirectAnim && (
        <AnimationEngine 
          topic={playingVideo.title || playingVideo.topic || 'Educational Topic'}
          onClose={() => setPlayingVideo(null)} 
        />
      )}
    </div>
  );
};

const AnimationVideoSimulator: React.FC<{ script: any, onClose: () => void }> = ({ script, onClose }) => {
  const [currentScene, setCurrentScene] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [sceneProgress, setSceneProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const progressRef = useRef<number>(0);

  const scenes = script.scenes || [];
  const totalScenes = scenes.length;

  // Color themes per scene
  const sceneColors = [
    { primary: '#00ccff', secondary: '#0066ff', bg: 'from-blue-950/50 to-cyan-950/30' },
    { primary: '#ff6b35', secondary: '#ff2d55', bg: 'from-orange-950/50 to-red-950/30' },
    { primary: '#00ff88', secondary: '#00cc66', bg: 'from-green-950/50 to-emerald-950/30' },
    { primary: '#a855f7', secondary: '#7c3aed', bg: 'from-purple-950/50 to-violet-950/30' },
    { primary: '#facc15', secondary: '#f59e0b', bg: 'from-yellow-950/50 to-amber-950/30' },
  ];
  const theme = sceneColors[currentScene % sceneColors.length];

  // --- Canvas Particle System ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: Math.random() * 3 + 1,
        color: theme.primary,
        life: Math.random()
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.005;
        if (p.x < 0 || p.x > canvas.offsetWidth) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.offsetHeight) p.vy *= -1;

        const alpha = Math.sin(p.life * Math.PI) * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${theme.primary}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${theme.primary}${Math.round((1 - dist / 120) * 40).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [currentScene]);

  // --- Scene Progress Timer ---
  useEffect(() => {
    if (isPaused || isComplete) return;
    progressRef.current = 0;
    setSceneProgress(0);
    const interval = setInterval(() => {
      progressRef.current += 1;
      setSceneProgress(progressRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [currentScene, isPaused, isComplete]);

  // --- Typing narration effect ---
  useEffect(() => {
    if (isComplete || !scenes[currentScene]) return;
    const text = scenes[currentScene].voiceScript || '';
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [currentScene, isComplete]);

  // --- TTS Speak ---
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (!isPaused && currentScene < totalScenes - 1) {
        setTimeout(() => setCurrentScene(prev => prev + 1), 2000);
      } else if (currentScene >= totalScenes - 1) {
        setTimeout(() => setIsComplete(true), 1500);
      }
    };
    window.speechSynthesis.speak(utterance);
  }, [currentScene, totalScenes, isPaused]);

  useEffect(() => {
    if (!isPaused && !isComplete && scenes[currentScene]) {
      speak(scenes[currentScene].voiceScript || '');
    }
    return () => window.speechSynthesis.cancel();
  }, [currentScene, isPaused, isComplete]);

  const goToScene = (idx: number) => {
    window.speechSynthesis.cancel();
    setIsComplete(false);
    setCurrentScene(idx);
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
    } else {
      setIsPaused(true);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const replay = () => {
    setIsComplete(false);
    setCurrentScene(0);
    setIsPaused(false);
  };

  // Generate 3D shapes based on scene index
  const shapes3D = useMemo(() => {
    return [...Array(8)].map((_, i) => ({
      size: Math.random() * 60 + 30,
      x: Math.random() * 80 + 10,
      y: Math.random() * 70 + 15,
      rotSpeed: Math.random() * 20 + 10,
      delay: Math.random() * 5,
      type: i % 3 // 0=cube, 1=pyramid, 2=sphere
    }));
  }, [currentScene]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Canvas Particle Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-50" />

      {/* Gradient Mesh Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} opacity-60`} />

      {/* Close Button */}
      <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }}
        className="absolute top-6 right-6 z-[120] text-white/70 hover:text-white flex items-center gap-2 font-bold text-xs bg-white/5 hover:bg-white/15 px-5 py-3 rounded-full border border-white/10 transition-all backdrop-blur-xl">
        ✕ Exit Animation
      </button>

      {/* Main Stage */}
      <div className="relative w-full max-w-6xl mx-auto px-8 flex flex-col items-center justify-center flex-1" style={{ perspective: '1500px' }}>
        
        {isComplete ? (
          /* --- COMPLETION SCREEN --- */
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="text-8xl mb-4">🎓</div>
            <h2 className="text-5xl font-black text-white">Animation Complete!</h2>
            <p className="text-xl text-white/60">{script.title}</p>
            <p className="text-white/40">{totalScenes} scenes · Educational Visualization</p>
            <div className="flex gap-4 justify-center mt-8">
              <button onClick={replay} className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-all">
                🔄 Replay
              </button>
              <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="px-8 py-4 text-white font-bold rounded-2xl transition-all" style={{ background: theme.primary }}>
                ✓ Done
              </button>
            </div>
          </div>
        ) : (
          /* --- SCENE DISPLAY --- */
          <>
            {/* Title Bar */}
            <div className="absolute top-4 left-0 right-0 flex justify-between items-start px-4 z-20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: theme.primary }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: theme.primary }}>3D Visualization Active</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">{script.title}</h2>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 text-center">
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Scene</p>
                <p className="text-xl font-black text-white">{currentScene + 1}<span className="text-white/30 text-sm">/{totalScenes}</span></p>
              </div>
            </div>

            {/* 3D Objects Stage */}
            <div className="relative w-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d', minHeight: '350px' }}>
              {/* Floating 3D Shapes */}
              {shapes3D.map((shape, i) => (
                <div key={i} className="absolute" style={{
                  left: shape.x + '%', top: shape.y + '%',
                  width: shape.size + 'px', height: shape.size + 'px',
                  animation: `float3D ${shape.rotSpeed}s ease-in-out infinite`,
                  animationDelay: shape.delay + 's',
                  transformStyle: 'preserve-3d',
                  opacity: 0.15,
                }}>
                  {shape.type === 0 && (
                    <div style={{
                      width: '100%', height: '100%',
                      border: `2px solid ${theme.primary}`,
                      animation: `spin3D ${shape.rotSpeed}s linear infinite`,
                      transformStyle: 'preserve-3d',
                    }} />
                  )}
                  {shape.type === 1 && (
                    <div style={{
                      width: 0, height: 0,
                      borderLeft: `${shape.size / 2}px solid transparent`,
                      borderRight: `${shape.size / 2}px solid transparent`,
                      borderBottom: `${shape.size}px solid ${theme.primary}40`,
                      animation: `spin3D ${shape.rotSpeed * 1.5}s linear infinite`,
                    }} />
                  )}
                  {shape.type === 2 && (
                    <div style={{
                      width: shape.size * 0.6, height: shape.size * 0.6,
                      borderRadius: '50%',
                      border: `2px solid ${theme.primary}60`,
                      boxShadow: `0 0 ${shape.size}px ${theme.primary}20, inset 0 0 ${shape.size / 2}px ${theme.primary}10`,
                      animation: `float3D ${shape.rotSpeed}s ease-in-out infinite`,
                    }} />
                  )}
                </div>
              ))}

              {/* Orbital Rings */}
              <div className="absolute w-[400px] h-[400px] rounded-full border border-dashed opacity-10" style={{ borderColor: theme.primary, animation: 'spin 30s linear infinite' }} />
              <div className="absolute w-[300px] h-[300px] rounded-full border opacity-10" style={{ borderColor: theme.secondary, animation: 'spin 20s linear infinite reverse' }} />

              {/* Central Visual Description Card */}
              <div key={currentScene} className="relative z-10 max-w-2xl mx-auto text-center" style={{
                animation: 'sceneEnter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                transformStyle: 'preserve-3d',
              }}>
                <div className="p-10 rounded-3xl border backdrop-blur-xl" style={{
                  borderColor: theme.primary + '30',
                  background: `linear-gradient(135deg, ${theme.primary}08, ${theme.secondary}05)`,
                  boxShadow: `0 0 80px ${theme.primary}15, 0 0 200px ${theme.primary}05`,
                }}>
                  {/* Scene Icon */}
                  <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{
                      background: `${theme.primary}15`,
                      border: `1px solid ${theme.primary}30`,
                    }}>
                      {currentScene === 0 ? '🎬' : currentScene === totalScenes - 1 ? '🎯' : '🔬'}
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white leading-snug">
                    {scenes[currentScene]?.visual || 'Loading scene...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Narration Bar */}
            <div className="absolute bottom-28 left-0 right-0 px-8 z-20">
              <div className={`max-w-4xl mx-auto transition-all duration-700 ${isSpeaking ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'}`}>
                <div className="flex items-start gap-4 bg-black/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                  {/* Audio Bars */}
                  <div className="flex gap-1 pt-2 flex-shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 rounded-full transition-all" style={{
                        background: theme.primary,
                        height: isSpeaking ? (Math.random() * 20 + 10) + 'px' : '4px',
                        animation: isSpeaking ? `audioBar 0.4s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
                      }} />
                    ))}
                  </div>
                  <p className="text-lg text-white/80 leading-relaxed">
                    "{displayedText}"<span className="inline-block w-0.5 h-5 bg-white/50 ml-1 animate-pulse" />
                  </p>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-6 left-0 right-0 px-8 z-20">
              <div className="max-w-4xl mx-auto flex items-center gap-4">
                {/* Scene dots */}
                <div className="flex gap-2">
                  {scenes.map((_: any, i: number) => (
                    <button key={i} onClick={() => goToScene(i)}
                      className="w-3 h-3 rounded-full transition-all hover:scale-125"
                      style={{
                        background: i === currentScene ? theme.primary : i < currentScene ? theme.primary + '60' : 'rgba(255,255,255,0.15)',
                        boxShadow: i === currentScene ? `0 0 10px ${theme.primary}80` : 'none',
                      }}
                    />
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{
                    width: `${((currentScene + 1) / totalScenes) * 100}%`,
                    background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                    boxShadow: `0 0 15px ${theme.primary}60`,
                  }} />
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                  <button onClick={() => currentScene > 0 && goToScene(currentScene - 1)}
                    disabled={currentScene === 0}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all disabled:opacity-20">
                    ◀
                  </button>
                  <button onClick={togglePause}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold transition-all"
                    style={{ background: theme.primary + '30', border: `1px solid ${theme.primary}50` }}>
                    {isPaused ? '▶' : '⏸'}
                  </button>
                  <button onClick={() => currentScene < totalScenes - 1 && goToScene(currentScene + 1)}
                    disabled={currentScene >= totalScenes - 1}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all disabled:opacity-20">
                    ▶
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float3D {
          0%, 100% { transform: translateY(0) rotateX(0deg) rotateY(0deg); }
          25% { transform: translateY(-20px) rotateX(15deg) rotateY(90deg); }
          50% { transform: translateY(0) rotateX(0deg) rotateY(180deg); }
          75% { transform: translateY(20px) rotateX(-15deg) rotateY(270deg); }
        }
        @keyframes spin3D {
          from { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          to { transform: rotateX(360deg) rotateY(360deg) rotateZ(0deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sceneEnter {
          from { opacity: 0; transform: translateZ(-200px) rotateY(-10deg) scale(0.8); }
          to { opacity: 1; transform: translateZ(0) rotateY(0) scale(1); }
        }
        @keyframes audioBar {
          from { height: 6px; }
          to { height: 28px; }
        }
      `}</style>
    </div>
  );
};


const EklavyaPage: React.FC<{ user: User; submissions: Submission[]; students: User[]; isOfflineMode: boolean; }> = ({ user, submissions, students, isOfflineMode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<EklavyaAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true); setError(null);
    try {
      const classSubmissions = submissions.filter(s => s.classCode === user.classCode);
      const classStudents = students.filter(s => s.classCode === user.classCode && s.role === 'student');

      // Compute per-student average scores (email → avg %)
      const studentScores: Record<string, number> = {};
      classStudents.forEach(st => {
        const subs = classSubmissions.filter(s => s.studentEmail === st.email);
        if (subs.length > 0) {
          const avg = subs.reduce((a, s) => a + (s.totalQuestions > 0 ? (s.score / s.totalQuestions) * 100 : 0), 0) / subs.length;
          studentScores[st.email] = Math.round(avg);
        }
      });

      // Compute per-topic average scores (topic → avg %)
      const topicMap: Record<string, number[]> = {};
      classSubmissions.forEach(s => {
        if (s.topic) {
          if (!topicMap[s.topic]) topicMap[s.topic] = [];
          if (s.totalQuestions > 0) topicMap[s.topic].push((s.score / s.totalQuestions) * 100);
        }
      });
      const topicScores: Record<string, number> = {};
      Object.entries(topicMap).forEach(([topic, scores]) => {
        topicScores[topic] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      });

      const data = {
        submissions: classSubmissions,
        students: classStudents,
        student_scores: studentScores,
        topic_scores: topicScores,
        class_size: classStudents.length,
        total_quizzes: classSubmissions.length,
      };
      const result = await generateEklavyaAnalysis(data);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 flex justify-between items-center bg-gradient-to-r from-brand-dark-blue to-purple-900/10">
        <div>
            <h2 className="text-3xl font-bold mb-2">EKLAVYA: AI Class Analytics</h2>
            <p className="text-gray-400">Holistic performance analysis across all students and topics.</p>
        </div>
        <button onClick={handleAnalyze} disabled={isLoading || submissions.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg flex items-center gap-3 disabled:opacity-50 transition-all">{isLoading ? 'Analyzing...' : <><SparklesIcon /> Run Global Analysis</>}</button>
      </div>

      {!analysis && !isLoading && <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-20 text-center"><p className="text-gray-500 italic">Click the button above to start AI deep-dive analysis of your classroom data.</p></div>}
      
      {isLoading && <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-20 text-center space-y-6">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-purple-400 font-bold tracking-widest uppercase text-sm">Eklavya AI is crunching the numbers...</p>
      </div>}

      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
             <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-6 text-brand-cyan">Class Level Analysis</h3>
                <div className="space-y-6">
                    <div>
                        <p className="text-xs uppercase text-gray-500 font-bold mb-3 tracking-widest">Class Weak Topics</p>
                        <div className="space-y-2">{analysis.classSummary.weakTopics.map((t, i) => (
                          <div key={i} className="flex justify-between items-center bg-red-900/10 p-2 rounded border border-red-900/30">
                            <span className="text-xs text-red-100">{t.topic}</span>
                            <span className="text-xs font-black text-red-500">{t.percentage}% Fail Rate</span>
                          </div>
                        ))}</div>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-gray-500 font-bold mb-3 tracking-widest">Class Strong Topics</p>
                        <div className="space-y-2">{analysis.classSummary.strongTopics.map((t, i) => (
                          <div key={i} className="flex justify-between items-center bg-green-900/10 p-2 rounded border border-green-900/30">
                            <span className="text-xs text-green-100">{t.topic}</span>
                            <span className="text-xs font-black text-green-500">{t.percentage}% Pass Rate</span>
                          </div>
                        ))}</div>
                    </div>
                </div>
             </div>
             
             <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 border-l-4 border-red-500">
                <h4 className="text-xs uppercase text-gray-500 font-bold mb-4 tracking-widest">Top 3 Weak Students</h4>
                <div className="space-y-3">
                  {analysis.top3WeakStudents.map((s, i) => (
                    <div key={i} className="p-3 bg-red-900/5 rounded-lg border border-red-900/20">
                      <p className="font-bold text-red-400 text-sm">{s.name}</p>
                      <p className="text-[10px] text-gray-500 italic">{s.issue}</p>
                    </div>
                  ))}
                </div>
             </div>

             <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 border-l-4 border-purple-500">
                <h3 className="text-xl font-bold mb-4">Teacher Alert</h3>
                <ul className="space-y-3">{analysis.classSummary.teacherAlerts.map((a, i) => <li key={i} className="text-sm text-purple-200 bg-purple-900/10 p-3 rounded-lg border border-purple-900/30 flex items-start gap-2"><SparklesIcon /> {a}</li>)}</ul>
             </div>

             <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Efficiency Trend</p>
                <div className="flex items-center gap-4">
                    <div className={`text-3xl font-black ${analysis.trendAnalysis.toLowerCase().includes('improve') ? 'text-green-400' : 'text-yellow-400'} capitalize`}>{analysis.trendAnalysis}</div>
                </div>
             </div>
          </div>
          <div className="lg:col-span-8 bg-brand-dark-blue border border-brand-border rounded-lg p-8">
             <h3 className="text-2xl font-bold mb-6">Student Deep-Dive</h3>
             <div className="space-y-4 max-h-[100vh] overflow-y-auto pr-2">
                {analysis.studentInsights.map((insight, i) => (
                    <div key={i} className="bg-brand-dark p-6 rounded-xl border border-brand-border group hover:border-purple-500/50 transition-all">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-bold">{insight.name}</h4>
                            <span className={`text-xl font-black ${insight.avgScore > 75 ? 'text-green-400' : insight.avgScore < 40 ? 'text-red-400' : 'text-yellow-400'}`}>{insight.avgScore}%</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Struggles With</p><p className="text-xs text-red-400">{insight.weakTopics.join(', ') || 'None'}</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Excels In</p><p className="text-xs text-green-400">{insight.strongTopics.join(', ') || 'None'}</p></div>
                        </div>
                        <div className="bg-brand-dark-blue p-4 rounded-lg text-sm text-gray-300 italic">
                            <span className="text-brand-cyan font-bold not-italic font-mono">AI Suggestion:</span> {insight.suggestions}
                        </div>
                    </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
const AssignmentsPage: React.FC<{
  assignments: Assignment[];
  addAssignment: (a: Omit<Assignment, 'id'>) => Promise<void>;
  updateAssignment: (id: string, a: Partial<Assignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  assignmentSubmissions: AssignmentSubmission[];
  updateAssignmentSubmission: (id: string, s: Partial<AssignmentSubmission>) => Promise<void>;
  user: User;
  setAssignmentStatus: (id: string, status: 'published' | 'draft') => Promise<void>;
}> = ({ assignments, addAssignment, deleteAssignment, assignmentSubmissions, user, setAssignmentStatus }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !dueDate) return;
    await addAssignment({
      title,
      description,
      dueDate,
      classCode: user.classCode || '',
      status: 'draft',
      createdAt: new Date().toISOString()
    });
    setTitle('');
    setDescription('');
    setDueDate('');
  };

  return (
    <div className="space-y-8">
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Create New Assignment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" rows={4} /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
          <button type="submit" className="w-full bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500">Create Assignment</button>
        </form>
      </div>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Current Assignments</h2>
        <div className="space-y-4">
          {assignments.map(a => (
            <div key={a.id} className="bg-brand-dark p-4 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{a.title}</h3>
                <p className="text-sm text-gray-400">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setAssignmentStatus(a.id, a.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${a.status === 'published' ? 'border-yellow-700 text-yellow-400' : 'border-green-700 text-green-400'}`}>{a.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                <button onClick={() => deleteAssignment(a.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherPortal;