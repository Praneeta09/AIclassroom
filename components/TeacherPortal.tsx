import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Quiz, User, Submission, SharedContent, SharedContentType, LectureSlide, CaseStudy, GeneratedLecture, FAQ, AttendanceSession, VideoLecture, ExamPaper, CurriculumPlan, CurriculumTopic, CurriculumStatus, Assignment, AssignmentSubmission, AnimationScript, EklavyaAnalysis, SavedResourceHub, ResourceHubData } from '../types';
import { generateQuiz, generateLectureSlides, generateCaseStudy, generateQuizFromContent, generateNotesFromTranscript, generateExamPaperAI, generateResources, generateCurriculumIntelligenceAI, generateAnimationScript, generateEklavyaAnalysis } from '../services/aiService';
import { SparklesIcon, LogoutIcon, BookOpenIcon, HomeIcon, QuizIcon, VisualizationIcon, EditIcon, TrashIcon, ShareIcon, UploadIcon, FileTextIcon, ImageIcon, AIGeneratorIcon, UserCheckIcon, UsersIcon, PlayIcon } from './Icons';
import Sidebar from './Sidebar';
import SmartSearch from './SmartSearch';
import TTSPlayer from './TTSPlayer';

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
      <Sidebar activePage={activePage} onNavigate={setActivePage} title={<>Teacher<br />Dashboard</>} navItems={navItems} isOfflineMode={props.isOfflineMode} toggleOfflineMode={props.toggleOfflineMode} />
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
                {activePage === 'home' && <HomePage user={user} quizzes={quizzes} allUsers={props.allUsers} sharedContent={sharedContent} activeSession={activeSession} onNavigate={setActivePage} />}
                {activePage === 'shared-content' && <SharedContentPage {...props} setSharedContentStatus={props.setSharedContentStatus} />}
                {activePage === 'content-generator' && <ContentGeneratorPage 
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
                />}
                {activePage === 'video-lectures' && <VideoLecturesPage user={user} videoLectures={props.videoLectures} addVideoLecture={props.addVideoLecture} deleteVideoLecture={props.deleteVideoLecture} generatedLectures={props.generatedLectures} addGeneratedLecture={props.addGeneratedLecture} addQuiz={props.addQuiz} setVideoLectureStatus={props.setVideoLectureStatus} isOfflineMode={isOfflineMode} />}
                {activePage === 'quiz-generation' && <QuizGenerationPage user={user} quizzes={props.quizzes} addQuiz={props.addQuiz} updateQuiz={props.updateQuiz} deleteQuiz={props.deleteQuiz} generatedLectures={props.generatedLectures} setQuizStatus={props.setQuizStatus} />}
                {activePage === 'question-paper' && <QuestionPaperPage user={user} examPapers={props.examPapers} addExamPaper={props.addExamPaper} updateExamPaper={props.updateExamPaper} deleteExamPaper={props.deleteExamPaper} setExamPaperStatus={props.setExamPaperStatus} />}
                {activePage === 'resource-hub' && <SmartResourceHubPage user={user} resourceHubs={props.resourceHubs} addResourceHub={props.addResourceHub} updateResourceHub={props.updateResourceHub} deleteResourceHub={props.deleteResourceHub} setResourceHubStatus={props.setResourceHubStatus} />}
                {activePage === 'curriculum' && <CurriculumPage user={user} curriculumPlans={props.curriculumPlans} addCurriculumPlan={props.addCurriculumPlan} deleteCurriculumPlan={props.deleteCurriculumPlan} setCurriculumPlanStatus={props.setCurriculumPlanStatus} />}
                {activePage === 'assignments' && <AssignmentsPage assignments={props.assignments} addAssignment={props.addAssignment} updateAssignment={props.updateAssignment} deleteAssignment={props.deleteAssignment} assignmentSubmissions={props.assignmentSubmissions} updateAssignmentSubmission={props.updateAssignmentSubmission} user={props.user} setAssignmentStatus={props.setAssignmentStatus} />}
                {activePage === 'animation-generator' && <AnimationGeneratorPage user={user} animationScripts={props.animationScripts} addAnimationScript={props.addAnimationScript} updateAnimationScript={props.updateAnimationScript} deleteAnimationScript={props.deleteAnimationScript} setAnimationScriptStatus={props.setAnimationScriptStatus} isOfflineMode={isOfflineMode} />}
                {activePage === 'eklavya' && <EklavyaPage user={user} submissions={props.studentSubmissions} students={props.allUsers} isOfflineMode={isOfflineMode} />}
                {activePage === 'visualization' && <VisualizationPage quizzes={props.quizzes} submissions={props.studentSubmissions} />}
                {activePage === 'attendance' && <AttendancePage activeSession={activeSession} sessions={attendanceSessions as AttendancePageSession[]} onStart={() => Object(props.startAttendance)()} onStop={() => activeSession && props.stopAttendance(activeSession.id)} assistanceDisabled={props.assistanceDisabled} onToggleAssistance={props.onToggleAssistance} />}
                {activePage === 'students' && <StudentsPage allUsers={props.allUsers} user={user} />}
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
                <p className="text-sm font-semibold mb-2 flex items-center gap-2"><SparklesIcon /> Automatic Face Recognition Active</p>
                <p className="text-xs text-gray-400">Students joining your classroom now will be automatically verified using facial blink detection. No OTP is required.</p>
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
  const [contentType, setContentType] = useState<'slides' | 'case-study'>('slides');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [generatedContent, setGeneratedContent] = useState<({ slides: LectureSlide[] } | Omit<CaseStudy, 'id'>) | null>(null);
  const [editingItem, setEditingItem] = useState<GeneratedLecture | CaseStudy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      } else {
        const content = await generateCaseStudy(outline, selectedLanguage);
        const newCaseStudy: Omit<CaseStudy, 'id'> = { ...content, classCode: user.classCode };
        setGeneratedContent(newCaseStudy);
        await addGeneratedCaseStudy(newCaseStudy);
        setSuccessMessage('Case study generated and saved as draft!');
      }
    } catch (err: any) { setError(err.message || 'An unknown error occurred.'); }
    finally { setIsLoading(false); }
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
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Generate Course Content</h2>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Topic Outline</label><textarea value={outline} onChange={e => setOutline(e.target.value)} placeholder={"e.g., Introduction to Photosynthesis\n- What is it?\n- The chemical equation"} rows={8} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none resize-y" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
                <div className="flex bg-brand-dark rounded-lg p-1">
                  <button type="button" onClick={() => setContentType('slides')} className={`w-1/2 py-2 rounded-md transition-colors ${contentType === 'slides' ? 'bg-brand-cyan text-white' : 'text-gray-400 hover:bg-brand-border'}`}>Lecture Slides</button>
                  <button type="button" onClick={() => setContentType('case-study')} className={`w-1/2 py-2 rounded-md transition-colors ${contentType === 'case-study' ? 'bg-brand-cyan text-white' : 'text-gray-400 hover:bg-brand-border'}`}>Case Study</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none">
                  <option>English</option>
                  <option>Marathi</option>
                  <option>Hindi</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 flex items-center justify-center gap-2">{isLoading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Generating...</> : <><SparklesIcon /> Generate Content</>}</button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>}
          </form>
        </div>
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{editingItem ? 'Edit Content' : 'Generated Content Preview'}</h2>
            {editingItem && (
               <div className="flex gap-2">
                 <button onClick={() => setEditingItem(null)} className="text-xs bg-brand-dark border border-brand-border px-3 py-1 rounded hover:bg-brand-border transition-colors">Cancel</button>
                 <button onClick={handleSaveUpdate} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors font-bold">Save Changes</button>
               </div>
            )}
          </div>
          <div className="max-h-[70vh] overflow-y-auto pr-4">
            {!generatedContent && !editingItem && !isLoading && <div className="flex items-center justify-center h-full text-center text-gray-500"><p>Generated content will appear here.</p></div>}
            {isLoading && <div className="flex items-center justify-center h-full text-center text-gray-400"><p>{isOfflineMode ? 'Processing locally...' : 'AI is thinking...'}</p></div>}
            
            {editingItem && 'slides' in editingItem && (
               <div className="space-y-6">
                 {editingItem.slides.map((slide, sIdx) => (
                    <div key={sIdx} className="bg-brand-dark p-6 rounded-lg border border-brand-border relative group shadow-xl">
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          value={slide.title} 
                          onChange={(e) => handleUpdateSlide(sIdx, 'title', e.target.value)}
                          className="w-full bg-brand-dark-blue border border-brand-border rounded p-2 text-xl font-bold text-brand-cyan focus:border-brand-cyan"
                        />
                        <textarea 
                          value={slide.points.join('\n')} 
                          onChange={(e) => handleUpdateSlide(sIdx, 'points', e.target.value.split('\n'))}
                          className="w-full bg-brand-dark-blue border border-brand-border rounded p-2 text-gray-200 text-sm focus:border-brand-cyan"
                          rows={5}
                        />
                        <input 
                          type="text" 
                          value={slide.visual || ''} 
                          onChange={(e) => handleUpdateSlide(sIdx, 'visual', e.target.value)}
                          placeholder="Visual description..."
                          className="w-full bg-brand-dark-blue border border-brand-border rounded p-2 text-gray-400 text-xs italic"
                        />
                      </div>
                    </div>
                 ))}
                 <button onClick={handleAddSlide} className="w-full py-4 border-2 border-dashed border-brand-border rounded-xl text-gray-500 hover:border-brand-cyan hover:text-brand-cyan transition-all flex items-center justify-center gap-2 font-bold">+ Add Teacher Slide</button>
               </div>
            )}

            {!editingItem && generatedContent && 'slides' in generatedContent && (
              <div className="space-y-6">
                {(generatedContent as any).slides.map((slide: any, index: number) => (
                  <div key={index} className="bg-brand-dark p-6 rounded-lg border border-brand-border relative group shadow-xl hover:border-brand-cyan transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-bold text-brand-cyan">Slide {index + 1}: {slide.title}</h3>
                      {slide.visualSuggestion && <span className="text-[10px] bg-brand-cyan/20 text-brand-cyan px-2 py-1 rounded-md font-bold uppercase tracking-widest">Visual: {slide.visualSuggestion}</span>}
                    </div>
                    <ul className="list-disc list-inside space-y-3 text-gray-200 pl-2 mb-6 text-lg">
                      {slide.points.map((point: string, pIndex: number) => (
                        <li key={pIndex}>{point}</li>
                      ))}
                    </ul>
                    {slide.visual && (
                      <div className="bg-brand-dark-blue/50 p-4 rounded-xl border border-brand-cyan/30 mb-4 bg-gradient-to-br from-brand-cyan/10 to-transparent">
                        <p className="text-xs text-brand-cyan font-black flex items-center gap-2 uppercase tracking-tighter mb-2">
                          <ImageIcon /> Modern Visual Illustration Keyword
                        </p>
                        <p className="text-lg font-bold text-white italic">"{slide.visual}"</p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-brand-border/50">
                      <TTSPlayer text={`${slide.title}. ${slide.points.join('. ')}`} language={selectedLanguage as any} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {generatedContent && 'introduction' in generatedContent && (<div className="space-y-4 text-gray-300 prose prose-invert max-w-none relative group"><h3 className="text-2xl font-bold text-brand-cyan">{(generatedContent as any).title}</h3><div className="pt-2 mb-4"><TTSPlayer text={`Case study: ${(generatedContent as any).title}. Introduction: ${(generatedContent as any).introduction}. Problem: ${(generatedContent as any).problem}. Solution: ${(generatedContent as any).solution}.`} language={selectedLanguage as any} /></div><h4>Introduction</h4><p>{(generatedContent as any).introduction}</p><h4>Problem</h4><p>{(generatedContent as any).problem}</p><h4>Solution</h4><p>{(generatedContent as any).solution}</p><h4>Conclusion</h4><p>{(generatedContent as any).conclusion}</p></div>)}
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-white">Create Educational Animation</h2>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Topic for Animation</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., How Planets Orbit the Sun" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan outline-none" /></div>
            <button type="submit" disabled={isLoading} className="w-full bg-brand-cyan text-white font-bold py-3 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 transition-all">{isLoading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generating Script...</> : <><PlayIcon /> Generate 45s Animation Script</>}</button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {successMessage && <p className="text-green-500 text-sm mt-2 font-medium">{successMessage}</p>}
          </form>

          <div className="mt-12">
            <h3 className="text-xl font-bold mb-4 text-brand-cyan">Saved Animations ({animationScripts.length})</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {animationScripts.length === 0 ? <p className="text-gray-500 italic">No animations saved yet.</p> : animationScripts.map(s => (
                <div key={s.id} className="bg-brand-dark p-4 rounded-lg border border-brand-border flex justify-between items-center group hover:border-brand-cyan/30 transition-all shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-100">{s.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${s.status === 'published' ? 'bg-green-900/40 text-green-300 border border-green-800/50' : 'bg-yellow-900/40 text-yellow-300 border border-yellow-800/50'}`}>{s.status || 'draft'}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{s.scenes.length} Scenes · {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPlayingVideo(s)} className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-brand-cyan bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan hover:text-white transition-all">Play</button>
                    <button onClick={() => { setEditingScript(s); setPreviewScript(null); }} className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-brand-border text-gray-400 hover:border-brand-cyan hover:text-brand-cyan transition-all">Edit</button>
                    <button onClick={() => deleteAnimationScript(s.id)} className="text-red-500/60 hover:text-red-400 p-2 transition-colors"><TrashIcon /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">{editingScript ? 'Refine Animation' : 'Script Visualization'}</h2>
            <div className="flex gap-2">
              {activeScript && (
                <button onClick={() => setPlayingVideo(activeScript)} className="text-[10px] font-bold uppercase tracking-widest bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/50 px-3 py-1.5 rounded-lg hover:bg-brand-cyan hover:text-white transition-all flex items-center gap-2"><PlayIcon /> Watch Preview</button>
              )}
              {editingScript && (
                <>
                  <button onClick={() => setEditingScript(null)} className="text-[10px] font-bold uppercase tracking-widest border border-brand-border text-gray-400 px-3 py-1.5 rounded-lg hover:bg-brand-border transition-colors">Discard</button>
                  <button onClick={handleSaveUpdate} className="text-[10px] font-bold uppercase tracking-widest bg-brand-cyan text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity shadow-glow">Update Script</button>
                </>
              )}
              {!editingScript && previewScript && (
                <button onClick={handleSavePreview} className="text-[10px] font-bold uppercase tracking-widest bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-lg">Save to Portal</button>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center text-gray-500">
               <div className="w-16 h-16 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mb-6"></div>
               <p className="text-lg font-medium text-gray-400">AI is directng your educational animation...</p>
               <p className="text-xs text-gray-600 mt-2 italic px-8">Calculating scene dynamics and optimal narration for 45s runtime</p>
            </div>
          ) : activeScript ? (
             <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-3 custom-scrollbar">
                <div className="bg-brand-dark/40 p-4 rounded-xl border border-brand-border/30">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">Animation Title</span>
                  <input 
                    type="text" 
                    value={activeScript.title} 
                    onChange={(e) => {
                      if (editingScript) setEditingScript({...editingScript, title: e.target.value});
                      else if (previewScript) setPreviewScript({...previewScript, title: e.target.value});
                    }}
                    className="text-2xl font-black text-brand-cyan bg-transparent border-b border-transparent hover:border-brand-border/30 focus:border-brand-cyan/50 w-full outline-none py-1 transition-all" 
                  />
                </div>
                
                {activeScript.scenes.map((scene, i) => (
                  <div key={i} className="bg-brand-dark p-6 rounded-2xl border border-brand-border/80 hover:border-brand-cyan/60 transition-all group shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 -mr-12 -mt-12 rounded-full group-hover:bg-brand-cyan/10 transition-colors"></div>
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-cyan/80 bg-brand-cyan/10 px-3 py-1 rounded-full border border-brand-cyan/20">Scene {i + 1}</p>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Dur: ~{Math.round(45/activeScript.scenes.length)}s</span>
                      </div>
                      <TTSPlayer text={scene.voiceScript} language="English" />
                    </div>
                    <div className="space-y-5">
                      <div className="relative group/field">
                        <span className="font-black text-gray-500 uppercase text-[9px] tracking-widest block mb-2 opacity-70 group-hover/field:text-brand-cyan transition-colors">Visual Direction & Action</span>
                        <textarea 
                          value={scene.visual} 
                          onChange={(e) => handleUpdateField('visual', i, e.target.value)}
                          className="w-full bg-brand-dark-blue/50 border border-brand-border/50 rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-cyan/40 transition-all resize-none shadow-inner"
                          rows={2}
                          placeholder="Describe the onscreen activity..."
                        />
                      </div>
                      <div className="relative group/field">
                        <span className="font-black text-gray-500 uppercase text-[9px] tracking-widest block mb-2 opacity-70 group-hover/field:text-brand-cyan transition-colors">Narrator Script (Teacher Voice)</span>
                        <textarea 
                          value={scene.voiceScript} 
                          onChange={(e) => handleUpdateField('voiceScript', i, e.target.value)}
                          className="w-full bg-brand-dark-blue/80 border border-brand-border/50 rounded-xl p-4 text-sm text-brand-cyan italic font-semibold focus:outline-none focus:ring-1 focus:ring-brand-cyan/40 transition-all resize-none shadow-inner"
                          rows={3}
                          placeholder="What should the voiceover say?"
                        />
                      </div>
                    </div>
                   </div>
                ))}
                
                {activeScript.summary && (
                  <div className="bg-brand-dark-blue/40 p-6 rounded-2xl border border-dashed border-brand-border hover:border-brand-cyan/40 transition-colors">
                    <div className="flex items-center gap-2 mb-4 text-brand-cyan/80">
                      <SparklesIcon className="w-4 h-4" />
                      <span className="font-black uppercase text-[10px] tracking-widest">Scientific Content Check</span>
                    </div>
                    <textarea 
                      value={activeScript.summary} 
                      onChange={(e) => {
                        if (editingScript) setEditingScript({...editingScript, summary: e.target.value});
                        else if (previewScript) setPreviewScript({...previewScript, summary: e.target.value});
                      }}
                      className="w-full bg-transparent border-none text-sm text-gray-400 italic focus:outline-none focus:ring-0 resize-none leading-relaxed"
                      rows={5}
                      placeholder="Add scientific context or wrap-up points..."
                    />
                  </div>
                )}
                
                <div className="h-4"></div>
             </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center text-gray-600 gap-6 mt-4 opacity-50 px-12">
                <div className="w-24 h-24 bg-brand-dark rounded-full flex items-center justify-center border border-brand-border shadow-2xl">
                    <PlayIcon className="w-10 h-10 text-brand-cyan" />
                </div>
                <div>
                    <p className="text-xl font-bold text-gray-300">No Script Active</p>
                    <p className="text-sm text-gray-500 mt-2">Generate a new animation script or select a saved one to refine the visuals and narration.</p>
                </div>
             </div>
          )}
        </div>
      </div>
      {playingVideo && (
        <AnimationVideoSimulator 
          script={playingVideo} 
          onClose={() => setPlayingVideo(null)} 
        />
      )}
    </div>
  );
};

const AnimationVideoSimulator: React.FC<{ script: any, onClose: () => void }> = ({ script, onClose }) => {
  const [currentScene, setCurrentScene] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isScientific = script.topic.toLowerCase().includes('circulatory') || script.topic.toLowerCase().includes('heart') || script.topic.toLowerCase().includes('blood') || script.topic.toLowerCase().includes('cell');

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (currentScene < script.scenes.length - 1) {
        setTimeout(() => setCurrentScene(prev => prev + 1), 1500);
      } else {
        setTimeout(() => {
            alert("Educational Animation Complete!");
            onClose();
        }, 1500);
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    speak(script.scenes[currentScene].voiceScript);
    return () => window.speechSynthesis.cancel();
  }, [currentScene]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 md:p-12 overflow-hidden transition-all duration-1000">
      {/* Background Cinematic Particles */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className={`absolute rounded-full blur-xl animate-pulse ${isScientific ? 'bg-red-600/30' : 'bg-brand-cyan/20'}`}
            style={{
              width: Math.random() * 300 + 100 + 'px',
              height: Math.random() * 300 + 100 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animationDuration: Math.random() * 5 + 3 + 's',
              animationDelay: Math.random() * 5 + 's'
            }}
          />
        ))}
      </div>

      <button onClick={onClose} className="absolute top-8 right-8 text-white hover:text-brand-cyan flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full border border-white/10 transition-all z-[120] group shadow-2xl">
         Exit Laboratory <TrashIcon />
      </button>

      <div className="w-full max-w-7xl aspect-video bg-[#010204] rounded-[3rem] border-[12px] border-white/5 overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] relative flex flex-col">
        {/* Dynamic Scientific Visuals */}
        {isScientific && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
             {[...Array(15)].map((_, i) => (
                <div key={i} className="absolute w-4 h-4 bg-red-500 rounded-full blur-[2px] animate-float-scientific" style={{
                    left: Math.random() * 100 + '%',
                    top: Math.random() * 100 + '%',
                    animationDuration: Math.random() * 10 + 10 + 's',
                    animationDelay: Math.random() * 10 + 's',
                    opacity: Math.random()
                }}></div>
             ))}
          </div>
        )}

        <div className="p-12 pb-0 z-10 flex justify-between items-start">
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-brand-cyan rounded-full animate-pulse"></div>
                 <span className="text-brand-cyan font-black uppercase text-[10px] tracking-[0.4em]">Premium Visualization Mode</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-2xl">{script.title}</h2>
           </div>
           <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 text-center min-w-[120px]">
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">Chapter</p>
              <p className="text-2xl font-black text-white">{currentScene + 1} <span className="text-white/30 text-sm font-bold">/ {script.scenes.length}</span></p>
           </div>
        </div>

        {/* Cinematic Visual Stage */}
        <div className="flex-grow flex items-center justify-center relative px-20 text-center perspective-[2500px]">
          <div 
             key={currentScene}
             className="absolute inset-0 flex flex-col items-center justify-center p-20 animate-cinematic-zoom transform-gpu"
             style={{ transformStyle: 'preserve-3d' }}
          >
             <div className="relative">
                {/* Holographic Ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] aspect-square border-2 border-brand-cyan/20 rounded-full animate-spin-slow pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] aspect-square border border-dashed border-white/10 rounded-full animate-spin-slow-reverse pointer-events-none"></div>
                
                <div className="relative z-10 p-16 rounded-[4rem] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 shadow-2xl backdrop-blur-xl transition-all duration-1000 group">
                   <p className="text-white text-5xl md:text-7xl font-black leading-[1.05] drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] [text-wrap:balance] transition-all group-hover:scale-[1.02]">
                     {script.scenes[currentScene].visual}
                   </p>
                </div>
             </div>
             
             {/* Stage Floor Light */}
             <div className="absolute bottom-10 w-[60%] h-20 bg-brand-cyan/20 blur-[100px] rounded-full translate-z-[-200px]"></div>
          </div>
        </div>

        {/* Narrative Interface */}
        <div className="mt-auto p-12 bg-gradient-to-t from-black via-black/95 to-transparent border-t border-white/5 relative z-20">
           <div className={`transition-all duration-1000 ease-in-out transform ${isSpeaking ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
              <div className="max-w-5xl mx-auto flex items-start gap-10">
                 <div className="flex gap-1.5 pt-4">
                    {[...Array(4)].map((_, i) => (
                       <div key={i} className={`w-1 bg-brand-cyan rounded-full animate-audio-bar`} style={{ animationDelay: i * 0.1 + 's', height: Math.random() * 20 + 20 + 'px' }}></div>
                    ))}
                 </div>
                 <p className="text-3xl md:text-4xl text-white/90 font-medium leading-relaxed drop-shadow-xl tracking-tight [text-wrap:balance]">
                   "{script.scenes[currentScene].voiceScript}"
                 </p>
              </div>
           </div>
           
           <div className="mt-16 max-w-6xl mx-auto flex items-center justify-between gap-8">
              <div className="flex-1 space-y-3">
                 <div className="flex justify-between text-[9px] font-black tracking-[0.3em] text-white/40 uppercase">
                    <span>Rendering Scene Sequence</span>
                    <span className="text-brand-cyan">{Math.round(((currentScene + 1) / script.scenes.length) * 100)}%</span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-brand-cyan shadow-[0_0_20px_rgba(0,204,255,0.7)] transition-all duration-1500 ease-out"
                     style={{ width: `${((currentScene + 1) / script.scenes.length) * 100}%` }}
                   ></div>
                 </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
                    </span>
                    <span className="text-white/40 font-bold text-[10px] uppercase tracking-widest">Master Studio Live</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="mt-8 opacity-30">
         <p className="text-white font-black uppercase text-[9px] tracking-[0.5em]">Classroom AI 4.0 // Cinematic Render Engine</p>
      </div>
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
      const data = {
        submissions: submissions.filter(s => s.classCode === user.classCode),
        students: students.filter(s => s.classCode === user.classCode && s.role === 'student')
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