/**
 * commandRouter.ts — Voice Command → Action Router
 * Maps recognized speech commands to actions for each role
 */

import type { Role } from '../types';
import type { TTSLanguage } from './useTTS';

export interface VoiceActions {
  // Navigation
  navigate: (page: string) => void;
  // Teacher
  triggerGenerateQuiz?: (topic: string) => void;
  triggerGeneratePPT?: (topic: string) => void;
  triggerDownloadPPT?: () => void;
  // Student
  startQuiz?: () => void;
  selectOption?: (optionIndex: number) => void; // 0=A,1=B,2=C,3=D
  nextQuestion?: () => void;
  submitQuiz?: () => void;
  // Parent
  readSummary?: () => void;
  downloadReport?: () => void;
  // Universal
  readPage?: () => void;
  repeat?: () => void;
  stop?: () => void;
  speakHelp?: () => void;
}

export type CommandResult =
  | { handled: true; feedback: string }
  | { handled: false };

// Normalize: trim, lowercase, remove punctuation
function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?'"]/g, '').trim();
}

// Extract topic from "create ppt on [topic]" / "generate quiz on [topic]"
function extractTopic(text: string, trigger: string): string | null {
  const idx = text.indexOf(trigger);
  if (idx === -1) return null;
  const after = text.slice(idx + trigger.length).trim();
  return after.length > 0 ? after : null;
}

// Hindi & Marathi keyword maps
const MULTILANG_STOP = ['रुको', 'बंद करो', 'थांब', 'बंद'];
const MULTILANG_HELP = ['सहायता', 'मदत', 'मदद'];
const MULTILANG_REPEAT = ['दोहराओ', 'परत सांग', 'फिर से'];

const HELP_COMMANDS: Record<Role, string[]> = {
  teacher: [
    '"Open Quiz" — Go to Quiz Generation',
    '"Open Notes" — Go to Academic Notes',
    '"Open Analytics" — Go to Eklavya Analytics',
    '"Open Dashboard" — Go to Home',
    '"Generate quiz on [topic]" — Create a quiz',
    '"Create PPT on [topic]" — Make a presentation',
    '"Download PPT" — Save the presentation',
    '"Read page" — Read page content aloud',
    '"Stop" — Stop speech',
    '"Repeat" — Repeat last spoken text',
    '"Help" — List these commands',
  ],
  student: [
    '"Open Quiz" — Go to Quizzes',
    '"Open Notes" — Go to Notes',
    '"Open Dashboard" / "Go Home" — Back to home',
    '"Open Study Plan" — Open study planner',
    '"Start quiz" — Begin the next quiz',
    '"Option A / B / C / D" — Select answer',
    '"Next" — Next question',
    '"Submit" — Submit quiz',
    '"Read notes" — Read current page aloud',
    '"Stop" — Stop speech',
    '"Repeat" — Repeat last spoken',
    '"Help" — List these commands',
  ],
  parent: [
    '"Open Dashboard" — Go to overview',
    '"Show Performance" — Open performance tab',
    '"Show Attendance" — Open attendance tab',
    '"Read Summary" — Listen to AI summary',
    '"Download Report" — Download performance report',
    '"Stop" — Stop speech',
    '"Repeat" — Repeat last message',
    '"Help" — List these commands',
  ],
};

export function routeCommand(
  rawTranscript: string,
  role: Role,
  actions: VoiceActions
): CommandResult {
  const t = normalize(rawTranscript);

  // ---- UNIVERSAL: Stop ----
  if (t === 'stop' || t === 'stop listening' || MULTILANG_STOP.some(w => t.includes(w))) {
    actions.stop?.();
    return { handled: true, feedback: 'Stopped.' };
  }

  // ---- UNIVERSAL: Repeat ----
  if (t === 'repeat' || t === 'say again' || MULTILANG_REPEAT.some(w => t.includes(w))) {
    actions.repeat?.();
    return { handled: true, feedback: '' };
  }

  // ---- UNIVERSAL: Help ----
  if (t === 'help' || t === 'what can i say' || MULTILANG_HELP.some(w => t.includes(w))) {
    actions.speakHelp?.();
    return { handled: true, feedback: '' };
  }

  // ---- UNIVERSAL: Read page ----
  if (t === 'read page' || t === 'read aloud' || t === 'read notes' || t === 'read') {
    actions.readPage?.();
    return { handled: true, feedback: 'Reading page content.' };
  }

  // ---- NAVIGATION (all roles) ----
  if (t.includes('open dashboard') || t === 'go home' || t === 'home' || t === 'dashboard') {
    actions.navigate('home');
    return { handled: true, feedback: 'Opening dashboard.' };
  }
  if (t.includes('open quiz') || t === 'quiz' || t === 'quizzes') {
    actions.navigate(role === 'teacher' ? 'quiz-generation' : 'quizzes');
    return { handled: true, feedback: 'Opening quizzes.' };
  }
  if (t.includes('open notes') || t.includes('notes') || t.includes('lecture')) {
    actions.navigate(role === 'teacher' ? 'video-lectures' : 'notes');
    return { handled: true, feedback: 'Opening notes.' };
  }
  if (t.includes('open analytics') || t.includes('analytics') || t.includes('eklavya')) {
    actions.navigate(role === 'teacher' ? 'eklavya' : 'analysis');
    return { handled: true, feedback: 'Opening analytics.' };
  }
  if (t.includes('open study plan') || t.includes('study plan') || t.includes('study planner')) {
    actions.navigate('home');
    return { handled: true, feedback: 'Opening study planner.' };
  }
  if (t.includes('open assignments') || t === 'assignments') {
    actions.navigate('assignments');
    return { handled: true, feedback: 'Opening assignments.' };
  }
  if (t.includes('open curriculum') || t === 'curriculum') {
    actions.navigate('curriculum');
    return { handled: true, feedback: 'Opening curriculum.' };
  }
  if (t.includes('open attendance') || t === 'attendance') {
    actions.navigate('attendance');
    return { handled: true, feedback: 'Opening attendance.' };
  }
  if (t.includes('open students') || t === 'students') {
    actions.navigate('students');
    return { handled: true, feedback: 'Opening students list.' };
  }

  // ---- TEACHER COMMANDS ----
  if (role === 'teacher') {
    // "generate quiz on [topic]"
    const quizTopic = extractTopic(t, 'generate quiz on') ?? extractTopic(t, 'create quiz on') ?? extractTopic(t, 'quiz on');
    if (quizTopic) {
      actions.navigate('quiz-generation');
      actions.triggerGenerateQuiz?.(quizTopic);
      return { handled: true, feedback: `Generating quiz on ${quizTopic}.` };
    }

    // "create ppt on [topic]" / "make presentation on [topic]"
    const pptTopic =
      extractTopic(t, 'create ppt on') ??
      extractTopic(t, 'generate ppt on') ??
      extractTopic(t, 'make presentation on') ??
      extractTopic(t, 'ppt on');
    if (pptTopic) {
      actions.navigate('content-generator');
      actions.triggerGeneratePPT?.(pptTopic);
      return { handled: true, feedback: `Creating presentation on ${pptTopic}.` };
    }

    // "download ppt"
    if (t.includes('download ppt') || t.includes('download presentation') || t.includes('save ppt')) {
      actions.triggerDownloadPPT?.();
      return { handled: true, feedback: 'Downloading presentation.' };
    }

    // "open student analytics"
    if (t.includes('student analytics') || t.includes('open analytics') || t.includes('student performance')) {
      actions.navigate('eklavya');
      return { handled: true, feedback: 'Opening student analytics.' };
    }
  }

  // ---- STUDENT COMMANDS ----
  if (role === 'student') {
    if (t === 'start quiz' || t === 'begin quiz' || t === 'take quiz') {
      actions.startQuiz?.();
      return { handled: true, feedback: 'Starting quiz.' };
    }
    if (t === 'option a' || t === 'answer a' || t === 'a') {
      actions.selectOption?.(0);
      return { handled: true, feedback: 'Selected option A.' };
    }
    if (t === 'option b' || t === 'answer b' || t === 'b') {
      actions.selectOption?.(1);
      return { handled: true, feedback: 'Selected option B.' };
    }
    if (t === 'option c' || t === 'answer c' || t === 'c') {
      actions.selectOption?.(2);
      return { handled: true, feedback: 'Selected option C.' };
    }
    if (t === 'option d' || t === 'answer d' || t === 'd') {
      actions.selectOption?.(3);
      return { handled: true, feedback: 'Selected option D.' };
    }
    if (t === 'next' || t === 'next question') {
      actions.nextQuestion?.();
      return { handled: true, feedback: 'Next question.' };
    }
    if (t === 'submit' || t === 'submit quiz' || t === 'finish quiz') {
      actions.submitQuiz?.();
      return { handled: true, feedback: 'Submitting quiz.' };
    }
  }

  // ---- PARENT COMMANDS ----
  if (role === 'parent') {
    if (t.includes('show performance') || t.includes('open performance') || t === 'performance') {
      actions.navigate('performance');
      return { handled: true, feedback: 'Opening performance.' };
    }
    if (t.includes('show attendance') || t === 'attendance') {
      actions.navigate('attendance');
      return { handled: true, feedback: 'Showing attendance.' };
    }
    if (t.includes('read summary') || t === 'summary') {
      actions.readSummary?.();
      return { handled: true, feedback: 'Reading summary.' };
    }
    if (t.includes('download report') || t.includes('save report')) {
      actions.downloadReport?.();
      return { handled: true, feedback: 'Downloading report.' };
    }
  }

  return { handled: false };
}

export function getHelpText(role: Role): string {
  const cmds = HELP_COMMANDS[role] ?? [];
  return `Here are the available voice commands: ${cmds.join('. ')}`;
}

export { HELP_COMMANDS };
