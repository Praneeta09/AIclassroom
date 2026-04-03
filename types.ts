export type Role = 'teacher' | 'student';
export type SupportedLectureLanguage = 'English' | 'Hindi' | 'Marathi';
export type SupportedBilingualMode = 'English+Hindi' | 'English+Marathi';
export type LectureLanguagePreference = SupportedLectureLanguage | SupportedBilingualMode;
export type LectureSourceType = 'video' | 'youtube' | 'transcript';
export type CurriculumStatus = 'draft' | 'published';
export type AttendanceSubmissionMethod = 'face_matching' | 'manual';

export interface Classroom {
  code: string;
  teacherEmail: string;
  assistanceDisabled?: boolean;
}

export interface User {
  name: string;
  email: string;
  role: Role;
  classCode?: string;
  imageUrl?: string;
}

export interface Question {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Quiz {
  id: string;
  topic: string;
  questions: Question[];
  classCode: string;
  lectureId?: string;
  createdAt?: string;
  generatedFrom?: 'manual' | 'lecture';
  status?: CurriculumStatus;
}

export interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
}

export interface Submission {
  quizId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  submittedAt: string;
  classCode: string;
  lectureId?: string;
}

export type SharedContentType = 'text' | 'file' | 'image';

export interface SharedContent {
  id: string;
  type: SharedContentType;
  title: string;
  description: string;
  content?: string;
  fileData?: string;
  fileName?: string;
  mimeType?: string;
  classCode: string;
}

export interface LectureSlide {
  title: string;
  points: string[];
}

export interface GeneratedLecture {
  id: string;
  topic: string;
  slides: LectureSlide[];
  classCode: string;
  status?: CurriculumStatus;
}

export interface CaseStudy {
  id: string;
  title: string;
  introduction: string;
  problem: string;
  solution: string;
  conclusion: string;
  classCode: string;
  status?: CurriculumStatus;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface AttendanceRecord {
  studentName: string;
  studentEmail?: string;
  timestamp: string;
  method?: AttendanceSubmissionMethod;
  submittedValue?: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  isActive: boolean;
  records: AttendanceRecord[];
  classCode: string;
  faceVerificationRequired?: boolean;
  startedAt?: string;
  endsAt?: string;
  status?: 'active' | 'stopped' | 'expired';
}

export interface LectureDefinition {
  term: string;
  meaning: string;
}

export interface LectureNotes {
  summary: string;
  keyPoints: string[];
  definitions: LectureDefinition[];
  slides: LectureSlide[];
}

export interface LectureCompletion {
  studentEmail: string;
  studentName: string;
  progressPercent: number;
  completed: boolean;
  unlockedAt?: string;
  lastWatchedAt: string;
}

export interface StudentLecturePreference {
  studentEmail: string;
  classCode: string;
  preferredLanguage: LectureLanguagePreference;
  updatedAt: string;
}

export interface VideoLecture {
  id: string;
  topic: string;
  transcript: string;
  notes: LectureNotes;
  uploadedAt: string;
  classCode: string;
  sourceType: LectureSourceType;
  sourceUrl?: string;
  fileData?: string;
  fileName?: string;
  mimeType?: string;
  completions: LectureCompletion[];
  generatedQuizId?: string;
  status?: CurriculumStatus;
}

export interface ExamQuestion {
  questionText: string;
  marks: number;
  answer?: string;
  isCustom?: boolean;
}

export interface ExamSection {
  title: string;
  instructions?: string;
  questions: ExamQuestion[];
}

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  instructions: string;
  duration: string;
  totalMarks: number;
  sections: ExamSection[];
  classCode: string;
  createdAt: string;
  status?: CurriculumStatus;
}

export interface LessonSegment {
  startMin: number;
  endMin: number;
  title: string;
  activity: string;
  mode: 'both' | 'online' | 'offline';
  tools: string[];
}

export interface LessonPlan {
  id: string;
  topic: string;
  onlineCount: number;
  offlineCount: number;
  totalDuration: number;
  segments: LessonSegment[];
  classCode: string;
  createdAt: string;
  status?: CurriculumStatus;
}

export interface CurriculumTopic {
  name: string;
  demandScore: number;
  growthTrend: 'rising' | 'stable' | 'declining';
  jobRoles: string[];
}

export interface CurriculumPlan {
  id: string;
  domain: string;
  generatedAt: string;
  topics: CurriculumTopic[];
  learningPath: string[];
  classCode: string;
  status?: CurriculumStatus;
  title?: string;
  description?: string;
  updatedAt?: string;
}

export interface CurriculumItem {
  id: string;
  title: string;
  description: string;
  content: string;
  classCode: string;
  createdAt: string;
  updatedAt: string;
  status: CurriculumStatus;
  publishedAt?: string;
}

export interface Assignment {
  id: string;
  title?: string;
  topic?: string;
  description?: string;
  instructions?: string;
  totalPoints?: number;
  dueDate: string;
  classCode: string;
  attachmentUrl?: string;
  aiGradingEnabled?: boolean;
  createdAt: string;
  status?: CurriculumStatus;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentEmail: string;
  studentName: string;
  content: string;
  attachmentUrl?: string;
  submittedAt: string;
  score?: number;
  aiFeedback?: string;
}

export interface DashboardData {
  allUsers: User[];
  classrooms: Classroom[];
  quizzes: Quiz[];
  studentSubmissions: Submission[];
  sharedContent: SharedContent[];
  generatedLectures: GeneratedLecture[];
  generatedCaseStudies: CaseStudy[];
  attendanceSessions: AttendanceSession[];
  videoLectures: VideoLecture[];
  examPapers: ExamPaper[];
  lessonPlans: LessonPlan[];
  curriculumPlans: CurriculumPlan[];
  curriculumItems: CurriculumItem[];
  studentLecturePreferences: StudentLecturePreference[];
  assistanceDisabled: boolean;
  syncVersion: number;
  lastSyncedAt: string;
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
}