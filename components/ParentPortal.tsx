import React, { useState, useEffect, useRef } from 'react';
import { Quiz, User, Submission, AttendanceSession, VideoLecture, CurriculumPlan, Assignment, AssignmentSubmission, DashboardData } from '../types';
import { 
  HomeIcon, QuizIcon, FileTextIcon, UserCheckIcon, SparklesIcon, ShareIcon, EyeIcon, 
  SummarizeIcon, TranslateIcon, BookOpenIcon, AIGeneratorIcon, CloseIcon, SearchIcon, 
  LogoutIcon, CheckCircleIcon, VisualizationIcon, MicIcon, SpeakerIcon 
} from './Icons';
import Sidebar from './Sidebar';
import * as apiService from '../services/apiService';
import TTSPlayer from './TTSPlayer';

const translations = {
  English: {
    dashboard: 'Overview',
    performance: 'Performance',
    attendance: 'Attendance',
    curriculum: 'Curriculum',
    portalTitle: 'Parent Portal',
    monitoring: 'Monitoring',
    logout: 'Logout',
    aiInsight: 'AI Student Insight',
    stats: {
      attendance: 'Attendance',
      avgQuiz: 'Avg Quiz Score',
      completedQuizzes: 'Completed Quizzes',
      pendingTasks: 'Pending Tasks'
    },
    recentQuizzes: 'Recent Quiz Results',
    noQuizzes: 'No quiz submissions yet.',
    recommendations: 'Personalized Recommendations',
    thinking: 'Thinking...',
    analyzing: 'Analyzing performance data...',
    performanceAnalytics: 'Detailed Performance Analytics',
    graphTitle: 'Graph Comparison: Quiz vs Assignments',
    graphSubtitle: 'Showing progress over the last 30 days',
    proficiency: 'Topic-wise Proficiency',
    assignmentStatus: 'Assignment Status',
    graded: 'Graded',
    awaiting: 'Awaiting',
    pending: 'Pending',
    attendanceRecords: 'Attendance Records',
    totalSessions: 'Total Sessions',
    present: 'Present',
    overallAttendance: 'Overall Attendance',
    date: 'Date',
    status: 'Status',
    verification: 'Verification Method',
    presentStatus: '✓ Present',
    absentStatus: '✗ Absent',
    valueAddedCurriculum: 'Value-Added Curriculum',
    curriculumSubtitle: "Teacher's roadmap enhanced by AI for extra learning",
    classRoadmap: 'Class Roadmap',
    enhanceWithAi: 'Enhance with AI',
    teacherTopics: "Teacher's Topics",
    extraLearning: 'Extra Learning (AI Suggestion)',
    analyzingCurriculum: 'AI is analyzing extra learning paths...',
    noCurriculum: 'No curriculum data available for this class.'
  },
  Hindi: {
    dashboard: 'अवलोकन',
    performance: 'प्रदर्शन',
    attendance: 'उपस्थिति',
    curriculum: 'पाठ्यक्रम',
    portalTitle: 'पैरेंट पोर्टल',
    monitoring: 'निगरानी',
    logout: 'लॉगआउट',
    aiInsight: 'एआई छात्र अंतर्दृष्टि',
    stats: {
      attendance: 'उपस्थिति',
      avgQuiz: 'औसत क्विज़ स्कोर',
      completedQuizzes: 'पूर्ण क्विज़',
      pendingTasks: 'लंबित कार्य'
    },
    recentQuizzes: 'हाल के क्विज़ परिणाम',
    noQuizzes: 'अभी तक कोई क्विज़ सबमिशन नहीं है।',
    recommendations: 'व्यक्तिगत सिफारिशें',
    thinking: 'सोच रहा हूँ...',
    analyzing: 'प्रदर्शन डेटा का विश्लेषण कर रहा हूँ...',
    performanceAnalytics: 'विस्तृत प्रदर्शन विश्लेषण',
    graphTitle: 'ग्राफ तुलना: क्विज़ बनाम असाइनमेंट',
    graphSubtitle: 'पिछले 30 दिनों की प्रगति दिखा रहा है',
    proficiency: 'विषय-वार दक्षता',
    assignmentStatus: 'असाइनमेंट स्थिति',
    graded: 'ग्रेडेड',
    awaiting: 'प्रतीक्षा',
    pending: 'लंबित',
    attendanceRecords: 'उपस्थिति रिकॉर्ड',
    totalSessions: 'कुल सत्र',
    present: 'उपस्थित',
    overallAttendance: 'कुल उपस्थिति',
    date: 'दिनांक',
    status: 'स्थिति',
    verification: 'सत्यापन विधि',
    presentStatus: '✓ उपस्थित',
    absentStatus: '✗ अनुपस्थित',
    valueAddedCurriculum: 'मूल्यवर्धित पाठ्यक्रम',
    curriculumSubtitle: 'एआई द्वारा बेहतर शिक्षक रोडमैप',
    classRoadmap: 'कक्षा रोडमैप',
    enhanceWithAi: 'एआई के साथ बेहतर बनाएं',
    teacherTopics: 'शिक्षक के विषय',
    extraLearning: 'अतिरिक्त शिक्षण (एआई सुझाव)',
    analyzingCurriculum: 'एआई अतिरिक्त सीखने के रास्तों का विश्लेषण कर रहा है...',
    noCurriculum: 'इस कक्षा के लिए कोई पाठ्यक्रम डेटा उपलब्ध नहीं है।'
  },
  Marathi: {
    dashboard: 'आढावा',
    performance: 'कामगिरी',
    attendance: 'हजेरी',
    curriculum: 'अभ्यासक्रम',
    portalTitle: 'पालक पोर्टल',
    monitoring: 'देखरेख',
    logout: 'लॉगआउट',
    aiInsight: 'एआय विद्यार्थी अंतर्दृष्टी',
    stats: {
      attendance: 'हजेरी',
      avgQuiz: 'सरासरी क्विझ स्कोर',
      completedQuizzes: 'पूर्ण केलेले क्विझ',
      pendingTasks: 'प्रलंबित कामे'
    },
    recentQuizzes: 'अलीकडील क्विझ निकाल',
    noQuizzes: 'अद्याप कोणतेही क्विझ सबमिशन नाही.',
    recommendations: 'वैयक्तिक शिफारसी',
    thinking: 'विचार करत आहे...',
    analyzing: 'कामगिरी डेटाचे विश्लेषण करत आहे...',
    performanceAnalytics: 'तपशीलवार कामगिरी विश्लेषण',
    graphTitle: 'आलेख तुलना: क्विझ विरुद्ध असाइनमेंट',
    graphSubtitle: 'गेल्या ३० दिवसांमधील प्रगती दर्शवित आहे',
    proficiency: 'विषय-वार प्राविण्य',
    assignmentStatus: 'असाइनमेंटची स्थिती',
    graded: 'श्रेणीबद्ध',
    awaiting: 'प्रतीक्षा',
    pending: 'प्रलंबित',
    attendanceRecords: 'हजेरी रेकॉर्ड',
    totalSessions: 'एकूण सत्र',
    present: 'उपस्थित',
    overallAttendance: 'एकूण हजेरी',
    date: 'तारीख',
    status: 'स्थिती',
    verification: 'पडताळणी पद्धत',
    presentStatus: '✓ उपस्थित',
    absentStatus: '✗ अनुपस्थित',
    valueAddedCurriculum: 'मूल्यवर्धित अभ्यासक्रम',
    curriculumSubtitle: 'एआय द्वारे सुधारित शिक्षक रोडमॅप',
    classRoadmap: 'वर्ग रोडमॅप',
    enhanceWithAi: 'एआय सह सुधारित करा',
    teacherTopics: 'शिक्षकांचे विषय',
    extraLearning: 'अतिरिक्त शिक्षण (एआय सूचना)',
    analyzingCurriculum: 'एआय अतिरिक्त शिक्षण मार्गांचे विश्लेषण करत आहे...',
    noCurriculum: 'या वर्गासाठी कोणताही अभ्यासक्रम डेटा उपलब्ध नाही.'
  }
};

interface ParentPortalProps {
  user: User;
  onLogout: () => void;
  // All these props should be for the linked student
  quizzes: Quiz[];
  studentSubmissions: Submission[];
  attendanceSessions: AttendanceSession[];
  videoLectures: VideoLecture[];
  curriculumPlans: CurriculumPlan[];
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
}

const StatCard: React.FC<{ title: string, value: string | number, icon?: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6 shadow-lg hover:shadow-brand-cyan/10 transition-all">
    <div className="flex justify-between items-start">
        <div>
            <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold mt-2 text-white">{value}</p>
        </div>
        {icon && <div className="text-brand-cyan transform scale-110">{icon}</div>}
    </div>
  </div>
);

const ParentPortal: React.FC<ParentPortalProps> = ({ 
  user, onLogout, quizzes, studentSubmissions, attendanceSessions, 
  videoLectures, curriculumPlans, assignments, assignmentSubmissions 
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'performance' | 'attendance' | 'curriculum'>('dashboard');
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Marathi'>('English');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string | null>(null);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const t = translations[language];

  // Calculate Metrics
  const totalQuizzes = quizzes.filter(q => q.status === 'published').length;
  const completedQuizzes = studentSubmissions.length;
  const avgQuizScore = studentSubmissions.length > 0 
    ? Math.round((studentSubmissions.reduce((acc, s) => acc + (s.score / s.totalQuestions), 0) / studentSubmissions.length) * 100)
    : 0;
  
  const presentCount = attendanceSessions.filter(s => s.records.some(r => r.studentEmail === user.studentEmail)).length;
  const attendancePct = attendanceSessions.length > 0 ? Math.round((presentCount / attendanceSessions.length) * 100) : 0;

  const pendingAssignments = assignments.filter(a => a.status === 'published' && !assignmentSubmissions.some(s => s.assignmentId === a.id)).length;

  useEffect(() => {
    generateAISummary();
    generateAIRecommendations();
  }, [studentSubmissions, attendanceSessions, assignmentSubmissions, language]);

  const generateAISummary = async () => {
    setIsGeneratingSummary(true);
    try {
        const response = await fetch('/api/ai/parent-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                attendance: `${attendancePct}%`,
                quiz: `${avgQuizScore}%`,
                assignment: `${assignmentSubmissions.length} completed, ${pendingAssignments} pending`,
                language
            })
        });
        const data = await response.json();
        setAiSummary(data.text);
    } catch (e) {
        setAiSummary("Failed to generate summary. Please check your connection.");
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  const generateAIRecommendations = async () => {
    setIsGeneratingRecommendations(true);
    try {
        const weakSubjects = quizzes
            .filter(q => {
                const sub = studentSubmissions.find(s => s.quizId === q.id);
                return sub && (sub.score / sub.totalQuestions) < 0.6;
            })
            .map(q => q.topic)
            .join(', ') || 'General improvements';

        const response = await fetch('/api/ai/parent-recommendation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weakSubjects, language })
        });
        const data = await response.json();
        setAiRecommendations(data.text);
    } catch (e) {
        setAiRecommendations("Keep supporting your child's learning journey!");
    } finally {
        setIsGeneratingRecommendations(false);
    }
  };

  // Removed Voice Assistant logic per user request


  const renderDashboard = () => (
    <div className="space-y-6">
      {/* AI Summary Card */}
      <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6 shadow-glow-cyan/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <SparklesIcon className="w-24 h-24" />
        </div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
                <SparklesIcon className="text-brand-cyan" /> 
                {t.aiInsight}
            </h3>
        </div>
        {isGeneratingSummary ? (
            <div className="flex items-center gap-3 text-gray-400 italic">
                <div className="w-4 h-4 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                {t.analyzing}
            </div>
        ) : (
            <>
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{aiSummary}</div>
                {aiSummary && <TTSPlayer text={aiSummary} language={language} />}
            </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title={t.stats.attendance} value={`${attendancePct}%`} icon={<UserCheckIcon />} />
        <StatCard title={t.stats.avgQuiz} value={`${avgQuizScore}%`} icon={<VisualizationIcon />} />
        <StatCard title={t.stats.completedQuizzes} value={completedQuizzes} icon={<QuizIcon />} />
        <StatCard title={t.stats.pendingTasks} value={pendingAssignments} icon={<FileTextIcon />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz Results List */}
        <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <QuizIcon className="text-brand-cyan" /> {t.recentQuizzes}
            </h3>
            <div className="space-y-3">
                {studentSubmissions.length > 0 ? (
                    studentSubmissions.slice(0, 5).map((sub, i) => (
                        <div key={i} className="bg-brand-dark p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{quizzes.find(q => q.id === sub.quizId)?.topic || 'Quiz'}</p>
                                <p className="text-xs text-gray-500">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right text-brand-cyan font-bold">
                                {sub.score} / {sub.totalQuestions}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-sm italic">{t.noQuizzes}</p>
                )}
            </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6 shadow-glow-cyan/5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-brand-cyan">
                <SparklesIcon /> {t.recommendations}
            </h3>
            {isGeneratingRecommendations ? (
                <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-4 h-4 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                    {t.thinking}
                </div>
            ) : (
                <>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{aiRecommendations}</div>
                    {aiRecommendations && <TTSPlayer text={aiRecommendations} language={language} />}
                </>
            )}
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t.performanceAnalytics}</h2>
        <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6 h-80 flex items-center justify-center relative overflow-hidden">
             {/* Mock Chart Visualization */}
             <div className="absolute inset-0 flex items-end justify-around px-8 pb-8 opacity-20">
                {[45, 78, 56, 89, 67, 95, 82].map((h, i) => (
                    <div key={i} style={{ height: `${h}%` }} className="w-12 bg-brand-cyan rounded-t-md animate-pulse"></div>
                ))}
             </div>
             <div className="z-10 text-center">
                <VisualizationIcon className="w-16 h-16 mx-auto text-brand-cyan opacity-50 mb-4" />
                <p className="text-xl font-bold">{t.graphTitle}</p>
                <p className="text-gray-400 text-sm mt-2">{t.graphSubtitle}</p>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">{t.proficiency}</h3>
                <div className="space-y-4">
                    {quizzes.slice(0, 4).map((q, i) => {
                        const sub = studentSubmissions.find(s => s.quizId === q.id);
                        const pct = sub ? Math.round((sub.score / sub.totalQuestions) * 100) : 0;
                        return (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{q.topic}</span>
                                    <span className="text-brand-cyan">{pct}%</span>
                                </div>
                                <div className="w-full bg-brand-dark h-2 rounded-full overflow-hidden">
                                    <div className="bg-brand-cyan h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">{t.assignmentStatus}</h3>
                <div className="space-y-3">
                    {assignments.slice(0, 4).map((a, i) => {
                        const sub = assignmentSubmissions.find(s => s.assignmentId === a.id);
                        return (
                            <div key={i} className="flex justify-between items-center p-2 border-b border-brand-border/50">
                                <span className="text-sm font-medium">{a.topic || a.title}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${sub ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                    {sub ? t.graded + ': ' + (sub.score || t.awaiting) : t.pending}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t.attendanceRecords}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title={t.totalSessions} value={attendanceSessions.length} />
            <StatCard title={t.present} value={presentCount} />
            <StatCard title={t.overallAttendance} value={`${attendancePct}%`} />
        </div>
        <div className="bg-brand-dark-blue border border-brand-border rounded-xl p-6 overflow-hidden">
            <table className="w-full">
                <thead className="bg-brand-dark">
                    <tr>
                        <th className="p-4 text-left">{t.date}</th>
                        <th className="p-4 text-left">{t.status}</th>
                        <th className="p-4 text-left">{t.verification}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                    {attendanceSessions.map((s, i) => {
                        const record = s.records.find(r => r.studentEmail === user.studentEmail);
                        return (
                            <tr key={i} className="hover:bg-brand-dark/50 transition-colors">
                                <td className="p-4">{new Date(s.date).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <span className={`font-bold ${record ? 'text-green-400' : 'text-red-400'}`}>
                                        {record ? t.presentStatus : t.absentStatus}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-sm">{record?.method || '-'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );

  const [enhancedCurriculum, setEnhancedCurriculum] = useState<Record<string, string>>({});
  const [isEnhancing, setIsEnhancing] = useState<Record<string, boolean>>({});

  const enhanceCurriculum = async (subject: string) => {
    setIsEnhancing(prev => ({ ...prev, [subject]: true }));
    try {
        const response = await fetch('/api/ai/parent-curriculum', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, language })
        });
        const data = await response.json();
        setEnhancedCurriculum(prev => ({ ...prev, [subject]: data.text }));
    } catch (e) {
        setEnhancedCurriculum(prev => ({ ...prev, [subject]: "Unable to get insights for this subject." }));
    } finally {
        setIsEnhancing(prev => ({ ...prev, [subject]: false }));
    }
  };

  const renderCurriculum = () => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t.valueAddedCurriculum}</h2>
            <p className="text-sm text-gray-500">{t.curriculumSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {curriculumPlans.length > 0 ? (
                curriculumPlans.map((plan, i) => (
                    <div key={i} className="bg-brand-dark-blue border border-brand-border rounded-xl p-6 relative">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-brand-cyan">{plan.domain}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{t.classRoadmap}</p>
                            </div>
                            <button 
                                onClick={() => enhanceCurriculum(plan.domain)}
                                className="bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 hover:bg-brand-cyan hover:text-white px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1"
                            >
                                <SparklesIcon className="w-3 h-3" /> {t.enhanceWithAi}
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">{t.teacherTopics}</h4>
                                <div className="space-y-2">
                                    {plan.topics.map((t, ti) => (
                                        <div key={ti} className="flex items-center gap-3 bg-brand-dark p-2 rounded-lg border border-brand-border/30">
                                            <div className="w-2 h-2 rounded-full bg-brand-cyan"></div>
                                            <span className="text-sm">{t.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {enhancedCurriculum[plan.domain] && (
                                <div className="bg-brand-cyan/5 border border-brand-cyan/20 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <h4 className="text-sm font-bold text-brand-cyan mb-2 flex items-center gap-2">
                                        <AIGeneratorIcon className="w-4 h-4"/> {t.extraLearning}
                                    </h4>
                                    <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap italic">
                                        {enhancedCurriculum[plan.domain]}
                                    </div>
                                    <TTSPlayer text={enhancedCurriculum[plan.domain]} language={language} />
                                </div>
                            )}

                            {isEnhancing[plan.domain] && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse">
                                    <div className="w-3 h-3 border border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                                    {t.analyzingCurriculum}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-2 text-center p-12 text-gray-500 italic">
                    {t.noCurriculum}
                </div>
            )}
        </div>
    </div>
  );

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: <HomeIcon /> },
    { id: 'performance', label: t.performance, icon: <VisualizationIcon /> },
    { id: 'attendance', label: t.attendance, icon: <UserCheckIcon /> },
    { id: 'curriculum', label: t.curriculum, icon: <BookOpenIcon /> },
  ];

  return (
    <div className="flex h-screen bg-brand-dark text-white overflow-hidden">
      <Sidebar 
        activePage={activeTab} 
        onNavigate={setActiveTab as any} 
        title={<>{t.portalTitle.split(' ')[0]}<br/>{t.portalTitle.split(' ')[1]}</>} 
        navItems={menuItems} 
      />
      <main className="flex-1 ml-64 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-cyan to-blue-600 flex items-center justify-center shadow-glow-cyan/20">
                     <span className="text-2xl font-bold">P</span>
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t.portalTitle}</h1>
                    <p className="text-gray-400">{t.monitoring} <span className="text-brand-cyan font-semibold">{user.studentEmail}</span></p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-sm text-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                >
                    <option value="English">English</option>
                    <option value="Hindi">हिंदी</option>
                    <option value="Marathi">मराठी</option>
                </select>
                <button 
                    onClick={onLogout} 
                    className="flex items-center gap-2 text-brand-cyan hover:underline ml-2"
                >
                    <LogoutIcon /> {t.logout}
                </button>
            </div>
        </header>

        <div className="animate-in fade-in duration-700">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'performance' && renderPerformance()}
            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'curriculum' && renderCurriculum()}
        </div>
      </main>
    </div>
  );
};

export default ParentPortal;
