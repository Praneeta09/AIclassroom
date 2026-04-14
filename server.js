import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function callLocalAI(prompt, model = 'mistral', options = {}, retryCount = 1) {
    try {
        console.log(`[AI] Requesting ${model}... Prompt length: ${prompt.length}`);
        
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    num_predict: options.num_predict || 300,
                    temperature: options.temperature ?? 0,
                    num_ctx: 4096,
                    ...options
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[AI] Ollama HTTP ${response.status}: ${errText}`);
            
            // Try fallback model if mistral fails
            if (model === 'mistral' && retryCount > 0) {
                console.log("[AI] Retrying with 'llama3' as fallback...");
                return await callLocalAI(prompt, 'llama3', options, retryCount - 1);
            }
            throw new Error(`Ollama error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        const text = data.response?.trim() || "";
        
        if (text.length < 5 && retryCount > 0) {
            console.log("[AI] Response too short, retrying...");
            return await callLocalAI(prompt, model, options, retryCount - 1);
        }
        
        return text;
    } catch (error) {
        console.error('[AI] callLocalAI Error:', error.message);
        throw error;
    }
}

export function registerApiRoutes(app) {
    app.use(express.json({ limit: '50mb' }));

    const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR)
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
      }
    });

    const upload = multer({ storage: storage });

    app.post('/api/upload-image', upload.single('image'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    });

    // --- AI ROUTER ENDPOINTS ---

    app.post('/api/ai/doubt', async (req, res) => {
        try {
            const { question, language = 'English' } = req.body;
            const normalizedQ = (question || "").toLowerCase().trim();

            // RAPID DEMO: Instant Doubt Solver
            if (normalizedQ.includes('atom')) {
                return res.json({ text: "An atom is the basic building block of matter. It consists of a nucleus (containing protons and neutrons) and electrons orbiting around it. For example, a Hydrogen atom is the simplest atom with 1 proton." });
            }
            if (normalizedQ.includes('java') || normalizedQ.includes('oops')) {
                return res.json({ text: "Object-Oriented Programming (OOP) in Java is a paradigm that uses 'objects' to design applications. Key pillars include Inheritance (reusing code), Polymorphism (multiple forms), Encapsulation (data hiding), and Abstraction (hiding complexity)." });
            }
            if (normalizedQ.includes('nlp')) {
                return res.json({ text: "Natural Language Processing (NLP) is a branch of AI that helps computers understand, interpret, and generate human language. It involves tasks like tokenization, sentiment analysis, and machine translation." });
            }

            const prompt = `Topic: ${question}\nInstruction: Explain clearly and very concisely in simple steps for a student. Response must be in ${language}. Limit to 3 sentences.`;
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 200, temperature: 0.3 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });


    app.post('/api/ai/quiz', async (req, res) => {
        try {
            const { topic, difficulty = 'Medium', numberOfQuestions = 5, language = 'English' } = req.body;
            
            const prompt = `Task: Create a Quiz.
Topic: ${topic}
Difficulty: ${difficulty}
Language: ${language}

Output: Valid JSON only.
Structure:
{
  "topic": "${topic}",
  "questions": [
    {
      "questionText": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswerIndex": number,
      "explanation": "...",
      "whyOthersWrong": "..."
    }
  ]
}
Generate exactly 5 questions.`;

            const rawText = await callLocalAI(prompt, 'mistral', { num_predict: 2000, temperature: 0.1 });
            
            // Extract JSON block
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return valid JSON");
            
            const quizData = JSON.parse(jsonMatch[0]);
            res.json(quizData); // Return object directly
        } catch (error) {
            console.error("[AI] Quiz Endpoint Error:", error.message);
            res.status(500).json({ error: "Local AI failed to generate quiz." });
        }
    });

    app.post('/api/ai/content', async (req, res) => {
        try {
            const { topic, type = 'slides', language = 'English' } = req.body;
            const normalizedTopic = topic.toLowerCase().trim();

            // RAPID DEMO CACHE: Instant responses for popular demo topics
            const demoCache = {
                'ai': {
                    summary: "Artificial Intelligence (AI) is the simulation of human intelligence by machines.",
                    keyPoints: ["Self-learning systems", "Neural networks", "Data processing"],
                    definitions: [{ term: "Neural Network", meaning: "A series of algorithms that mimic the human brain." }],
                    slides: [
                        { title: "What is AI?", points: ["Definition of AI", "History of computation"] },
                        { title: "Types of AI", points: ["Narrow AI", "General AI", "Super AI"] },
                        { title: "Machine Learning", points: ["Supervised learning", "Unsupervised learning"] },
                        { title: "Future of AI", points: ["Healthcare", "Automation", "Ethics"] }
                    ]
                },
                'photosynthesis': {
                    summary: "Photosynthesis is the process by which plants make their own food using sunlight.",
                    keyPoints: ["Chlorophyll absorption", "Carbon dioxide intake", "Oxygen release"],
                    definitions: [{ term: "Chlorophyll", meaning: "The green pigment in plants." }],
                    slides: [
                        { title: "Process Overview", points: ["Sunlight + Water + CO2", "Glucose + Oxygen"] },
                        { title: "The Leaf Structure", points: ["Stomata", "Chloroplasts"] },
                        { title: "Light Reactions", points: ["ATP production", "Photolysis"] },
                        { title: "Dark Reactions", points: ["Calvin Cycle", "Glucose synthesis"] }
                    ]
                },
                'atoms': {
                    summary: "Atoms are the fundamental building blocks of all matter in the universe.",
                    keyPoints: ["Subatomic particles", "Atomic number", "Chemical bonding"],
                    definitions: [{ term: "Nucleus", meaning: "The central core of an atom." }],
                    slides: [
                        { title: "The Structure of an Atom", points: ["Protons (Positive)", "Neutrons (Neutral)", "Electrons (Negative)"] },
                        { title: "Atomic Number", points: ["Number of protons", "Identity of the element"] },
                        { title: "Electron Shells", points: ["Orbitals around nucleus", "Valence electrons"] },
                        { title: "Quantum Model", points: ["Electron clouds", "Probability density"] }
                    ]
                },
                'java': {
                    summary: "Java Object-Oriented Programming (OOP) is a paradigm based on objects and classes.",
                    keyPoints: ["Encapsulation", "Inheritance", "Polymorphism", "Abstraction"],
                    definitions: [{ term: "Object", meaning: "An instance of a class." }],
                    slides: [
                        { title: "Class & Objects", points: ["Blueprints vs Instances", "Real-world modeling"] },
                        { title: "Inheritance", points: ["Code reusability", "Parent and Child classes"] },
                        { title: "Polymorphism", points: ["Method Overloading", "Method Overriding"] },
                        { title: "Encapsulation & Abstraction", points: ["Data hiding", "Hiding complexity"] }
                    ]
                },
                'nlp': {
                    summary: "Natural Language Processing (NLP) is an AI bridge between computers and human language.",
                    keyPoints: ["Tokenization", "Sentiment analysis", "Named Entity Recognition"],
                    definitions: [{ term: "Tokenization", meaning: "Splitting text into smaller units (tokens)." }],
                    slides: [
                        { title: "Introduction to NLP", points: ["Text processing", "Language understanding"] },
                        { title: "Text Preprocessing", points: ["Lemmatization", "Stemming", "Stopword removal"] },
                        { title: "Sequence Models", points: ["Recurrent Neural Networks (RNN)", "Transformers"] },
                        { title: "Applications", points: ["Chatbots", "Machine Translation", "Summarization"] }
                    ]
                }
            };

            const isAIDemo = normalizedTopic.includes('ai') || normalizedTopic.includes('intelligence');
            const isPhotoDemo = normalizedTopic.includes('photo');
            const isAtomDemo = normalizedTopic.includes('atom');
            const isJavaDemo = normalizedTopic.includes('java') || normalizedTopic.includes('oops');
            const isNLPDemo = normalizedTopic.includes('nlp') || normalizedTopic.includes('natural language');

            if (type === 'slides' && (isAIDemo || isPhotoDemo || isAtomDemo || isJavaDemo || isNLPDemo)) {
               const cached = isAIDemo ? demoCache['ai'] : (isPhotoDemo ? demoCache['photosynthesis'] : (isAtomDemo ? demoCache['atoms'] : (isJavaDemo ? demoCache['java'] : demoCache['nlp'])));
               return res.json({ text: JSON.stringify(cached) });
            }



            if (type === 'slides' || type === 'detailed notes') {
                const prompt = `Respond with RAW JSON ONLY.
Generate PROFESSIONAL, Canva-style lecture slides about ${topic}. Language: ${language}.
Each slide MUST include:
- "title": string
- "points": array of 3-5 short bullet points
- "visual": string (Visual keyword/illustration query e.g. "cybersecurity lock icon illustration")

Format:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "definitions": [{"term": "...", "meaning": "..."}],
  "slides": [{ "title": "...", "points": ["...", "..."], "visual": "..." }]
}`;
                const text = await callLocalAI(prompt, 'mistral', { num_predict: 800, temperature: 0 });
                res.json({ text });
            } else {
                const prompt = `Generate a very concise case study for ${topic}. Language: ${language}. Max 100 words.`;
                const text = await callLocalAI(prompt, 'mistral', { num_predict: 250, temperature: 0.4 });
                res.json({ text });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });


    app.post('/api/ai/question-paper', async (req, res) => {
        const { subject, topic, language = 'English' } = req.body;
        const prompt = `Respond with RAW JSON ONLY. Generate a FAST exam paper for topic: ${topic}. Language: ${language}.
Format:
{
  "title": "${topic} Exam Paper",
  "subject": "${subject}",
  "instructions": "Attempt all questions.",
  "sections": [
    { "title": "Section A", "questions": [{ "questionText": "Q1: ...", "marks": 1 }, { "questionText": "Q2: ...", "marks": 1 }] },
    { "title": "Section B", "questions": [{ "questionText": "Q3: ...", "marks": 5 }, { "questionText": "Q4: ...", "marks": 5 }] }
  ]
}`;

        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 500, temperature: 0 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: "Failed to generate paper" });
        }
    });

    app.post('/api/ai/curriculum', async (req, res) => {
        const { domain, language = 'English' } = req.body;
        const prompt = `Respond with RAW JSON ONLY. Market demand analysis for: ${domain}. Language: ${language}.
Format:
{
  "topics": [{ "name": "Topic", "demandScore": 90, "growthTrend": "rising", "jobRoles": ["Role"] }],
  "learningPath": ["Step 1", "Step 2"]
}`;

        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 500, temperature: 0 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: "Failed to generate curriculum" });
        }
    });

    app.post('/api/ai/doubt', async (req, res) => {
        const { question, language = 'English' } = req.body;
        const prompt = `You are a helpful AI teacher. Answer the student's question concisely. Question: ${question}. Language: ${language}.`;
        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 400, temperature: 0.4 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: "Doubt solver unavailable" });
        }
    });

    app.post('/api/ai-router', async (req, res) => {
        try {
            const { model = 'mistral', prompt, options = {} } = req.body;
            const aiResponseText = await callLocalAI(prompt, model, { num_predict: 250, ...options });
            res.json({ text: aiResponseText });
        } catch (error) {
            console.error('AI Router Error:', error);
            res.status(500).json({ error: error.message || 'AI generation failed' });
        }
    });

    app.post('/api/ai/analyze-performance', async (req, res) => {
        const { topic, score, totalQuestions, incorrectAnswers, language = 'English' } = req.body;
        
        const prompt = `Respond with RAW JSON ONLY. Analyze student quiz performance.
Topic: ${topic}.
Score: ${score}/${totalQuestions}.
Incorrect Items: ${JSON.stringify(incorrectAnswers)}.
Language: ${language}.

Tasks:
1. Classify topics into weak, medium, strong.
2. Identify mistake types (conceptual, calculation, memory).
3. Create a short study plan.
4. Generate 5 new practice MCQs for weaker areas.

Format:
{
  "weak_topics": ["..."],
  "medium_topics": ["..."],
  "strong_topics": ["..."],
  "mistake_analysis": ["..."],
  "study_plan": ["..."],
  "practice_questions": [
    { "questionText": "...", "options": ["...", "...", "...", "..."], "correctAnswerIndex": 0 }
  ]
}`;

        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 1000, temperature: 0.2 });
            res.json({ text });
        } catch (error) {
            console.error('Performance Analysis Error:', error);
            res.status(500).json({ error: "Failed to analyze performance" });
        }
    });

    app.post('/api/ai/resources', async (req, res) => {
        try {
            const { topic, language = 'English' } = req.body;
            const prompt = `Respond with RAW JSON ONLY. Recommend precisely 3 real educational resources for ${topic} in ${language}.
Format:
{
  "beginner": { "name": "...", "whyUseful": "..." },
  "intermediate": { "name": "...", "whyUseful": "..." },
  "advanced": { "name": "...", "whyUseful": "..." }
}`;
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 400, temperature: 0.3 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/analyze-quiz', async (req, res) => {
        const { topic, score, total, wrong_questions } = req.body;
        const wrongList = Array.isArray(wrong_questions) ? wrong_questions.join(', ') : 'unknown';
        const prompt = `You are a student performance analyzer. Respond with ONLY valid JSON, no extra text.

Student scored ${score} out of ${total} on topic: "${topic}".
Wrong questions: ${wrongList}

Respond with this exact JSON structure (fill all fields, do NOT leave blank):
{
  "weak_topics": ["topic1", "topic2"],
  "reason": "one sentence reason why student struggled",
  "what_to_learn_next": ["concept1", "concept2"],
  "books": [{"name": "book name", "reason": "why useful"}],
  "youtube": [{"topic": "topic name", "query": "topic name explained"}],
  "motivation": "one encouraging sentence"
}`;
        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 600, temperature: 0.1 });
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
            res.json({ response: parsed });
        } catch (error) {
            res.json({
                response: {
                    weak_topics: [topic],
                    reason: `Student needs more practice on ${topic}.`,
                    what_to_learn_next: [`Review core concepts of ${topic}`],
                    books: [{ name: `${topic} Fundamentals`, reason: 'Covers basics thoroughly' }],
                    youtube: [{ topic, query: `${topic} explained simply` }],
                    motivation: 'Every mistake is a step closer to mastery. Keep going!'
                }
            });
        }
    });


    // Mock Attendance Sessions in Memory
    let activeAttendanceSessions = [];

    app.post('/api/attendance/start', (req, res) => {
        const { classCode, teacherEmail, durationMinutes = 10 } = req.body;
        const sessionId = crypto.randomUUID();
        const startedAt = new Date().toISOString();
        const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
        
        const newSession = {
            id: sessionId,
            date: startedAt.split('T')[0],
            isActive: true,
            records: [],
            classCode,
            teacherEmail,
            startedAt,
            endsAt,
            status: 'active'
        };
        
        activeAttendanceSessions.forEach(s => {
            if (s.classCode === classCode && s.isActive) {
                s.isActive = false;
                s.status = 'stopped';
            }
        });
        
        activeAttendanceSessions.push(newSession);
        res.json(newSession);
    });

    app.post('/api/attendance/stop', (req, res) => {
        const { sessionId } = req.body;
        const session = activeAttendanceSessions.find(s => s.id === sessionId);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        session.isActive = false;
        session.status = 'stopped';
        res.json(session);
    });

    app.post('/api/attendance/submit', (req, res) => {
        const { classCode, studentName, studentEmail, submittedValue, method } = req.body;
        const session = activeAttendanceSessions.find(s => s.classCode === classCode && s.isActive);
        
        if (!session) {
            return res.status(404).json({ error: 'No active session found' });
        }
        
        if (new Date(session.endsAt).getTime() < Date.now()) {
            session.isActive = false;
            session.status = 'expired';
            return res.status(400).json({ error: 'Session expired' });
        }
        
        const alreadyMarked = session.records.some(r => r.studentEmail === studentEmail);
        if (alreadyMarked) {
            return res.status(400).json({ error: 'Already marked' });
        }
        
        session.records.push({
            studentName,
            studentEmail,
            timestamp: new Date().toISOString(),
            method: method || 'manual',
            submittedValue: submittedValue || ''
        });
        
        res.json(session);
    });

    app.get('/api/attendance/active/:classCode', (req, res) => {
        const classCode = req.params.classCode;
        const session = activeAttendanceSessions.find(s => s.classCode === classCode && s.isActive);
        
        if (session && new Date(session.endsAt).getTime() < Date.now()) {
            session.isActive = false;
            session.status = 'expired';
            return res.json(null);
        }
        res.json(session || null);
    });

    // --- PARENT DASHBOARD ENDPOINTS ---

    app.post('/api/parent/join-class', (req, res) => {
        const { classCode, studentEmail } = req.body;
        // In a real app, we'd validate the student exists in the class.
        // For this demo, we'll just return a success with the studentId (using email as ID).
        res.json({ studentId: studentEmail, classCode: classCode });
    });

    app.post('/api/ai/parent-summary', async (req, res) => {
        try {
            const { attendance, quiz, assignment, language = 'English' } = req.body;
            const labelsMap = {
                'English': { strength: 'Strength', weakness: 'Weakness', suggestion: 'Suggestion' },
                'Hindi': { strength: 'मजबूती', weakness: 'कमजोरी', suggestion: 'सुझाव' },
                'Marathi': { strength: 'सामर्थ्य', कमतरता: 'कमतरता', सल्ला: 'सल्ला' }
            };
            const labels = labelsMap[language] || labelsMap['English'];

            const prompt = `Generate a short student performance summary in ${language}:
Attendance: ${attendance}
Quiz: ${quiz}
Assignments: ${assignment}

Output must be exactly in this format using ${language}:
* ${labels.strength}: (one short sentence)
* ${labels.weakness}: (one short sentence)
* ${labels.suggestion}: (one short sentence)

MANDATORY: You must write the entire response only in ${language} script. No explanation.`;

            const text = await callLocalAI(prompt, 'mistral', { num_predict: 150, temperature: 0.5 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/parent-recommendation', async (req, res) => {
        try {
            const { weakSubjects, language = 'English' } = req.body;
            const prompt = `Suggest improvements for weak subjects in ${language}:
Weak Subjects: ${weakSubjects}

Output:
* 3 bullet points in ${language}
* MANDATORY: Respond only in ${language} script. No English unless strictly necessary.`;

            const text = await callLocalAI(prompt, 'mistral', { num_predict: 200, temperature: 0.5 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/parent-curriculum', async (req, res) => {
        try {
            const { subject, language = 'English' } = req.body;
            const prompt = `Suggest extra learning for the subject "${subject}" in ${language}:
Output:
* 3 topics/skills in ${language}
* 2 recommended platforms
* MANDATORY: Respond only in ${language} script. No English.`;

            const text = await callLocalAI(prompt, 'mistral', { num_predict: 250, temperature: 0.5 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // --- VIDYA AI ENDPOINTS ---

    app.post('/api/vidya/process', async (req, res) => {
        try {
            const { topic, language = 'ALL' } = req.body;

            const makePrompt = (lang) => `You are an educational content generator. Write ONLY in ${lang}. Do NOT mix languages.
Topic: ${topic}

Generate content in this EXACT format (no extra text):

Title: [Topic title in ${lang}]
Summary: [2-3 sentence summary in ${lang}]

Key Points:
- [Point 1]
- [Point 2]
- [Point 3]
- [Point 4]

Important Questions:
1. [Question 1]
2. [Question 2]
3. [Question 3]
4. [Question 4]
5. [Question 5]`;

            const opts = { num_predict: 600, temperature: 0.3 };
            const EMPTY = '';

            let engText = EMPTY, hindiText = EMPTY, marathiText = EMPTY;

            if (language === 'ALL') {
                [engText, hindiText, marathiText] = await Promise.all([
                    callLocalAI(makePrompt('English'), 'mistral', opts),
                    callLocalAI(makePrompt('Hindi'), 'mistral', opts),
                    callLocalAI(makePrompt('Marathi'), 'mistral', opts)
                ]);
            } else if (language === 'English') {
                engText = await callLocalAI(makePrompt('English'), 'mistral', opts);
            } else if (language === 'Hindi') {
                hindiText = await callLocalAI(makePrompt('Hindi'), 'mistral', opts);
            } else if (language === 'Marathi') {
                marathiText = await callLocalAI(makePrompt('Marathi'), 'mistral', opts);
            }

            res.json({
                notes: engText.trim() || (language === 'English' ? 'Notes generation failed. Check if Ollama is running.' : ''),
                notesHindi: hindiText.trim() || (language === 'Hindi' ? 'Notes generation failed. Check if Ollama is running.' : ''),
                notesMarathi: marathiText.trim() || (language === 'Marathi' ? 'Notes generation failed. Check if Ollama is running.' : ''),
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/vidya/translate', async (req, res) => {
        try {
            const { text, targetLanguage } = req.body;
            const prompt = `Translate the following text into ${targetLanguage}. Do not provide any explanation, just the translation. Text: ${text}`;
            const translatedText = await callLocalAI(prompt, 'mistral', { num_predict: 300, temperature: 0.3 });
            res.json({ translatedText });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/vidya/generate-ppt', async (req, res) => {
        try {
            const { topic, language = 'English' } = req.body;
            const prompt = `Respond with RAW JSON ONLY. Convert the topic "${topic}" into lecture slides for a PPT. Each slide must have a Title and exactly 3 bullet points. Language: ${language}.
Format:
{
  "slides": [
    { "title": "...", "points": ["...", "...", "..."] }
  ]
}`;
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 600, temperature: 0.2 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/animation', async (req, res) => {
        try {
            const { topic, language = 'English' } = req.body;
            const prompt = `Generate a high-quality educational animation script for: ${topic}. Language: ${language}.
Output: JSON ONLY.
Structure:
{
  "title": "${topic}",
  "scenes": [
    { "visual": "Detailed cinematic visual description", "voiceScript": "Narration text" }
  ],
  "summary": "..."
}
3 scenes max.`;

            const rawText = await callLocalAI(prompt, 'mistral', { num_predict: 1200, temperature: 0.2 });
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Animation Script generation failed");
            
            const animationData = JSON.parse(jsonMatch[0]);
            res.json(animationData); // Return object directly
        } catch (error) {
            console.error("Animation API Error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/eklavya', async (req, res) => {
        try {
            const { data, language = 'English' } = req.body;
            const prompt = `Respond with RAW JSON ONLY. Deeply analyze class student data: ${JSON.stringify(data)}. Language: ${language}.
Output Format:
{
  "classSummary": {
    "weakTopics": [{ "topic": "...", "percentage": 75 }],
    "strongTopics": [{ "topic": "...", "percentage": 85 }],
    "teacherAlerts": ["What teacher should reteach"]
  },
  "studentInsights": [
    { "name": "...", "email": "...", "avgScore": 85, "weakTopics": [...], "strongTopics": [...], "suggestions": "..." }
  ],
  "top3WeakStudents": [{ "name": "...", "issue": "..." }],
  "trendAnalysis": "Improving / Declining"
}`;
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 1000, temperature: 0.2 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/resources', async (req, res) => {
        try {
            const { topic, subject, language = 'English' } = req.body;
            const prompt = `Respond with RAW JSON ONLY. Suggest real-world teaching resources for Subject: ${subject}, Topic: ${topic} in ${language}.
Format:
{
  "topic": "${topic}",
  "beginner": { "name": "...", "type": "Book / YouTube / Website", "whyUseful": "...", "suggestedUse": "..." },
  "intermediate": { "name": "...", "type": "...", "whyUseful": "...", "suggestedUse": "..." },
  "advanced": { "name": "...", "type": "...", "whyUseful": "...", "suggestedUse": "..." },
  "teachingTip": "Short suggestion for teacher on how to use these resources"
}`;
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 800, temperature: 0.3 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
