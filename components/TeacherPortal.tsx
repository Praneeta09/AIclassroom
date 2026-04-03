import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Quiz, User, Submission, SharedContent, SharedContentType, LectureSlide, CaseStudy, GeneratedLecture, FAQ, AttendanceSession, VideoLecture, ExamPaper, LessonPlan, CurriculumPlan, CurriculumTopic, CurriculumStatus, Assignment, AssignmentSubmission } from '../types';
import { generateQuiz, generateLectureSlides, generateCaseStudy, generateQuizFromContent, generateNotesFromTranscript, generateExamPaperAI, generateHybridLessonPlanAI, generateCurriculumIntelligenceAI } from '../services/aiService';
import { SparklesIcon, LogoutIcon, BookOpenIcon, HomeIcon, QuizIcon, VisualizationIcon, EditIcon, TrashIcon, ShareIcon, UploadIcon, FileTextIcon, ImageIcon, AIGeneratorIcon, UserCheckIcon, UsersIcon } from './Icons';
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
  lessonPlans: LessonPlan[];
  addLessonPlan: (lp: Omit<LessonPlan, 'id'>) => Promise<void>;
  deleteLessonPlan: (id: string) => Promise<void>;
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
  setLessonPlanStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setAssignmentStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setCurriculumPlanStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setCurriculumItemStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setCaseStudyStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setSharedContentStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  deleteGeneratedLecture: (id: string) => Promise<void>;
  deleteCaseStudy: (id: string) => Promise<void>;
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
  const { onLogout, user, quizzes, studentSubmissions, sharedContent, generatedLectures, generatedCaseStudies, faqs, attendanceSessions } = props;

  const navItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon /> },
    { id: 'shared-content', label: 'Shared Content', icon: <ShareIcon /> },
    { id: 'content-generator', label: 'AI Content Generator', icon: <AIGeneratorIcon /> },
    { id: 'video-lectures', label: 'Video Lectures', icon: <FileTextIcon /> },
    { id: 'quiz-generation', label: 'Quiz Generation', icon: <QuizIcon /> },
    { id: 'question-paper', label: 'Question Paper', icon: <BookOpenIcon /> },
    { id: 'hybrid-classroom', label: 'Hybrid Classroom', icon: <UsersIcon /> },
    { id: 'curriculum', label: 'Curriculum Intel', icon: <SparklesIcon /> },
    { id: 'assignments', label: 'Assignments', icon: <FileTextIcon /> },
    { id: 'attendance', label: 'Attendance', icon: <UserCheckIcon /> },
    { id: 'students', label: 'Students', icon: <UsersIcon /> },
    { id: 'visualization', label: 'Visualization', icon: <VisualizationIcon /> },
  ];

  const knowledgeBase = { quizzes, lectures: generatedLectures, caseStudies: generatedCaseStudies, sharedContent, faqs };
  const activeSession = attendanceSessions.find(s => s.isActive) as AttendancePageSession | undefined;
  const isTeacher = user.role === 'teacher';

  return (
    <div className="flex">
      <Sidebar activePage={activePage} onNavigate={setActivePage} title={<>Teacher<br />Dashboard</>} navItems={navItems} />
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
                />}
                {activePage === 'video-lectures' && <VideoLecturesPage user={user} videoLectures={props.videoLectures} addVideoLecture={props.addVideoLecture} deleteVideoLecture={props.deleteVideoLecture} generatedLectures={props.generatedLectures} addGeneratedLecture={props.addGeneratedLecture} addQuiz={props.addQuiz} setVideoLectureStatus={props.setVideoLectureStatus} />}
                {activePage === 'quiz-generation' && <QuizGenerationPage user={user} quizzes={props.quizzes} addQuiz={props.addQuiz} updateQuiz={props.updateQuiz} deleteQuiz={props.deleteQuiz} generatedLectures={props.generatedLectures} setQuizStatus={props.setQuizStatus} />}
                {activePage === 'question-paper' && <QuestionPaperPage user={user} examPapers={props.examPapers} addExamPaper={props.addExamPaper} updateExamPaper={props.updateExamPaper} deleteExamPaper={props.deleteExamPaper} setExamPaperStatus={props.setExamPaperStatus} />}
                {activePage === 'hybrid-classroom' && <HybridClassroomPage user={user} lessonPlans={props.lessonPlans} addLessonPlan={props.addLessonPlan} deleteLessonPlan={props.deleteLessonPlan} setLessonPlanStatus={props.setLessonPlanStatus} />}
                {activePage === 'curriculum' && <CurriculumPage user={user} curriculumPlans={props.curriculumPlans} addCurriculumPlan={props.addCurriculumPlan} deleteCurriculumPlan={props.deleteCurriculumPlan} setCurriculumPlanStatus={props.setCurriculumPlanStatus} />}
                {activePage === 'assignments' && <AssignmentsPage assignments={props.assignments} addAssignment={props.addAssignment} updateAssignment={props.updateAssignment} deleteAssignment={props.deleteAssignment} assignmentSubmissions={props.assignmentSubmissions} updateAssignmentSubmission={props.updateAssignmentSubmission} user={props.user} setAssignmentStatus={props.setAssignmentStatus} />}
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
  generatedLectures: GeneratedLecture[];
  generatedCaseStudies: CaseStudy[];
  setGeneratedLectureStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  setCaseStudyStatus: (id: string, status: CurriculumStatus) => Promise<void>;
  deleteGeneratedLecture: (id: string) => Promise<void>;
  deleteCaseStudy: (id: string) => Promise<void>;
}> = ({ user, addGeneratedLecture, addGeneratedCaseStudy, generatedLectures, generatedCaseStudies, setGeneratedLectureStatus, setCaseStudyStatus, deleteGeneratedLecture, deleteCaseStudy }) => {
  const [outline, setOutline] = useState('');
  const [contentType, setContentType] = useState<'slides' | 'case-study'>('slides');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [generatedContent, setGeneratedContent] = useState<({ slides: LectureSlide[] } | Omit<CaseStudy, 'id'>) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outline.trim()) { setError('Please provide a topic outline.'); return; }
    if (!user.classCode) { setError('Cannot generate content without a class.'); return; }
    setIsLoading(true); setError(null); setGeneratedContent(null); setSuccessMessage(null);
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
          <h2 className="text-2xl font-bold mb-6">Generated Content Preview</h2>
          <div className="max-h-[70vh] overflow-y-auto pr-4">
            {!generatedContent && !isLoading && <div className="flex items-center justify-center h-full text-center text-gray-500"><p>Generated content will appear here.</p></div>}
            {isLoading && <div className="flex items-center justify-center h-full text-center text-gray-400"><p>AI is thinking...</p></div>}
            {generatedContent && 'slides' in generatedContent && (<div className="space-y-6">{generatedContent.slides.map((slide, index) => (<div key={index} className="bg-brand-dark p-4 rounded-lg border border-brand-border relative group"><h3 className="text-xl font-bold text-brand-cyan mb-2">Slide {index + 1}: {slide.title}</h3><ul className="list-disc list-inside space-y-1 text-gray-300 pl-2 mb-4">{slide.points.map((point, pIndex) => (<li key={pIndex}>{point}</li>))}</ul><div className="pt-2 border-t border-brand-border"><TTSPlayer text={`${slide.title}. ${slide.points.join('. ')}`} /></div></div>))}</div>)}
            {generatedContent && 'introduction' in generatedContent && (<div className="space-y-4 text-gray-300 prose prose-invert max-w-none relative group"><h3 className="text-2xl font-bold text-brand-cyan">{(generatedContent as any).title}</h3><div className="pt-2 mb-4"><TTSPlayer text={`Case study: ${(generatedContent as any).title}. Introduction: ${(generatedContent as any).introduction}. Problem: ${(generatedContent as any).problem}. Solution: ${(generatedContent as any).solution}.`} /></div><h4>Introduction</h4><p>{(generatedContent as any).introduction}</p><h4>Problem</h4><p>{(generatedContent as any).problem}</p><h4>Solution</h4><p>{(generatedContent as any).solution}</p><h4>Conclusion</h4><p>{(generatedContent as any).conclusion}</p></div>)}
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

const VideoLecturesPage: React.FC<{ user: User; videoLectures: VideoLecture[]; addVideoLecture: (vl: VideoLectureFormPayload) => Promise<VideoLecture | null>; deleteVideoLecture: (id: string) => Promise<void>; generatedLectures: GeneratedLecture[]; addGeneratedLecture: (l: GeneratedLectureFormPayload) => Promise<void>; addQuiz: (quiz: Omit<Quiz, 'id'>) => Promise<void>; setVideoLectureStatus: (id: string, status: CurriculumStatus) => Promise<void>; }> = ({ user, videoLectures, addVideoLecture, deleteVideoLecture, addGeneratedLecture, addQuiz, setVideoLectureStatus }) => {
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
    if (lectureMode === 'video' && !fileData) {
      setFeedback({ type: 'error', message: 'Please upload a lecture file.' });
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
          <h2 className="text-2xl font-bold mb-6">Past Lectures ({sortedLectures.length})</h2>
          {sortedLectures.length === 0 ? <p className="text-gray-500">No video lectures uploaded yet.</p> : (
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

const HybridClassroomPage: React.FC<{ user: User; lessonPlans: LessonPlan[]; addLessonPlan: (lp: Omit<LessonPlan, 'id'>) => Promise<void>; deleteLessonPlan: (id: string) => Promise<void>; setLessonPlanStatus: (id: string, status: CurriculumStatus) => Promise<void>; }> = ({ user, lessonPlans, addLessonPlan, deleteLessonPlan, setLessonPlanStatus }) => {
  const [topic, setTopic] = useState('');
  const [onlineCount, setOnlineCount] = useState(15);
  const [offlineCount, setOfflineCount] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ segments: any[] } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const modeColors: Record<string, string> = { both: 'text-brand-cyan', online: 'text-blue-400', offline: 'text-yellow-400' };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true); setError(null); setPreview(null);
    try { const plan = await generateHybridLessonPlanAI(topic, onlineCount, offlineCount); setPreview(plan); }
    catch (err: any) { setError(err.message || 'Failed to generate lesson plan.'); }
    finally { setIsGenerating(false); }
  };

  const handleSave = async () => {
    if (!preview || !user.classCode) return;
    try { await addLessonPlan({ topic, onlineCount, offlineCount, totalDuration: 60, segments: preview.segments, classCode: user.classCode, createdAt: new Date().toISOString() }); setPreview(null); setTopic(''); alert('Lesson plan saved!'); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-2">Hybrid Classroom Manager</h2>
          <p className="text-gray-400 mb-6">Generate a 60-minute synchronized lesson plan for both online and offline students.</p>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Lesson Topic</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} required placeholder="e.g., Introduction to Neural Networks" className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
            <div className="flex gap-4">
              <div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Online Students</label><input type="number" min={0} value={onlineCount} onChange={e => setOnlineCount(Number(e.target.value))} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
              <div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Offline Students</label><input type="number" min={0} value={offlineCount} onChange={e => setOfflineCount(Number(e.target.value))} className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none" /></div>
            </div>
            <button type="submit" disabled={isGenerating} className="w-full bg-brand-cyan text-white font-bold py-3 rounded-lg hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isGenerating ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Generating...</> : <><SparklesIcon />Generate Lesson Plan</>}</button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
          {preview && <button onClick={handleSave} className="mt-6 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Save Lesson Plan</button>}
        </div>
        <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 overflow-y-auto max-h-[80vh]">
          <h2 className="text-2xl font-bold mb-6">60-Minute Timeline</h2>
          {!preview ? <p className="text-gray-500">Your lesson plan will appear here.</p> : (
            <div className="space-y-3">
              <div className="flex gap-4 text-xs text-gray-400 mb-4"><span className="text-brand-cyan">● Both modes</span><span className="text-blue-400">● Online focus</span><span className="text-yellow-400">● Offline focus</span></div>
              {preview.segments.map((seg: any, i: number) => (<div key={i} className="bg-brand-dark p-4 rounded-lg"><div className="flex justify-between items-start mb-2"><h4 className="font-semibold">{seg.title}</h4><span className="text-xs text-gray-400 flex-shrink-0 ml-2">{seg.startMin}–{seg.endMin} min</span></div><p className="text-sm text-gray-300 mb-2">{seg.activity}</p><div className="flex items-center justify-between"><span className={`text-xs font-semibold ${modeColors[seg.mode] || 'text-gray-400'}`}>{seg.mode === 'both' ? 'All students' : seg.mode === 'online' ? 'Online focus' : 'Offline focus'}</span><div className="flex gap-2 flex-wrap">{seg.tools?.map((tool: string, ti: number) => <span key={ti} className="text-xs bg-brand-dark-blue border border-brand-border px-2 py-0.5 rounded">{tool}</span>)}</div></div></div>))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Saved Lesson Plans ({lessonPlans.length})</h2>
        {lessonPlans.length === 0 ? <p className="text-gray-500">No lesson plans saved yet.</p> : (
          <div className="space-y-4">{lessonPlans.map(lp => (
            <div key={lp.id} className="bg-brand-dark rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{lp.topic}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${lp.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{lp.status === 'published' ? 'Published' : 'Draft'}</span>
                  </div>
                  <p className="text-sm text-gray-400">{lp.onlineCount} online · {lp.offlineCount} offline · {new Date(lp.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setLessonPlanStatus(lp.id, lp.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${lp.status === 'published' ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700 text-green-400 hover:bg-green-900/20'}`}>{lp.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                  <button onClick={() => setExpandedId(expandedId === lp.id ? null : lp.id)} className="text-brand-cyan text-sm hover:underline">{expandedId === lp.id ? 'Collapse' : 'View'}</button>
                  <button onClick={() => deleteLessonPlan(lp.id)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon /></button>
                </div>
              </div>
              {expandedId === lp.id && (<div className="mt-3 space-y-2 border-t border-brand-border pt-3">{lp.segments.map((seg: any, si: number) => (<div key={si} className="flex justify-between text-sm bg-brand-dark-blue p-2 rounded"><span>{seg.startMin}–{seg.endMin} min: {seg.title}</span><span className="text-gray-400">{seg.tools?.join(', ')}</span></div>))}</div>)}
            </div>
          ))}</div>
        )}
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
          {generatedQuiz ? (<div className="h-full flex flex-col"><h3 className="text-xl font-bold mb-4">{generatedQuiz.topic}</h3><div className="space-y-4 mb-6 flex-grow overflow-y-auto pr-2 max-h-80">{generatedQuiz.questions.map((q, i) => (<div key={i} className="bg-brand-dark p-3 rounded-md"><p className="font-semibold">{i + 1}. {q.questionText}</p><ul className="list-disc list-inside ml-4 mt-1 text-sm text-gray-400">{q.options.map((opt, j) => <li key={j} className={j === q.correctAnswerIndex ? 'text-green-400 font-medium' : ''}>{opt}</li>)}</ul></div>))}</div><button onClick={handleSaveQuiz} disabled={isSaving} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:bg-green-800 disabled:cursor-not-allowed">{isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</> : <><BookOpenIcon /> Save and Publish Quiz</>}</button></div>) : (<div className="flex items-center justify-center h-full text-center text-gray-500"><p>Generated quiz will be displayed here for review before saving.</p></div>)}
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
        ) : <p className="text-gray-500">You haven't created any quizzes yet.</p>}
      </div>
    </>
  );
};

const VisualizationPage: React.FC<{ quizzes: Quiz[], submissions: Submission[] }> = ({ quizzes, submissions }) => {
  if (quizzes.length === 0) return (<div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8 text-center"><h2 className="text-2xl font-bold mb-4">No Quizzes Found</h2><p className="text-gray-400">Create a quiz in the "Quiz Generation" tab to see student analytics here.</p></div>);
  return (
    <div className="space-y-8">
      {quizzes.map(quiz => {
        const quizSubmissions = submissions.filter(s => s.quizId === quiz.id);
        const averageScore = quizSubmissions.length > 0 ? (quizSubmissions.reduce((acc, s) => acc + s.score, 0) / quizSubmissions.length).toFixed(1) : 0;
        return (
          <div key={quiz.id} className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">{quiz.topic}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-center"><div className="bg-brand-dark p-4 rounded-lg"><p className="text-sm text-gray-400">Attempts</p><p className="text-3xl font-bold">{quizSubmissions.length}</p></div><div className="bg-brand-dark p-4 rounded-lg"><p className="text-sm text-gray-400">Average Score</p><p className="text-3xl font-bold">{averageScore} / {quiz.questions.length}</p></div></div>
            <h4 className="text-xl font-semibold mb-4">Student Results</h4>
            {quizSubmissions.length > 0 ? (<div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-brand-dark"><tr><th className="p-3">Student</th><th className="p-3">Score</th><th className="p-3">Date</th></tr></thead><tbody>{quizSubmissions.map((sub, index) => (<tr key={index} className="border-b border-brand-border"><td className="p-3">{sub.studentName}</td><td className="p-3">{sub.score} / {sub.totalQuestions}</td><td className="p-3 text-sm text-gray-400">{new Date(sub.submittedAt).toLocaleString()}</td></tr>))}</tbody></table></div>) : <p className="text-gray-500 text-center py-4">No students have taken this quiz yet.</p>}
          </div>
        );
      })}
    </div>
  );
};
const AssignmentsPage: React.FC<{ assignments: Assignment[], addAssignment: (a: Omit<Assignment, 'id'>) => Promise<void>, updateAssignment: (a: Assignment) => Promise<void>, deleteAssignment: (id: string) => Promise<void>, assignmentSubmissions: AssignmentSubmission[], updateAssignmentSubmission: (id: string, score: number, aiFeedback?: string) => Promise<void>, user: User, setAssignmentStatus: (id: string, status: CurriculumStatus) => Promise<void> }> = ({ assignments, addAssignment, updateAssignment, deleteAssignment, assignmentSubmissions, updateAssignmentSubmission, user, setAssignmentStatus }) => {
  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalPoints, setTotalPoints] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !instructions || !dueDate || !user.classCode) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      await addAssignment({
        topic, instructions, dueDate, totalPoints, classCode: user.classCode,
        createdAt: new Date().toISOString()
      });
      setFeedback({ type: 'success', message: 'Assignment created successfully!' });
      setTopic(''); setInstructions(''); setDueDate(''); setTotalPoints(10);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create assignment' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Create New Assignment</h2>
        {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} />}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Topic</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} required className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white" /></div>
          <div><label className="block text-sm font-medium mb-1">Instructions</label><textarea value={instructions} onChange={e => setInstructions(e.target.value)} required className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white" rows={3}></textarea></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white" style={{ colorScheme: 'dark' }} /></div>
            <div><label className="block text-sm font-medium mb-1">Total Points</label><input type="number" value={totalPoints} onChange={e => setTotalPoints(Number(e.target.value))} required min={1} className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white" /></div>
          </div>
          <button type="submit" disabled={isLoading} className="bg-brand-cyan text-white py-2 px-6 rounded-lg font-bold">{isLoading ? 'Creating...' : 'Create Assignment'}</button>
        </form>
      </div>

      <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Past Assignments</h2>
        {assignments.length === 0 ? <p className="text-gray-400">No assignments created yet.</p> : (
          <div className="space-y-4">
            {assignments.map(a => {
               const submissions = assignmentSubmissions.filter(s => s.assignmentId === a.id);
               return (
                  <div key={a.id} className="bg-brand-dark border border-brand-border p-4 rounded-lg flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold">{a.topic}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${a.status === 'published' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>{a.status === 'published' ? 'Published' : 'Draft'}</span>
                      </div>
                      <p className="text-sm text-gray-400">Due: {new Date(a.dueDate).toLocaleDateString()} | Points: {a.totalPoints}</p>
                      <p className="mt-2 text-sm">{a.instructions}</p>
                      {submissions.length > 0 && <div className="mt-4 border-t border-brand-border pt-4"><h4 className="font-semibold mb-2">Submissions ({submissions.length})</h4>{submissions.map(s => <div key={s.id} className="text-sm flex justify-between bg-brand-dark-blue p-3 rounded mb-2 border border-brand-border"><span>{s.studentName} ({s.studentEmail})</span> <span>{s.score !== undefined ? `${s.score}/${a.totalPoints}` : 'Not Graded'}</span></div>)}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setAssignmentStatus(a.id, a.status === 'published' ? 'draft' : 'published')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${a.status === 'published' ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20' : 'border-green-700 text-green-400 hover:bg-green-900/20'}`}>{a.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                      <button onClick={() => deleteAssignment(a.id)} className="text-red-500 hover:text-red-400 p-2 rounded-full bg-brand-dark-blue"><TrashIcon /></button>
                    </div>
                  </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherPortal;