import { AttendanceSession, CaseStudy, Classroom, CurriculumItem, CurriculumPlan, DBUser, ExamPaper, GeneratedLecture, LessonPlan, Quiz, SharedContent, StudentLecturePreference, Submission, VideoLecture, Assignment, AssignmentSubmission, StudentPerformance } from './types';

const DB_KEYS = {
    users: 'allUsers',
    classrooms: 'classrooms',
    quizzes: 'quizzes',
    submissions: 'studentSubmissions',
    sharedContent: 'sharedContent',
    generatedLectures: 'generatedLectures',
    generatedCaseStudies: 'generatedCaseStudies',
    attendanceSessions: 'attendanceSessions',
    videoLectures: 'videoLectures',
    examPapers: 'examPapers',
    lessonPlans: 'lessonPlans',
    curriculumPlans: 'curriculumPlans',
    curriculumItems: 'curriculumItems',
    studentLecturePreferences: 'studentLecturePreferences',
    assignments: 'assignments',
    assignmentSubmissions: 'assignmentSubmissions',
    studentPerformance: 'studentPerformance',
    animationScripts: 'animationScripts',
    resourceHubs: 'resourceHubs',
    syncVersion: 'mockRealtimeSyncVersion',
    lastSyncedAt: 'mockRealtimeLastSyncedAt',
} as const;

const getFromDB = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error);
        return defaultValue;
    }
};

const saveToDB = <T>(key: string, data: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        touchSyncMetadata();
    } catch (error) {
        console.error(`Error writing to localStorage key "${key}":`, error);
        throw new Error(`Failed to save data. Your browser's storage might be full.`);
    }
};

const readNumber = (key: string, defaultValue: number): number => {
    const raw = localStorage.getItem(key);
    const parsed = raw ? Number(raw) : defaultValue;
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const touchSyncMetadata = () => {
    const nextVersion = readNumber(DB_KEYS.syncVersion, 0) + 1;
    const now = new Date().toISOString();
    localStorage.setItem(DB_KEYS.syncVersion, String(nextVersion));
    localStorage.setItem(DB_KEYS.lastSyncedAt, now);
};

export const getSyncMetadata = () => ({
    syncVersion: readNumber(DB_KEYS.syncVersion, 0),
    lastSyncedAt: localStorage.getItem(DB_KEYS.lastSyncedAt) || new Date(0).toISOString(),
});

export const getUsers = () => getFromDB<DBUser[]>(DB_KEYS.users, []);
export const saveUsers = (users: DBUser[]) => saveToDB(DB_KEYS.users, users);

export const getClassrooms = () => getFromDB<Classroom[]>(DB_KEYS.classrooms, []);
export const saveClassrooms = (classrooms: Classroom[]) => saveToDB(DB_KEYS.classrooms, classrooms);

export const getQuizzes = () => getFromDB<Quiz[]>(DB_KEYS.quizzes, []);
export const saveQuizzes = (quizzes: Quiz[]) => saveToDB(DB_KEYS.quizzes, quizzes);

export const getSubmissions = () => getFromDB<Submission[]>(DB_KEYS.submissions, []);
export const saveSubmissions = (submissions: Submission[]) => saveToDB(DB_KEYS.submissions, submissions);

export const getSharedContent = () => getFromDB<SharedContent[]>(DB_KEYS.sharedContent, []);
export const saveSharedContent = (content: SharedContent[]) => saveToDB(DB_KEYS.sharedContent, content);

export const getGeneratedLectures = () => getFromDB<GeneratedLecture[]>(DB_KEYS.generatedLectures, []);
export const saveGeneratedLectures = (lectures: GeneratedLecture[]) => saveToDB(DB_KEYS.generatedLectures, lectures);

export const getGeneratedCaseStudies = () => getFromDB<CaseStudy[]>(DB_KEYS.generatedCaseStudies, []);
export const saveGeneratedCaseStudies = (studies: CaseStudy[]) => saveToDB(DB_KEYS.generatedCaseStudies, studies);

export const getAttendanceSessions = () => getFromDB<AttendanceSession[]>(DB_KEYS.attendanceSessions, []);
export const saveAttendanceSessions = (sessions: AttendanceSession[]) => saveToDB(DB_KEYS.attendanceSessions, sessions);

export const getVideoLectures = () => getFromDB<VideoLecture[]>(DB_KEYS.videoLectures, []);
export const saveVideoLectures = (lectures: VideoLecture[]) => saveToDB(DB_KEYS.videoLectures, lectures);

export const getExamPapers = () => getFromDB<ExamPaper[]>(DB_KEYS.examPapers, []);
export const saveExamPapers = (papers: ExamPaper[]) => saveToDB(DB_KEYS.examPapers, papers);

export const getLessonPlans = () => getFromDB<LessonPlan[]>(DB_KEYS.lessonPlans, []);
export const saveLessonPlans = (plans: LessonPlan[]) => saveToDB(DB_KEYS.lessonPlans, plans);

export const getCurriculumPlans = () => getFromDB<CurriculumPlan[]>(DB_KEYS.curriculumPlans, []);
export const saveCurriculumPlans = (plans: CurriculumPlan[]) => saveToDB(DB_KEYS.curriculumPlans, plans);

export const getCurriculumItems = () => getFromDB<CurriculumItem[]>(DB_KEYS.curriculumItems, []);
export const saveCurriculumItems = (items: CurriculumItem[]) => saveToDB(DB_KEYS.curriculumItems, items);

export const getStudentLecturePreferences = () => getFromDB<StudentLecturePreference[]>(DB_KEYS.studentLecturePreferences, []);
export const saveStudentLecturePreferences = (preferences: StudentLecturePreference[]) => saveToDB(DB_KEYS.studentLecturePreferences, preferences);

export const getAssignments = () => getFromDB<Assignment[]>(DB_KEYS.assignments, []);
export const saveAssignments = (assignments: Assignment[]) => saveToDB(DB_KEYS.assignments, assignments);

export const getAssignmentSubmissions = () => getFromDB<AssignmentSubmission[]>(DB_KEYS.assignmentSubmissions, []);
export const saveAssignmentSubmissions = (submissions: AssignmentSubmission[]) => saveToDB(DB_KEYS.assignmentSubmissions, submissions);

export const getStudentPerformance = () => getFromDB<StudentPerformance[]>(DB_KEYS.studentPerformance, []);
export const saveStudentPerformance = (performance: StudentPerformance[]) => saveToDB(DB_KEYS.studentPerformance, performance);
export const getAnimationScripts = () => getFromDB<any[]>(DB_KEYS.animationScripts, []);
export const saveAnimationScripts = (scripts: any[]) => saveToDB(DB_KEYS.animationScripts, scripts);

export const getResourceHubs = () => getFromDB<any[]>(DB_KEYS.resourceHubs, []);
export const saveResourceHubs = (hubs: any[]) => saveToDB(DB_KEYS.resourceHubs, hubs);
