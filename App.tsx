import React, { useState, useEffect } from 'react';
import { AccessibilitySettings, Role, User, Quiz, Submission, SharedContent, GeneratedLecture, CaseStudy, FAQ, AttendanceSession, AttendanceRecord, Classroom, VideoLecture, ExamPaper, LessonPlan, CurriculumPlan, Assignment, AssignmentSubmission, CurriculumStatus, StudentPerformance, AnimationScript, SavedResourceHub } from './types';
import * as apiService from './services/apiService';
import RoleSelection from './components/RoleSelection';
import Auth from './components/Auth';
import TeacherPortal from './components/TeacherPortal';
import StudentPortal from './components/StudentPortal';
import AccessibilityEnhancer from './components/AccessibilityEnhancer';
import JoinClass from './components/JoinClass';
import ParentJoinClass from './components/ParentJoinClass';
import ParentPortal from './components/ParentPortal';

const App: React.FC = () => {
  const faqsData: FAQ[] = [
    { question: "How do I generate a quiz?", answer: "As a teacher, navigate to the 'Quiz Generation' tab. You can either enter a topic manually or select a previously generated lecture to create a quiz from." },
    { question: "Where can I see my quiz results?", answer: "As a student, after completing a quiz, your results will be shown immediately. You can view your full history and performance analytics on the 'Analysis' page." },
    { question: "How do I share a file with students?", answer: "In the Teacher Dashboard, go to the 'Shared Content' page. You can upload files, images, or share text-based content using the form provided." },
    { question: "How do I find my class code?", answer: "As a teacher, your unique class code is displayed prominently on your dashboard's Home page. Share this with your students so they can join." },
  ];

  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>([]);
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [generatedLectures, setGeneratedLectures] = useState<GeneratedLecture[]>([]);
  const [generatedCaseStudies, setGeneratedCaseStudies] = useState<CaseStudy[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>(faqsData);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [appLoading, setAppLoading] = useState(true);

  // --- NEW STATE ---
  const [videoLectures, setVideoLectures] = useState<VideoLecture[]>([]);
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [curriculumPlans, setCurriculumPlans] = useState<CurriculumPlan[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [assistanceDisabled, setAssistanceDisabled] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [manualOffline, setManualOffline] = useState(false);

  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({ fontSize: 16, highContrast: false });

  useEffect(() => {
    const handleOnline = () => { if (!manualOffline) setIsOfflineMode(false); syncOfflineData(); };
    const handleOffline = () => { setIsOfflineMode(true); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [manualOffline]);

  const toggleOfflineMode = (val: boolean) => {
    setManualOffline(val);
    setIsOfflineMode(val);
  };

  const syncOfflineData = async () => {
    console.log('[SYNC] Automatically syncing stored data to backend server...');
    // Real sync logic would iterate over localStorage/IndexedDB
    setTimeout(() => {
      console.log('[SYNC] Offline cache cleared after successful sync.');
    }, 1000);
  };

  const fetchDataForUser = async (currentUser: User) => {
    if ((currentUser.role === 'student' || currentUser.role === 'parent') && !currentUser.classCode) {
      setAppLoading(false);
      return;
    }
    setAppLoading(true);
    try {
      const data = currentUser.role === 'parent' && currentUser.studentEmail
        ? await apiService.fetchParentDashboardData(currentUser.studentEmail, currentUser.classCode!)
        : await apiService.fetchDashboardData(currentUser);
      setAllUsers(data.allUsers);
      setClassrooms(data.classrooms);
      setQuizzes(data.quizzes);
      setStudentSubmissions(data.studentSubmissions);
      setSharedContent(data.sharedContent);
      setGeneratedLectures(data.generatedLectures);
      setGeneratedCaseStudies(data.generatedCaseStudies);
      setAttendanceSessions(data.attendanceSessions);
      setFaqs(faqsData);
      // New
      setVideoLectures(data.videoLectures);
      setExamPapers(data.examPapers);
      setLessonPlans(data.lessonPlans);
      setCurriculumPlans(data.curriculumPlans);
      setAssignments(data.assignments);
      setAssignmentSubmissions(data.assignmentSubmissions);
      setStudentPerformance(data.studentPerformance || []);
      setAssistanceDisabled(data.assistanceDisabled);
      await handleFetchAnimationScripts(currentUser);
      await handleFetchResourceHubs(currentUser);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      console.warn("Could not load classroom data. Please try logging in again.");
      handleLogout();
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    const checkUserSession = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          await fetchDataForUser(parsedUser);
        } catch (error) {
          localStorage.removeItem('user');
          setAppLoading(false);
        }
      } else {
        setAppLoading(false);
      }
    };
    checkUserSession();
  }, []);

  const handleRoleSelect = (role: Role) => setSelectedRole(role);

  const handleAuthSuccess = async (authData: { name: string, email: string, password?: string, imageUrl?: string }, isLogin: boolean) => {
    if (selectedRole) {
      const loggedInUser = isLogin
        ? await apiService.login(authData.email, authData.password!, selectedRole)
        : await apiService.signup(authData.name, authData.email, authData.password!, selectedRole, authData.imageUrl);
      setUser(loggedInUser);
      await fetchDataForUser(loggedInUser);
      setSelectedRole(null);
    }
  };

  const handleJoinClass = async (classCode: string) => {
    if (user) {
      const updatedUser = await apiService.joinClass(user.email, classCode);
      setUser(updatedUser);
      await fetchDataForUser(updatedUser);
    }
  };

  const handleJoinClassParent = async (classCode: string, studentEmail: string) => {
    if (user) {
      const updatedUser = await apiService.joinClassParent(user.email, classCode, studentEmail);
      setUser(updatedUser);
      await fetchDataForUser(updatedUser);
    }
  };

  const handleBackToRoleSelect = () => setSelectedRole(null);

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setSelectedRole(null);
    setQuizzes([]);
    setStudentSubmissions([]);
    setSharedContent([]);
    setGeneratedLectures([]);
    setGeneratedCaseStudies([]);
    setAttendanceSessions([]);
    setVideoLectures([]);
    setExamPapers([]);
    setLessonPlans([]);
    setCurriculumPlans([]);
    setAssignments([]);
    setAssignmentSubmissions([]);
    setStudentPerformance([]);
    setAssistanceDisabled(false);
  };

  // --- Existing handlers ---
  const handleAddQuiz = async (quiz: Omit<Quiz, 'id'>) => { const q = await apiService.addQuiz(quiz); setQuizzes(prev => [...prev, q]); };
  const handleUpdateQuiz = async (quiz: Quiz) => { const q = await apiService.updateQuiz(quiz); setQuizzes(prev => prev.map(x => x.id === q.id ? q : x)); };
  const handleDeleteQuiz = async (id: string) => { await apiService.deleteQuiz(id); setQuizzes(prev => prev.filter(x => x.id !== id)); };
  const handleAddSubmission = async (sub: Omit<Submission, 'submittedAt'>) => { const s = await apiService.addSubmission(sub); setStudentSubmissions(prev => [...prev, s]); };
  const handleAddSharedContent = async (c: Omit<SharedContent, 'id'>) => { const n = await apiService.addSharedContent(c); setSharedContent(prev => [n, ...prev]); };
  const handleUpdateSharedContent = async (c: SharedContent) => { const n = await apiService.updateSharedContent(c); setSharedContent(prev => prev.map(x => x.id === n.id ? n : x)); };
  const handleDeleteSharedContent = async (id: string) => { await apiService.deleteSharedContent(id); setSharedContent(prev => prev.filter(x => x.id !== id)); };
  const handleAddGeneratedLecture = async (l: Omit<GeneratedLecture, 'id'>) => { const n = await apiService.addGeneratedLecture(l); setGeneratedLectures(prev => [...prev, n]); };
  const handleUpdateGeneratedLecture = async (l: GeneratedLecture) => { const n = await apiService.updateGeneratedLecture(l); setGeneratedLectures(prev => prev.map(x => x.id === n.id ? n : x)); };
  const handleAddGeneratedCaseStudy = async (s: Omit<CaseStudy, 'id'>) => { const n = await apiService.addGeneratedCaseStudy(s); setGeneratedCaseStudies(prev => [...prev, n]); };
  const handleUpdateGeneratedCaseStudy = async (s: CaseStudy) => { const n = await apiService.updateGeneratedCaseStudy(s); setGeneratedCaseStudies(prev => prev.map(x => x.id === n.id ? n : x)); };
  const handleStartAttendanceSession = async () => { if (!user?.classCode) return; const s = await apiService.startAttendanceSession(user, user.classCode); setAttendanceSessions(prev => [...prev.map(x => ({...x, isActive: false, status: 'stopped'})), s]); };
  const handleStopAttendanceSession = async (sessionId: string) => { if (!user?.classCode) return; const s = await apiService.stopAttendanceSession(user, sessionId); setAttendanceSessions(prev => prev.map(x => x.id === s.id ? s : x)); };
  const handleAddAttendanceRecord = async (record: AttendanceRecord) => { if (!user?.classCode) return; const s = await apiService.addAttendanceRecord(user.classCode, record); setAttendanceSessions(s); };
  const handleSubmitAttendance = async (submittedValue: string) => { 
    if (!user?.classCode) return; 
    const session = await apiService.submitAttendance(user, user.classCode, submittedValue, 'face_matching'); 
    setAttendanceSessions(prev => prev.map(s => s.id === session.id ? session : s)); 
  };
  const handleUpdateLectureProgress = async (lectureId: string, progressPercent: number) => {
    if (!user) return;
    const completion = await apiService.updateLectureProgress(user, lectureId, progressPercent);
    setVideoLectures(prev => prev.map(vl => {
      if (vl.id !== lectureId) return vl;
      const existing = vl.completions.find(c => c.studentEmail === user.email);
      const newCompletions = existing 
        ? vl.completions.map(c => c.studentEmail === user.email ? completion : c)
        : [...vl.completions, completion];
      return { ...vl, completions: newCompletions };
    }));
  };

  // --- NEW handlers ---
  const handleAddVideoLecture = async (vl: Omit<VideoLecture, 'id' | 'uploadedAt' | 'completions'>) => { if(!user) return null; const n = await apiService.addVideoLecture(user, vl); setVideoLectures(prev => [n, ...prev]); return n; };
  const handleDeleteVideoLecture = async (id: string) => { await apiService.deleteVideoLecture(id); setVideoLectures(prev => prev.filter(x => x.id !== id)); };
  const handleAddExamPaper = async (ep: Omit<ExamPaper, 'id'>) => { const n = await apiService.addExamPaper(ep); setExamPapers(prev => [n, ...prev]); };
  const handleUpdateExamPaper = async (ep: ExamPaper) => { const n = await apiService.updateExamPaper(ep); setExamPapers(prev => prev.map(x => x.id === n.id ? n : x)); };
  const handleDeleteExamPaper = async (id: string) => { await apiService.deleteExamPaper(id); setExamPapers(prev => prev.filter(x => x.id !== id)); };
  const handleAddLessonPlan = async (lp: Omit<LessonPlan, 'id'>) => { const n = await apiService.addLessonPlan(lp); setLessonPlans(prev => [n, ...prev]); };
  const handleDeleteLessonPlan = async (id: string) => { await apiService.deleteLessonPlan(id); setLessonPlans(prev => prev.filter(x => x.id !== id)); };
  const handleAddCurriculumPlan = async (cp: Omit<CurriculumPlan, 'id'>) => { const n = await apiService.addCurriculumPlan(cp); setCurriculumPlans(prev => [n, ...prev]); };
  const handleDeleteCurriculumPlan = async (id: string) => { await apiService.deleteCurriculumPlan(id); setCurriculumPlans(prev => prev.filter(x => x.id !== id)); };
  // Animation
  const [animationScripts, setAnimationScripts] = useState<AnimationScript[]>([]);
  const handleFetchAnimationScripts = async (currentUser: User) => { const data = await apiService.fetchAnimationScripts(currentUser.classCode!); setAnimationScripts(data); };
  const handleAddAnimationScript = async (a: Omit<AnimationScript, 'id'>) => { const n = await apiService.addAnimationScript(a); setAnimationScripts(prev => [...prev, n]); };
  const handleUpdateAnimationScript = async (a: AnimationScript) => { const n = await apiService.updateAnimationScript(a); setAnimationScripts(prev => prev.map(x => x.id === n.id ? n : x)); };
  const handleDeleteAnimationScript = async (id: string) => { await apiService.deleteAnimationScript(id); setAnimationScripts(prev => prev.filter(x => x.id !== id)); };
  const handleSetAnimationScriptStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setAnimationScriptStatus(user, id, status); setAnimationScripts(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  // Resource Hub
  const [resourceHubs, setResourceHubs] = useState<SavedResourceHub[]>([]);
  const handleFetchResourceHubs = async (currentUser: User) => { const data = await apiService.fetchResourceHubs(currentUser.classCode!); setResourceHubs(data); };
  const handleAddResourceHub = async (a: Omit<SavedResourceHub, 'id'>) => { const n = await apiService.addResourceHub(a); setResourceHubs(prev => [...prev, n]); };
  const handleUpdateResourceHub = async (a: SavedResourceHub) => { const n = await apiService.updateResourceHub(a); setResourceHubs(prev => prev.map(x => x.id === a.id ? a : x)); };
  const handleDeleteResourceHub = async (id: string) => { await apiService.deleteResourceHub(id); setResourceHubs(prev => prev.filter(x => x.id !== id)); };
  const handleSetResourceHubStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setResourceHubStatus(user, id, status); setResourceHubs(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleAddAssignment = async (a: Omit<Assignment, 'id'>) => { const n = await apiService.addAssignment(a); setAssignments(prev => [n, ...prev]); };
  const handleUpdateAssignment = async (a: Assignment) => { const n = await apiService.updateAssignment(a); setAssignments(prev => prev.map(x => x.id === a.id ? a : x)); };
  const handleDeleteAssignment = async (id: string) => { await apiService.deleteAssignment(id); setAssignments(prev => prev.filter(x => x.id !== id)); };
  const handleAddAssignmentSubmission = async (s: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => { const n = await apiService.addAssignmentSubmission(s); setAssignmentSubmissions(prev => [n, ...prev]); };
  const handleUpdateAssignmentSubmission = async (id: string, score: number, aiFeedback?: string) => { if(!user) return; const n = await apiService.updateAssignmentSubmission(user, id, score, aiFeedback); setAssignmentSubmissions(prev => prev.map(x => x.id === id ? n : x)); };
  const handleAddStudentPerformance = async (p: Omit<StudentPerformance, 'id' | 'timestamp'>) => { const n = await apiService.addStudentPerformance(p); setStudentPerformance(prev => [...prev, n]); };
  
  const handleToggleAssistance = async (disabled: boolean) => {
    if (!user?.classCode) return;
    await apiService.setAssistanceDisabled(user.classCode, disabled);
    setAssistanceDisabled(disabled);
  };

  const handleSetQuizStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setQuizStatus(user, id, status); setQuizzes(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleSetGeneratedLectureStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setGeneratedLectureStatus(user, id, status); setGeneratedLectures(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleSetVideoLectureStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setVideoLectureStatus(user, id, status); setVideoLectures(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleSetExamPaperStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setExamPaperStatus(user, id, status); setExamPapers(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleSetLessonPlanStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setLessonPlanStatus(user, id, status); setLessonPlans(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleSetAssignmentStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setAssignmentStatus(user, id, status); setAssignments(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleSetCurriculumPlanStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setCurriculumPlanStatus(user, id, status); setCurriculumPlans(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleSetCurriculumItemStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; const n = await apiService.setCurriculumItemStatus(user, id, status); fetchDataForUser(user); };
  const handleSetCaseStudyStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setCaseStudyStatus(user, id, status); setGeneratedCaseStudies(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleSetSharedContentStatus = async (id: string, status: CurriculumStatus) => { if(!user) return; await apiService.setSharedContentStatus(user, id, status); setSharedContent(prev => prev.map(x => x.id === id ? { ...x, status } : x)); };
  const handleDeleteGeneratedLecture = async (id: string) => { await apiService.deleteGeneratedLecture(id); setGeneratedLectures(prev => prev.filter(x => x.id !== id)); };
  const handleDeleteCaseStudy = async (id: string) => { await apiService.deleteCaseStudy(id); setGeneratedCaseStudies(prev => prev.filter(x => x.id !== id)); };

  const renderContent = () => {
    if (appLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="w-16 h-16 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (user) {
      if (user.role === 'student' && !user.classCode) {
        return <JoinClass user={user} onJoinClass={handleJoinClass} onLogout={handleLogout} />;
      }
      if (!user.classCode && user.role === 'teacher') {
        return <div>Error: No classroom assigned. Please <button onClick={handleLogout} className="underline">log out</button> and try again.</div>;
      }

      switch (user.role) {
        case 'teacher':
          return <TeacherPortal
            user={user}
            allUsers={allUsers}
            onLogout={handleLogout}
            quizzes={quizzes}
            addQuiz={handleAddQuiz}
            updateQuiz={handleUpdateQuiz}
            deleteQuiz={handleDeleteQuiz}
            studentSubmissions={studentSubmissions}
            sharedContent={sharedContent}
            addSharedContent={handleAddSharedContent}
            updateSharedContent={handleUpdateSharedContent}
            deleteSharedContent={handleDeleteSharedContent}
            generatedLectures={generatedLectures}
            addGeneratedLecture={handleAddGeneratedLecture}
            generatedCaseStudies={generatedCaseStudies}
            addGeneratedCaseStudy={handleAddGeneratedCaseStudy}
            faqs={faqs}
            attendanceSessions={attendanceSessions}
            startAttendance={handleStartAttendanceSession}
            stopAttendance={handleStopAttendanceSession}
            // New props
            videoLectures={videoLectures}
            addVideoLecture={handleAddVideoLecture}
            deleteVideoLecture={handleDeleteVideoLecture}
            examPapers={examPapers}
            addExamPaper={handleAddExamPaper}
            updateExamPaper={handleUpdateExamPaper}
            deleteExamPaper={handleDeleteExamPaper}
            lessonPlans={lessonPlans}
            addLessonPlan={handleAddLessonPlan}
            deleteLessonPlan={handleDeleteLessonPlan}
            // New Save/Publish props
            setQuizStatus={handleSetQuizStatus}
            setGeneratedLectureStatus={handleSetGeneratedLectureStatus}
            setCaseStudyStatus={handleSetCaseStudyStatus}
            setSharedContentStatus={handleSetSharedContentStatus}
            setExamPaperStatus={handleSetExamPaperStatus}
            setLessonPlanStatus={handleSetLessonPlanStatus}
            setVideoLectureStatus={handleSetVideoLectureStatus}
            setAssignmentStatus={handleSetAssignmentStatus}
            deleteGeneratedLecture={handleDeleteGeneratedLecture}
            deleteCaseStudy={handleDeleteCaseStudy}
            curriculumPlans={curriculumPlans}
            addCurriculumPlan={handleAddCurriculumPlan}
            deleteCurriculumPlan={handleDeleteCurriculumPlan}
            assignments={assignments}
            addAssignment={handleAddAssignment}
            updateAssignment={handleUpdateAssignment}
            deleteAssignment={handleDeleteAssignment}
            assignmentSubmissions={assignmentSubmissions}
            updateAssignmentSubmission={handleUpdateAssignmentSubmission}
            assistanceDisabled={assistanceDisabled}
            onToggleAssistance={handleToggleAssistance}
            setCurriculumPlanStatus={handleSetCurriculumPlanStatus}
            setCurriculumItemStatus={handleSetCurriculumItemStatus}
            isOfflineMode={isOfflineMode}
            toggleOfflineMode={toggleOfflineMode}
            updateGeneratedLecture={handleUpdateGeneratedLecture}
            updateGeneratedCaseStudy={handleUpdateGeneratedCaseStudy}
            animationScripts={animationScripts}
            addAnimationScript={handleAddAnimationScript}
            updateAnimationScript={handleUpdateAnimationScript}
            deleteAnimationScript={handleDeleteAnimationScript}
            setAnimationScriptStatus={handleSetAnimationScriptStatus}
            resourceHubs={resourceHubs}
            addResourceHub={handleAddResourceHub}
            updateResourceHub={handleUpdateResourceHub}
            deleteResourceHub={handleDeleteResourceHub}
            setResourceHubStatus={handleSetResourceHubStatus}
          />;
        case 'student':
          return <StudentPortal
            user={user}
            onLogout={handleLogout}
            quizzes={quizzes}
            addSubmission={handleAddSubmission}
            studentSubmissions={studentSubmissions}
            sharedContent={sharedContent}
            generatedLectures={generatedLectures}
            generatedCaseStudies={generatedCaseStudies}
            faqs={faqs}
            attendanceSessions={attendanceSessions}
            addAttendanceRecord={handleAddAttendanceRecord}
            // New props
            videoLectures={videoLectures}
            curriculumPlans={curriculumPlans}
            assignments={assignments}
            assignmentSubmissions={assignmentSubmissions}
            addAssignmentSubmission={handleAddAssignmentSubmission}
            assistanceDisabled={assistanceDisabled}
            submitAttendance={handleSubmitAttendance}
            studentPerformance={studentPerformance}
            addStudentPerformance={handleAddStudentPerformance}
            isOfflineMode={isOfflineMode}
            toggleOfflineMode={toggleOfflineMode}
          />;
        case 'parent':
          if (!user.classCode) {
             return <ParentJoinClass user={user} onJoinClassParent={handleJoinClassParent} onLogout={handleLogout} />;
          }
          return <ParentPortal
            user={user}
            onLogout={handleLogout}
            quizzes={quizzes}
            studentSubmissions={studentSubmissions}
            attendanceSessions={attendanceSessions}
            videoLectures={videoLectures}
            curriculumPlans={curriculumPlans}
            assignments={assignments}
            assignmentSubmissions={assignmentSubmissions}
          />;
        default:
          return <RoleSelection onSelectRole={handleRoleSelect} />;
      }
    }

    if (selectedRole) {
      return <Auth role={selectedRole} onAuthSuccess={handleAuthSuccess} onBack={handleBackToRoleSelect} />;
    }

    return <RoleSelection onSelectRole={handleRoleSelect} />;
  };

  const highContrastClasses = accessibilitySettings.highContrast ? 'bg-white text-black' : 'bg-brand-dark text-gray-200';
  const isDashboardView = user && (user.role === 'teacher' || (user.role === 'student' && user.classCode));

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${highContrastClasses}`} style={{ fontSize: `${accessibilitySettings.fontSize}px` }}>
      {isOfflineMode && (
        <div className="bg-brand-cyan/10 border-b border-brand-cyan/20 text-brand-cyan text-center py-2 px-4 sticky top-0 z-[60] flex items-center justify-center gap-3 font-semibold shadow-sm backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-brand-cyan animate-pulse"></span>
          <span className="text-sm tracking-wide">You are offline — Using Local AI (Ollama)</span>
        </div>
      )}
      <main className={!isDashboardView ? "container mx-auto px-4 py-8" : ""}>
        {renderContent()}
      </main>
      <AccessibilityEnhancer settings={accessibilitySettings} setSettings={setAccessibilitySettings} />
    </div>
  );
};

export default App;
