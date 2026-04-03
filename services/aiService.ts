import { Quiz, LectureSlide, CaseStudy, SharedContent, GeneratedLecture, FAQ } from '../types';

/**
 * Centrally route AI requests to specific backend endpoints.
 */
export const routeAIRequest = async (endpoint: string, body: any): Promise<string> => {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error(`AI Request to ${endpoint} failed`);
        const data = await response.json();
        
        return data.text || "";
    } catch (e) {
        console.error(`AI Error (${endpoint}):`, e);
        throw e;
    }
};

/**
 * Feature A: AI Content Generator (Lecture Slides)
 */
export const generateLectureSlides = async (outline: string, language: string = 'English'): Promise<{ slides: LectureSlide[] }> => {
    if (!outline || !outline.trim()) throw new Error("Error: Insufficient input");
    
    try {
        const text = await routeAIRequest('/api/ai/content', { topic: outline, type: 'slides', language });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
        return {
            slides: jsonData.slides || []
        };
    } catch (error: any) { 
        console.warn("JSON Parse failed for slides, returning fallback", error);
        return { slides: [{ title: "Topic Overview", points: ["1. Definition: Topic introduction.", "2. Key points: Core concepts.", "3. Example: Real-world case."] }] }; 
    }
};

/**
 * Feature B: Quiz Generator
 */
export const generateQuiz = async (topic: string, numQuestions: number = 5, difficulty: string = 'Medium', language: string = 'English'): Promise<Omit<Quiz, 'id' | 'classCode'>> => {
    if (!topic || !topic.trim()) throw new Error("Error: Insufficient input");
    
    try {
        const text = await routeAIRequest('/api/ai/quiz', { topic, difficulty, numberOfQuestions: numQuestions, language });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const quizData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
        
        return {
            topic: quizData.topic || topic,
            questions: (quizData.questions || []).map((q: any, idx: number) => ({
                questionText: q.questionText || `Question ${idx + 1}`,
                options: Array.isArray(q.options) ? q.options : ["A", "B", "C", "D"],
                correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0
            })).slice(0, numQuestions)
        };
    } catch (error: any) { 
        console.warn("Quiz generation fallback", error);
        return {
           topic: "Local Quiz Fallback", 
           questions: [{ questionText: "Is the local AI running correctly?", options: ["Yes", "No", "Checking...", "Ollama is required"], correctAnswerIndex: 0 }]
        }; 
    }
};

export const generateQuizFromContent = async (content: string, numQuestions: number = 5, difficulty: string = 'Medium', language: string = 'English'): Promise<Omit<Quiz, 'id' | 'classCode'>> => {
    return generateQuiz(content.substring(0, 500), numQuestions, difficulty, language);
};

/**
 * Feature C: Doubt Solver
 */
export const getExplanation = async (question: string, language: string = 'English'): Promise<string> => {
    if (!question || !question.trim()) return "Error: Insufficient input";
    
    try {
        return await routeAIRequest('/api/ai/doubt', { question, language });
    } catch (error: any) { 
        return "Definition: Local AI Service\nKey points: Running on your machine, using Mistral model.\nExample: Solving doubts in multiple languages."; 
    }
};

/**
 * Feature D: Notes Generator
 */
export const generateNotesFromTranscript = async (transcript: string, language: string = 'English'): Promise<any> => {
    if (!transcript || !transcript.trim()) throw new Error("Error: Insufficient input");
    
    try {
        const text = await routeAIRequest('/api/ai/content', { topic: transcript, type: 'detailed notes', language });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
        return {
            summary: jsonData.summary || "",
            keyPoints: jsonData.keyPoints || [],
            definitions: jsonData.definitions || [],
            slides: jsonData.slides || []
        };
    } catch (error: any) { 
        return { 
            summary: "AI Notes Summary", 
            keyPoints: ["Local AI processing active."], 
            definitions: [], 
            slides: [{ title: "Introduction", points: ["AI is analyzing your content locally."] }] 
        }; 
    }
};

export const summarizeText = async (text: string, language: string = 'English'): Promise<string> => {
    return await routeAIRequest('/api/ai/content', { topic: text, type: 'summary', language });
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    // Re-use doubt endpoint for general translation/explanation if needed, or router
    const prompt = `Translate the following text to ${targetLanguage}:\n\n${text}`;
    const response = await fetch('/api/ai-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: 'mistral' })
    });
    const data = await response.json();
    return data.text;
};

export const analyzeImageContent = async (base64Image: string, mimeType: string): Promise<string> => {
    return "Definition: Image Analysis\nKey points: Local Mistral model is text-only. Multimodal models like Llava are required for vision.";
};

export const performSmartSearch = async (query: string, knowledgeBase: any): Promise<{ answer: string; sources: { name: string; type: string }[] }> => {
    // Basic implementation for now
    const prompt = `Based on the following knowledge base, answer the query: "${query}"\n\nKnowledge Base Summary: ${JSON.stringify(knowledgeBase).substring(0, 2000)}`;
    const text = await routeAIRequest('/api/ai-router', { prompt });
    return { answer: text, sources: [] };
};

export const generateCaseStudy = async (outline: string, language: string = 'English'): Promise<Omit<CaseStudy, 'id' | 'classCode'>> => {
    try {
        const text = await routeAIRequest('/api/ai/content', { topic: outline, type: 'case study', language });
        return { 
            title: "AI Generated Case Study", 
            introduction: text, 
            problem: "Challenge identified for analysis.", 
            solution: "Proposed solution path.", 
            conclusion: "Summary of learnings." 
        };
    } catch (e) {
        return { title: "Case Study Fallback", introduction: "N/A", problem: "N/A", solution: "N/A", conclusion: "N/A" };
    }
};

export const generateExamPaperAI = async (subject: string, topic: string, numSections: number, difficulty: string, language: string = 'English'): Promise<any> => {
    try {
        const text = await routeAIRequest('/api/ai/question-paper', { subject, topic, difficulty, language });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch (e) {
        return { title: "Exam Paper Fallback", subject, instructions: "N/A", duration: "N/A", totalMarks: 0, sections: [] };
    }
};

export const generateHybridLessonPlanAI = async (topic: string, onlineCount: number, offlineCount: number, language: string = 'English'): Promise<{ segments: any[] }> => {
    const prompt = `Generate a hybrid lesson plan for topic: ${topic}. Online segments: ${onlineCount}, Offline segments: ${offlineCount}. Respond in ${language}.`;
    const text = await routeAIRequest('/api/ai-router', { prompt });
    return { segments: [{ title: 'Full Plan', content: text }] };
};

export const generateCurriculumIntelligenceAI = async (domain: string, language: string = 'English'): Promise<{ topics: any[], learningPath: string[] }> => {
    try {
        const text = await routeAIRequest('/api/ai/curriculum', { domain, language });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch (e) {
        return { topics: [], learningPath: [] };
    }
};
