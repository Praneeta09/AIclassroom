import { Quiz, LectureSlide, CaseStudy, SharedContent, GeneratedLecture, FAQ, AnimationScript, EklavyaAnalysis } from '../types';

/**
 * Centrally route AI requests to specific backend endpoints.
 */
export const routeAIRequest = async (endpoint: string, body: any): Promise<any> => {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error(`AI Request to ${endpoint} failed`);
        const data = await response.json();
        
        return data.text || data;
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
        return { slides: [{ title: "Topic Overview", points: ["1. Definition: Topic introduction.", "2. Key points: Core concepts.", "3. Example: Real-world case."], visualSuggestion: "Icon of a lightbulb" }] }; 
    }
};

/**
 * Feature B: Quiz Generator
 */
export const generateQuiz = async (topic: string, numQuestions: number = 5, difficulty: string = 'Medium', language: string = 'English'): Promise<Omit<Quiz, 'id' | 'classCode'>> => {
    if (!topic || !topic.trim()) throw new Error("Error: Insufficient input");
    
    try {
        const quizData = await routeAIRequest('/api/ai/quiz', { topic, difficulty, numberOfQuestions: numQuestions, language });
        
        return {
            topic: quizData.topic || topic,
            questions: (quizData.questions || []).map((q: any, idx: number) => ({
                questionText: q.questionText || `Question ${idx + 1}`,
                options: Array.isArray(q.options) ? q.options : ["A", "B", "C", "D"],
                correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
                explanation: q.explanation || "",
                whyOthersWrong: q.whyOthersWrong || ""
            })).slice(0, 5)
        };
    } catch (error: any) { 
        console.warn("Quiz generation fallback", error);
        return {
           topic: "Local Quiz Fallback", 
           questions: [{ 
               questionText: "Is the local AI running correctly?", 
               options: ["Yes", "No", "Checking...", "Ollama is required"], 
               correctAnswerIndex: 0,
               explanation: "This is a fallback quiz because the AI generation failed.",
               whyOthersWrong: "The other options are incorrect interpretations of the system state."
           }]
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

/**
 * Feature G: Smart Resource Hub
 */
export const generateResources = async (topic: string, subject: string, language: string = 'English'): Promise<any> => {
    if (!topic || !topic.trim()) throw new Error("Error: Insufficient input");
    try {
        const text = await routeAIRequest('/api/ai/resources', { topic, subject, language });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch (e) {
        return {
            topic: topic,
            beginner: { name: "Foundational Guide", type: "Book", whyUseful: "Great for building core concepts.", suggestedUse: "Use as primary reading material." },
            intermediate: { name: "Practical Handbook", type: "Website", whyUseful: "Focuses on real-world implementation.", suggestedUse: "Assign as homework for practice." },
            advanced: { name: "In-depth Research", type: "Website", whyUseful: "Advanced theories and complex problem solving.", suggestedUse: "For self-paced advanced learners." },
            teachingTip: "Encourage students to explore beyond the basic textbook definitions."
        };
    }
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

export const generateAnimationScript = async (topic: string, language: string = 'English'): Promise<Omit<AnimationScript, 'id' | 'classCode' | 'createdAt'>> => {
    try {
        const data = await routeAIRequest('/api/ai/animation', { topic, language });
        return {
            topic: topic,
            title: data.title || `${topic} Educational Animation`,
            scenes: (data.scenes || []).map((s: any) => ({
                visual: s.visual || "Generic visual description.",
                voiceScript: s.voiceScript || "Narrator script goes here."
            })),
            summary: data.summary || "Animation summary."
        };
    } catch (e) {
        return { 
            topic: topic,
            title: `${topic} Educational Animation`, 
            scenes: [
                { visual: "Introductory visual about " + topic, voiceScript: "Welcome! Today we are exploring " + topic + "." },
                { visual: "Detailed breakdown illustration.", voiceScript: "Observe how these components interact in a " + topic + " system." },
                { visual: "Conclusion visual summary.", voiceScript: "In summary, " + topic + " is essential for modern understanding." }
            ]
        };
    }
};

export const generateEklavyaAnalysis = async (data: any, language: string = 'English'): Promise<EklavyaAnalysis> => {
    try {
        const result = await routeAIRequest('/api/ai/eklavya', { data, language });
        // result could be the JSON directly if routeAIRequest returns data (which I updated it to do)
        if (typeof result === 'string') {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
        }
        return result;
    } catch (e) {
        return {
            classSummary: { weakTopics: [], strongTopics: [], teacherAlerts: ["AI analysis unavailable."] },
            studentInsights: [],
            top3WeakStudents: [],
            trendAnalysis: "Stable"
        };
    }
};
