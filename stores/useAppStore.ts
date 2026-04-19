import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---- Types ----
interface QuizSessionState {
  currentQuizId: string | null;
  currentQuestionIndex: number;
  answers: Record<number, number | null>;
  isCompleted: boolean;
}

interface PptState {
  topic: string;
  slides: any[];
  generatedAt: string | null;
}

interface NotesState {
  topic: string;
  notes: string;
  notesHindi: string;
  notesMarathi: string;
  language: string;
  generatedAt: string | null;
}

interface VidyaSavedNote {
  id: string;
  topic: string;
  language: string;
  notes: string;
  notesHindi?: string;
  notesMarathi?: string;
  timestamp: string;
}

interface AppStore {
  // --- Active Page ---
  teacherActivePage: string;
  studentActivePage: string;
  setTeacherActivePage: (page: string) => void;
  setStudentActivePage: (page: string) => void;

  // --- Quiz Session (student taking quiz) ---
  quizSession: QuizSessionState;
  setQuizSession: (session: Partial<QuizSessionState>) => void;
  resetQuizSession: () => void;

  // --- PPT / Content Generator ---
  pptState: PptState;
  setPptState: (state: Partial<PptState>) => void;
  resetPptState: () => void;

  // --- Notes ---
  notesState: NotesState;
  setNotesState: (state: Partial<NotesState>) => void;
  resetNotesState: () => void;

  // --- Vidya AI ---
  vidyaResult: { notes: string; notesHindi: string; notesMarathi: string } | null;
  vidyaTopic: string;
  vidyaLanguage: string;
  vidyaSavedNotes: VidyaSavedNote[];
  setVidyaResult: (result: { notes: string; notesHindi: string; notesMarathi: string } | null) => void;
  setVidyaTopic: (topic: string) => void;
  setVidyaLanguage: (lang: string) => void;
  setVidyaSavedNotes: (notes: VidyaSavedNote[]) => void;
  addVidyaSavedNote: (note: VidyaSavedNote) => void;
  deleteVidyaSavedNote: (id: string) => void;

  // --- User Preferences ---
  preferredLanguage: string;
  setPreferredLanguage: (lang: string) => void;

  // --- Doubt Solver Conversation ---
  doubtConversation: { sender: string; text: string }[];
  addDoubtMessage: (msg: { sender: string; text: string }) => void;
  clearDoubtConversation: () => void;
}

const defaultQuizSession: QuizSessionState = {
  currentQuizId: null,
  currentQuestionIndex: 0,
  answers: {},
  isCompleted: false,
};

const defaultPptState: PptState = {
  topic: '',
  slides: [],
  generatedAt: null,
};

const defaultNotesState: NotesState = {
  topic: '',
  notes: '',
  notesHindi: '',
  notesMarathi: '',
  language: 'English',
  generatedAt: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Active pages
      teacherActivePage: 'home',
      studentActivePage: 'home',
      setTeacherActivePage: (page) => set({ teacherActivePage: page }),
      setStudentActivePage: (page) => set({ studentActivePage: page }),

      // Quiz session
      quizSession: defaultQuizSession,
      setQuizSession: (session) => set((s) => ({ quizSession: { ...s.quizSession, ...session } })),
      resetQuizSession: () => set({ quizSession: defaultQuizSession }),

      // PPT
      pptState: defaultPptState,
      setPptState: (state) => set((s) => ({ pptState: { ...s.pptState, ...state } })),
      resetPptState: () => set({ pptState: defaultPptState }),

      // Notes
      notesState: defaultNotesState,
      setNotesState: (state) => set((s) => ({ notesState: { ...s.notesState, ...state } })),
      resetNotesState: () => set({ notesState: defaultNotesState }),

      // Vidya AI
      vidyaResult: null,
      vidyaTopic: '',
      vidyaLanguage: 'English',
      vidyaSavedNotes: [],
      setVidyaResult: (result) => set({ vidyaResult: result }),
      setVidyaTopic: (topic) => set({ vidyaTopic: topic }),
      setVidyaLanguage: (lang) => set({ vidyaLanguage: lang }),
      setVidyaSavedNotes: (notes) => set({ vidyaSavedNotes: notes }),
      addVidyaSavedNote: (note) => set((s) => ({ vidyaSavedNotes: [note, ...s.vidyaSavedNotes.slice(0, 19)] })),
      deleteVidyaSavedNote: (id) => set((s) => ({ vidyaSavedNotes: s.vidyaSavedNotes.filter((n) => n.id !== id) })),

      // User preferences
      preferredLanguage: 'English',
      setPreferredLanguage: (lang) => set({ preferredLanguage: lang }),

      // Doubt solver conversation
      doubtConversation: [],
      addDoubtMessage: (msg) => set((s) => ({ doubtConversation: [...s.doubtConversation, msg] })),
      clearDoubtConversation: () => set({ doubtConversation: [] }),
    }),
    {
      name: 'ai-classroom-store',
      partialize: (state) => ({
        teacherActivePage: state.teacherActivePage,
        studentActivePage: state.studentActivePage,
        quizSession: state.quizSession,
        pptState: state.pptState,
        notesState: state.notesState,
        vidyaResult: state.vidyaResult,
        vidyaTopic: state.vidyaTopic,
        vidyaLanguage: state.vidyaLanguage,
        vidyaSavedNotes: state.vidyaSavedNotes,
        preferredLanguage: state.preferredLanguage,
        doubtConversation: state.doubtConversation,
      }),
    }
  )
);
