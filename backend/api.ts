import { AttendanceRecord, AttendanceSession, CaseStudy, Classroom, CurriculumItem, CurriculumStatus, CurriculumPlan, DashboardData, DBUser, ExamPaper, GeneratedLecture, LectureCompletion, LectureLanguagePreference, LectureNotes, LessonPlan, Quiz, Role, SharedContent, StudentLecturePreference, Submission, User, VideoLecture, Assignment, AssignmentSubmission, StudentPerformance, AnimationScript, SavedResourceHub } from './types';
import * as db from './db';

const SIMULATED_DELAY = 300;
const ATTENDANCE_WINDOW_MINUTES = 10;
const LECTURE_COMPLETION_THRESHOLD = 85;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const generateClassCode = (existingCodes: string[]): string => {
    let newClassCode: string;
    do {
        newClassCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (existingCodes.includes(newClassCode));
    return newClassCode;
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const ensureTeacher = (user: User) => {
    if (user.role !== 'teacher') {
        throw new Error('Only teachers can perform this action.');
    }
};

const ensureStudent = (user: User) => {
    if (user.role !== 'student') {
        throw new Error('Only students can perform this action.');
    }
};

const ensureSameClass = (user: User, classCode?: string) => {
    if (!classCode || user.classCode !== classCode) {
        throw new Error('You do not have access to this classroom.');
    }
};

const nowIso = () => new Date().toISOString();

const isSessionExpired = (session: AttendanceSession) => {
    if (!session.endsAt) {
        return false;
    }
    return new Date(session.endsAt).getTime() < Date.now();
};

const normalizeAttendanceSession = (session: AttendanceSession): AttendanceSession => {
    if (session.isActive && isSessionExpired(session)) {
        return {
            ...session,
            isActive: false,
            status: 'expired',
        };
    }
    return {
        ...session,
        status: session.status || (session.isActive ? 'active' : 'stopped'),
    };
};

const getClassroom = (classCode?: string): Classroom | undefined => db.getClassrooms().find(c => c.code === classCode);

const createLectureNotesFallback = (topic: string, transcript: string): LectureNotes => {
    const cleaned = transcript.trim();
    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    const summary = sentences.slice(0, 2).join(' ') || `Overview of ${topic}`;
    const keyPoints = sentences.slice(0, 5).map(sentence => sentence.trim()).filter(Boolean);
    const definitions = keyPoints.slice(0, 3).map((point, index) => ({
        term: `${topic} Concept ${index + 1}`,
        meaning: point,
    }));
    const slides = [
        {
            title: `${topic} Overview`,
            points: keyPoints.slice(0, 3).length ? keyPoints.slice(0, 3) : [`Introduction to ${topic}`],
        },
        {
            title: `${topic} Key Takeaways`,
            points: keyPoints.slice(3, 6).length ? keyPoints.slice(3, 6) : [`Important ideas from ${topic}`],
        },
    ];
    return { summary, keyPoints, definitions, slides };
};

const buildDashboardData = (user: User): DashboardData => {
    const classCode = user.classCode;
    const classroom = getClassroom(classCode);
    const attendanceSessions = db.getAttendanceSessions()
        .filter(session => session.classCode === classCode)
        .map(normalizeAttendanceSession);

    if (attendanceSessions.some(session => session.status === 'expired')) {
        const allSessions = db.getAttendanceSessions().map(normalizeAttendanceSession);
        db.saveAttendanceSessions(allSessions);
    }

    const curriculumItems = db.getCurriculumItems().filter(item => item.classCode === classCode);
    const visibleCurriculumItems = user.role === 'teacher'
        ? curriculumItems
        : curriculumItems.filter(item => item.status === 'published');

    const quizzes = db.getQuizzes().filter(q => q.classCode === classCode);
    const visibleQuizzes = user.role === 'teacher' ? quizzes : quizzes.filter(q => q.status === 'published');

    const generatedLectures = db.getGeneratedLectures().filter(gl => gl.classCode === classCode);
    const visibleGeneratedLectures = user.role === 'teacher' ? generatedLectures : generatedLectures.filter(gl => gl.status === 'published');

    const generatedCaseStudies = db.getGeneratedCaseStudies().filter(cs => cs.classCode === classCode);
    const visibleGeneratedCaseStudies = user.role === 'teacher' ? generatedCaseStudies : generatedCaseStudies.filter(cs => cs.status === 'published');

    const videoLectures = db.getVideoLectures().filter(vl => vl.classCode === classCode);
    const visibleVideoLectures = user.role === 'teacher' ? videoLectures : videoLectures.filter(vl => vl.status === 'published');

    const examPapers = db.getExamPapers().filter(ep => ep.classCode === classCode);
    const visibleExamPapers = user.role === 'teacher' ? examPapers : examPapers.filter(ep => ep.status === 'published');

    const lessonPlans = db.getLessonPlans().filter(lp => lp.classCode === classCode);
    const visibleLessonPlans = user.role === 'teacher' ? lessonPlans : lessonPlans.filter(lp => lp.status === 'published');

    const assignments = db.getAssignments().filter(a => a.classCode === classCode);
    const visibleAssignments = user.role === 'teacher' ? assignments : assignments.filter(a => a.status === 'published');

    const sync = db.getSyncMetadata();

    return {
        allUsers: db.getUsers().map(({ password_DO_NOT_USE_IN_PROD, ...safeUser }) => safeUser),
        classrooms: db.getClassrooms(),
        quizzes: visibleQuizzes,
        studentSubmissions: user.role === 'teacher' 
            ? db.getSubmissions().filter(s => s.classCode === classCode)
            : db.getSubmissions().filter(s => s.classCode === classCode && (s as any).studentEmail === user.email),
        sharedContent: user.role === 'teacher' ? db.getSharedContent().filter(sc => sc.classCode === classCode) : db.getSharedContent().filter(sc => sc.classCode === classCode && sc.status === 'published'),
        generatedLectures: visibleGeneratedLectures,
        generatedCaseStudies: visibleGeneratedCaseStudies,
        attendanceSessions,
        videoLectures: visibleVideoLectures,
        examPapers: visibleExamPapers,
        lessonPlans: visibleLessonPlans,
        curriculumPlans: db.getCurriculumPlans().filter(cp => cp.classCode === classCode && (user.role === 'teacher' || cp.status === 'published')),
        curriculumItems: visibleCurriculumItems,
        studentLecturePreferences: user.role === 'teacher'
            ? db.getStudentLecturePreferences().filter(pref => pref.classCode === classCode)
            : db.getStudentLecturePreferences().filter(pref => pref.classCode === classCode && pref.studentEmail === user.email),
        assistanceDisabled: classroom?.assistanceDisabled ?? false,
        syncVersion: sync.syncVersion,
        lastSyncedAt: sync.lastSyncedAt,
        assignments: visibleAssignments,
        assignmentSubmissions: user.role === 'teacher' ? db.getAssignmentSubmissions() : db.getAssignmentSubmissions().filter(s => s.studentEmail === user.email),
    };
};

const createCrudService = <T extends { id: string; classCode: string }>(
    getter: () => T[],
    setter: (items: T[]) => void
) => ({
    add: async (itemData: Omit<T, 'id'>): Promise<T> => {
        await delay(SIMULATED_DELAY);
        const items = getter();
        const newItem = { ...itemData, id: crypto.randomUUID(), status: (itemData as any).status || 'draft' } as unknown as T;
        setter([...items, newItem]);
        return newItem;
    },
    update: async (updatedItem: T): Promise<T> => {
        await delay(SIMULATED_DELAY);
        const items = getter();
        setter(items.map(item => item.id === updatedItem.id ? updatedItem : item));
        return updatedItem;
    },
    delete: async (itemId: string): Promise<void> => {
        await delay(SIMULATED_DELAY);
        setter(getter().filter(item => item.id !== itemId));
    },
});

export const login = async (email: string, password_DO_NOT_USE_IN_PROD: string, role: Role): Promise<User> => {
    await delay(SIMULATED_DELAY);
    const users = db.getUsers();
    const user = users.find(u => u.email === email && u.role === role);
    if (!user || (user.password_DO_NOT_USE_IN_PROD !== undefined && user.password_DO_NOT_USE_IN_PROD !== password_DO_NOT_USE_IN_PROD)) {
        throw new Error('Invalid credentials or you have selected the wrong role.');
    }
    const userForSession: User = { name: user.name, email: user.email, role: user.role, classCode: user.classCode };
    localStorage.setItem('user', JSON.stringify(userForSession));
    return userForSession;
};

export const signup = async (name: string, email: string, password_DO_NOT_USE_IN_PROD: string, role: Role, imageUrl?: string): Promise<User> => {
    await delay(SIMULATED_DELAY);
    const users = db.getUsers();
    const classrooms = db.getClassrooms();
    if (users.some(u => u.email === email)) {
        throw new Error('An account with this email already exists.');
    }
    const newUserForDb: DBUser = { name, email, role, password_DO_NOT_USE_IN_PROD, imageUrl };
    if (role === 'teacher') {
        const newClassCode = generateClassCode(classrooms.map(c => c.code));
        newUserForDb.classCode = newClassCode;
        const newClassroom: Classroom = { code: newClassCode, teacherEmail: email, assistanceDisabled: false };
        db.saveClassrooms([...classrooms, newClassroom]);
    }
    db.saveUsers([...users, newUserForDb]);
    const userForSession: User = { name: newUserForDb.name, email: newUserForDb.email, role: newUserForDb.role, classCode: newUserForDb.classCode, imageUrl: newUserForDb.imageUrl };
    localStorage.setItem('user', JSON.stringify(userForSession));
    return userForSession;
};

export const logout = () => {
    localStorage.removeItem('user');
};

export const joinClass = async (userEmail: string, classCode: string): Promise<User> => {
    await delay(SIMULATED_DELAY);
    const classrooms = db.getClassrooms();
    const users = db.getUsers();
    if (!classrooms.some(c => c.code === classCode)) {
        throw new Error('Invalid class code. Please check with your teacher.');
    }
    let updatedUserForDb: DBUser | null = null;
    const updatedUsers = users.map(u => {
        if (u.email === userEmail) {
            updatedUserForDb = { ...u, classCode };
            return updatedUserForDb;
        }
        return u;
    });
    if (!updatedUserForDb) {
        throw new Error('User not found.');
    }
    db.saveUsers(updatedUsers);
    const userForSession: User = { name: updatedUserForDb.name, email: updatedUserForDb.email, role: updatedUserForDb.role, classCode: updatedUserForDb.classCode };
    localStorage.setItem('user', JSON.stringify(userForSession));
    return userForSession;
};


export const joinClassParent = async (parentEmail: string, classCode: string, studentEmail: string): Promise<User> => {
    await delay(SIMULATED_DELAY);
    const classrooms = db.getClassrooms();
    const users = db.getUsers();
    
    if (!classrooms.some(c => c.code === classCode)) {
        throw new Error('Invalid class code. Please check with the teacher.');
    }

    // Verify student exists and belongs to the class
    const student = users.find(u => u.email === studentEmail && u.role === 'student' && u.classCode === classCode);
    if (!student) {
        throw new Error(`Student with email ${studentEmail} not found in this class.`);
    }

    let updatedUserForDb: DBUser | null = null;
    const updatedUsers = users.map(u => {
        if (u.email === parentEmail) {
            updatedUserForDb = { ...u, classCode, studentEmail };
            return updatedUserForDb;
        }
        return u;
    });

    if (!updatedUserForDb) throw new Error('Parent user not found.');
    
    db.saveUsers(updatedUsers);
    const userForSession: User = { 
        name: updatedUserForDb.name, 
        email: updatedUserForDb.email, 
        role: updatedUserForDb.role, 
        classCode: updatedUserForDb.classCode,
        studentEmail: updatedUserForDb.studentEmail
    };
    localStorage.setItem('user', JSON.stringify(userForSession));
    return userForSession;
};

export const fetchParentDashboardData = async (studentEmail: string, classCode: string): Promise<DashboardData> => {
    await delay(SIMULATED_DELAY);
    // We basically want the student's view but with possibly more/different data.
    // However, buildDashboardData already does heavy lifting.
    // We can simulate a student user object to reuse that logic.
    const mockStudent: User = {
        name: 'Mock',
        email: studentEmail,
        role: 'student',
        classCode: classCode
    };
    return buildDashboardData(mockStudent);
};

const quizService = createCrudService<Quiz>(db.getQuizzes, db.saveQuizzes);
export const addQuiz = quizService.add;
export const updateQuiz = quizService.update;
export const deleteQuiz = quizService.delete;

const sharedContentService = createCrudService<SharedContent>(db.getSharedContent, db.saveSharedContent);
export const addSharedContent = sharedContentService.add;
export const updateSharedContent = sharedContentService.update;
export const deleteSharedContent = sharedContentService.delete;

const lectureService = createCrudService<GeneratedLecture>(db.getGeneratedLectures, db.saveGeneratedLectures);
export const addGeneratedLecture = lectureService.add;
export const updateGeneratedLecture = lectureService.update;

const caseStudyService = createCrudService<CaseStudy>(db.getGeneratedCaseStudies, db.saveGeneratedCaseStudies);
export const addGeneratedCaseStudy = caseStudyService.add;
export const updateGeneratedCaseStudy = caseStudyService.update;

const animationService = createCrudService<AnimationScript>(db.getAnimationScripts, db.saveAnimationScripts);
export const addAnimationScript = animationService.add;
export const updateAnimationScript = animationService.update;
export const deleteAnimationScript = animationService.delete;
export const fetchAnimationScripts = async (classCode: string) => { await delay(100); return db.getAnimationScripts().filter(a => a.classCode === classCode); };

const resourceHubService = createCrudService<SavedResourceHub>(db.getResourceHubs, db.saveResourceHubs);
export const addResourceHub = resourceHubService.add;
export const updateResourceHub = resourceHubService.update;
export const deleteResourceHub = resourceHubService.delete;
export const fetchResourceHubs = async (classCode: string) => { await delay(100); return db.getResourceHubs().filter(a => a.classCode === classCode); };

export const addSubmission = async (submission: Omit<Submission, 'submittedAt'>): Promise<Submission> => {
    await delay(SIMULATED_DELAY);
    const submissions = db.getSubmissions();
    const newSubmission = { ...submission, submittedAt: nowIso() };
    db.saveSubmissions([...submissions, newSubmission]);
    return newSubmission;
};

export const startAttendanceSession = async (teacher: User, classCode: string, durationMinutes = ATTENDANCE_WINDOW_MINUTES): Promise<AttendanceSession> => {
    ensureTeacher(teacher);
    ensureSameClass(teacher, classCode);

    const response = await fetch('/api/attendance/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode, teacherEmail: teacher.email, durationMinutes })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start attendance session');
    }
    const session: AttendanceSession = await response.json();
    db.saveAttendanceSessions([...db.getAttendanceSessions(), session]);
    return session;
};

export const stopAttendanceSession = async (teacher: User, sessionId: string): Promise<AttendanceSession> => {
    ensureTeacher(teacher);

    const response = await fetch('/api/attendance/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to stop attendance session');
    }
    const session: AttendanceSession = await response.json();
    db.saveAttendanceSessions(db.getAttendanceSessions().map(s => s.id === (session as any).id ? session : s));
    return session;
};

export const submitAttendance = async (
    student: User,
    classCode: string,
    submittedValue: string,
    method: 'face_matching' | 'manual' = 'face_matching'
): Promise<AttendanceSession> => {
    ensureStudent(student);
    ensureSameClass(student, classCode);

    const response = await fetch('/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            classCode,
            studentName: student.name,
            studentEmail: student.email,
            submittedValue,
            method
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit attendance');
    }
    const session: AttendanceSession = await response.json();
    db.saveAttendanceSessions(db.getAttendanceSessions().map(s => s.id === (session as any).id ? session : s));
    return session;
};

export const addAttendanceRecord = async (classCode: string, record: AttendanceRecord): Promise<AttendanceSession[]> => {
    await delay(SIMULATED_DELAY);
    const sessions = db.getAttendanceSessions();
    const updatedSessions = sessions.map(session => {
        const normalized = normalizeAttendanceSession(session);
        if (normalized.isActive && normalized.classCode === classCode && !normalized.records.some(r => r.studentName === record.studentName)) {
            return { ...normalized, records: [...normalized.records, record] };
        }
        return normalized;
    });
    db.saveAttendanceSessions(updatedSessions);
    return updatedSessions;
};

export const setAssistanceDisabled = async (classCode: string, disabled: boolean): Promise<void> => {
    await delay(SIMULATED_DELAY);
    const classrooms = db.getClassrooms();
    db.saveClassrooms(classrooms.map(c => c.code === classCode ? { ...c, assistanceDisabled: disabled } : c));
};

export const addVideoLecture = async (
    teacher: User,
    lectureData: Omit<VideoLecture, 'id' | 'uploadedAt' | 'completions'>
): Promise<VideoLecture> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);
    ensureSameClass(teacher, lectureData.classCode);

    const newLecture: VideoLecture = {
        ...lectureData,
        id: crypto.randomUUID(),
        uploadedAt: nowIso(),
        completions: [],
        notes: lectureData.notes || createLectureNotesFallback(lectureData.topic, lectureData.transcript),
        status: lectureData.status || 'draft',
    };

    db.saveVideoLectures([...db.getVideoLectures(), newLecture]);
    return newLecture;
};

export const updateVideoLecture = async (teacher: User, lecture: VideoLecture): Promise<VideoLecture> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);
    ensureSameClass(teacher, lecture.classCode);
    db.saveVideoLectures(db.getVideoLectures().map(item => item.id === lecture.id ? lecture : item));
    return lecture;
};

export const deleteVideoLecture = async (lectureId: string): Promise<void> => {
    await delay(SIMULATED_DELAY);
    db.saveVideoLectures(db.getVideoLectures().filter(item => item.id !== lectureId));
};

export const saveStudentLecturePreference = async (
    student: User,
    preferredLanguage: LectureLanguagePreference
): Promise<StudentLecturePreference> => {
    await delay(SIMULATED_DELAY);
    ensureStudent(student);
    if (!student.classCode) {
        throw new Error('Join a classroom to save lecture language preferences.');
    }

    const preferences = db.getStudentLecturePreferences();
    const updatedPreference: StudentLecturePreference = {
        studentEmail: student.email,
        classCode: student.classCode,
        preferredLanguage,
        updatedAt: nowIso(),
    };

    const existingIndex = preferences.findIndex(pref => pref.studentEmail === student.email && pref.classCode === student.classCode);
    if (existingIndex >= 0) {
        preferences[existingIndex] = updatedPreference;
    } else {
        preferences.push(updatedPreference);
    }

    db.saveStudentLecturePreferences(preferences);
    return updatedPreference;
};

export const getStudentLecturePreference = async (student: User): Promise<StudentLecturePreference | null> => {
    await delay(SIMULATED_DELAY);
    ensureStudent(student);
    if (!student.classCode) {
        return null;
    }
    return db.getStudentLecturePreferences().find(pref => pref.studentEmail === student.email && pref.classCode === student.classCode) || null;
};

export const updateLectureProgress = async (
    student: User,
    lectureId: string,
    progressPercent: number
): Promise<LectureCompletion> => {
    await delay(SIMULATED_DELAY);
    ensureStudent(student);

    let completionRecord: LectureCompletion | undefined;
    const lectures = db.getVideoLectures().map(lecture => {
        if (lecture.id !== lectureId) {
            return lecture;
        }
        ensureSameClass(student, lecture.classCode);
        const normalizedProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));
        const existing = lecture.completions.find(entry => entry.studentEmail === student.email);
        const completed = normalizedProgress >= LECTURE_COMPLETION_THRESHOLD;
        completionRecord = {
            studentEmail: student.email,
            studentName: student.name,
            progressPercent: normalizedProgress,
            completed,
            unlockedAt: completed ? (existing?.unlockedAt || nowIso()) : existing?.unlockedAt,
            lastWatchedAt: nowIso(),
        };

        const completions = existing
            ? lecture.completions.map(entry => entry.studentEmail === student.email ? completionRecord! : entry)
            : [...lecture.completions, completionRecord];

        return { ...lecture, completions };
    });

    if (!completionRecord) {
        throw new Error('Lecture not found.');
    }

    db.saveVideoLectures(lectures);
    return completionRecord;
};

export const addLectureQuiz = async (
    teacher: User,
    lectureId: string,
    quizData: Omit<Quiz, 'id' | 'classCode' | 'lectureId' | 'createdAt' | 'generatedFrom'>
): Promise<Quiz> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);

    const lecture = db.getVideoLectures().find(item => item.id === lectureId);
    if (!lecture) {
        throw new Error('Lecture not found.');
    }
    ensureSameClass(teacher, lecture.classCode);

    const quiz: Quiz = {
        ...quizData,
        id: crypto.randomUUID(),
        classCode: lecture.classCode,
        lectureId,
        createdAt: nowIso(),
        generatedFrom: 'lecture',
        status: (quizData as any).status || 'draft',
    };

    db.saveQuizzes([...db.getQuizzes(), quiz]);
    db.saveVideoLectures(db.getVideoLectures().map(item => item.id === lectureId ? { ...item, generatedQuizId: quiz.id } : item));
    return quiz;
};

const examPaperService = createCrudService<ExamPaper>(db.getExamPapers, db.saveExamPapers);
export const addExamPaper = examPaperService.add;
export const updateExamPaper = examPaperService.update;
export const deleteExamPaper = examPaperService.delete;

const lessonPlanService = createCrudService<LessonPlan>(db.getLessonPlans, db.saveLessonPlans);
export const addLessonPlan = lessonPlanService.add;
export const deleteLessonPlan = lessonPlanService.delete;

const curriculumPlanService = createCrudService<CurriculumPlan>(db.getCurriculumPlans, db.saveCurriculumPlans);
export const addCurriculumPlan = curriculumPlanService.add;
export const deleteCurriculumPlan = curriculumPlanService.delete;

export const addCurriculumItem = async (
    teacher: User,
    itemData: Omit<CurriculumItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'publishedAt'>
): Promise<CurriculumItem> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);
    ensureSameClass(teacher, itemData.classCode);

    const item: CurriculumItem = {
        ...itemData,
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        status: 'draft',
    };

    db.saveCurriculumItems([...db.getCurriculumItems(), item]);
    return item;
};

export const updateCurriculumItem = async (
    teacher: User,
    itemId: string,
    updates: Partial<Pick<CurriculumItem, 'title' | 'description' | 'content'>>
): Promise<CurriculumItem> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);

    let updatedItem: CurriculumItem | undefined;
    const items = db.getCurriculumItems().map(item => {
        if (item.id !== itemId) {
            return item;
        }
        ensureSameClass(teacher, item.classCode);
        updatedItem = {
            ...item,
            ...updates,
            updatedAt: nowIso(),
        };
        return updatedItem;
    });

    if (!updatedItem) {
        throw new Error('Curriculum item not found.');
    }

    db.saveCurriculumItems(items);
    return updatedItem;
};

export const setCurriculumItemStatus = async (
    teacher: User,
    itemId: string,
    status: CurriculumStatus
): Promise<CurriculumItem> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);

    let updatedItem: CurriculumItem | undefined;
    const items = db.getCurriculumItems().map(item => {
        if (item.id !== itemId) {
            return item;
        }
        ensureSameClass(teacher, item.classCode);
        updatedItem = {
            ...item,
            status,
            updatedAt: nowIso(),
            publishedAt: status === 'published' ? (item.publishedAt || nowIso()) : undefined,
        };
        return updatedItem;
    });

    if (!updatedItem) {
        throw new Error('Curriculum item not found.');
    }

    db.saveCurriculumItems(items);
    return updatedItem;
};

export const deleteCurriculumItem = async (teacher: User, itemId: string): Promise<void> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);
    const item = db.getCurriculumItems().find(curriculumItem => curriculumItem.id === itemId);
    if (!item) {
        throw new Error('Curriculum item not found.');
    }
    ensureSameClass(teacher, item.classCode);
    db.saveCurriculumItems(db.getCurriculumItems().filter(curriculumItem => curriculumItem.id !== itemId));
};

export const getRealtimeSnapshot = async (user: User): Promise<DashboardData> => {
    await delay(100);
    return buildDashboardData(user);
};

const assignmentService = createCrudService<Assignment>(db.getAssignments, db.saveAssignments);
export const addAssignment = assignmentService.add;
export const updateAssignment = assignmentService.update;
export const deleteAssignment = assignmentService.delete;

export const addAssignmentSubmission = async (submission: Omit<AssignmentSubmission, 'id' | 'submittedAt'>): Promise<AssignmentSubmission> => {
    await delay(SIMULATED_DELAY);
    const submissions = db.getAssignmentSubmissions();
    const newSubmission: AssignmentSubmission = {
        ...submission,
        id: crypto.randomUUID(),
        submittedAt: nowIso(),
    };
    db.saveAssignmentSubmissions([...submissions, newSubmission]);
    return newSubmission;
};

export const updateAssignmentSubmission = async (teacher: User, submissionId: string, score: number, aiFeedback?: string): Promise<AssignmentSubmission> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);
    let updated: AssignmentSubmission | undefined;
    const items = db.getAssignmentSubmissions().map(s => {
        if (s.id === submissionId) {
            updated = { ...s, score, aiFeedback };
            return updated;
        }
        return s;
    });
    if (!updated) throw new Error('Submission not found');
    db.saveAssignmentSubmissions(items);
    return updated;
};

// Generic status updates
export const setContentStatus = async <T extends { id: string; status?: CurriculumStatus; classCode: string }>(
    teacher: User,
    itemId: string,
    status: CurriculumStatus,
    getter: () => T[],
    setter: (items: T[]) => void
): Promise<T> => {
    await delay(SIMULATED_DELAY);
    ensureTeacher(teacher);
    let updatedItem: T | undefined;
    const items = getter().map(item => {
        if (item.id === itemId) {
            ensureSameClass(teacher, item.classCode);
            updatedItem = { ...item, status };
            return updatedItem;
        }
        return item;
    });
    if (!updatedItem) throw new Error('Item not found');
    setter(items);
    return updatedItem;
};

export const setQuizStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getQuizzes, db.saveQuizzes);
export const setGeneratedLectureStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getGeneratedLectures, db.saveGeneratedLectures);
export const setVideoLectureStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getVideoLectures, db.saveVideoLectures);
export const setExamPaperStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getExamPapers, db.saveExamPapers);
export const setLessonPlanStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getLessonPlans, db.saveLessonPlans);
export const setAssignmentStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getAssignments, db.saveAssignments);
export const setCurriculumPlanStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getCurriculumPlans, db.saveCurriculumPlans);
export const setSharedContentStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getSharedContent, db.saveSharedContent);
export const setCaseStudyStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getGeneratedCaseStudies, db.saveGeneratedCaseStudies);
export const setAnimationScriptStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getAnimationScripts, db.saveAnimationScripts);
export const setResourceHubStatus = (teacher: User, id: string, status: CurriculumStatus) => setContentStatus(teacher, id, status, db.getResourceHubs, db.saveResourceHubs);

export const deleteGeneratedLecture = async (id: string): Promise<void> => {
    await delay(SIMULATED_DELAY);
    const items = db.getGeneratedLectures().filter(item => item.id !== id);
    db.saveGeneratedLectures(items);
};

export const deleteCaseStudy = async (id: string): Promise<void> => {
    await delay(SIMULATED_DELAY);
    const items = db.getGeneratedCaseStudies().filter(item => item.id !== id);
    db.saveGeneratedCaseStudies(items);
};

export const addStudentPerformance = async (performance: Omit<StudentPerformance, 'id' | 'timestamp'>): Promise<StudentPerformance> => {
    await delay(SIMULATED_DELAY);
    const performances = db.getStudentPerformance();
    const newPerformance: StudentPerformance = {
        ...performance,
        id: crypto.randomUUID(),
        timestamp: nowIso(),
    };
    db.saveStudentPerformance([...performances, newPerformance]);
    return newPerformance;
};


export const getStudentPerformanceByEmail = async (email: string): Promise<StudentPerformance[]> => {
    await delay(SIMULATED_DELAY);
    return db.getStudentPerformance().filter(p => p.studentEmail === email);
};

export const fetchDashboardData = async (user: User): Promise<DashboardData & { studentPerformance: StudentPerformance[] }> => {
    await delay(SIMULATED_DELAY);
    const baseData = buildDashboardData(user);
    const studentPerformance = await getStudentPerformanceByEmail(user.email);
    return { ...baseData, studentPerformance };
};

// --- VIDYA AI METHODS ---

export const processVidyaLecture = async (topic: string, sourceType: string, sourceUrl?: string, language: string = 'English') => {
    const response = await fetch('/api/vidya/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, sourceType, sourceUrl, language })
    });
    if (!response.ok) throw new Error('Failed to process Vidya AI lecture');
    return await response.json();
};

export const translateVidyaContent = async (text: string, targetLanguage: string) => {
    const response = await fetch('/api/vidya/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage })
    });
    if (!response.ok) throw new Error('Failed to translate content');
    return await response.json();
};

export const generateVidyaPPT = async (topic: string, language: string = 'English') => {
    const response = await fetch('/api/vidya/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language })
    });
    if (!response.ok) throw new Error('Failed to generate PPT');
    return await response.json();
};