import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function callLocalAI(prompt, model = 'mistral', options = {}, retryCount = 1) {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    num_predict: Math.min(options.num_predict || 200, 250),
                    temperature: 0.2,
                    top_p: 0.9,
                    top_k: 40,
                    repeat_penalty: 1.1,
                    ...options
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        const text = data.response?.trim() || "";
        
        // Retry logic for empty/too-short responses
        if (text.length < 10 && retryCount > 0) {
            console.log(`AI response too short (${text.length} chars), retrying...`);
            return await callLocalAI(prompt, model, options, retryCount - 1);
        }
        
        return text;
    } catch (error) {
        console.error('callLocalAI Error:', error);
        if (retryCount > 0) return await callLocalAI(prompt, model, options, retryCount - 1);
        return "Offline Mode: AI response unavailable. Ensure Ollama is running 'mistral'.";
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
            const prompt = `Topic: ${question}\nInstruction: Explain clearly in simple steps with a short example. Respond concisely in ${language}.`;
            const text = await callLocalAI(prompt, 'mistral');
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/quiz', async (req, res) => {
        try {
            const { topic, difficulty = 'Medium', numberOfQuestions = 5, language = 'English' } = req.body;
            const count = Math.min(Math.max(numberOfQuestions, 3), 10);
            
            const prompt = `Generate a JSON quiz on topic: ${topic}. Difficulty: ${difficulty}. Language: ${language}.
Number of MCQs: ${count}.
Output Format:
{
  "topic": "${topic}",
  "questions": [
    {
      "questionText": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0
    }
  ]
}
Return only the JSON.`;

            const text = await callLocalAI(prompt, 'mistral', { num_predict: 800 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/content', async (req, res) => {
        try {
            const { topic, type = 'slides', language = 'English' } = req.body;
            if (type === 'slides' || type === 'detailed notes') {
                const prompt = `Generate ${type === 'slides' ? 'lecture slides' : 'detailed notes'} about ${topic}. Language: ${language}.
Format as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "definitions": [{"term": "...", "meaning": "..."}],
  "slides": [
    { "title": "...", "points": ["...", "..."] }
  ]
}
Generate 5 slides. Return only JSON.`;
                const text = await callLocalAI(prompt, 'mistral', { num_predict: 1000 });
                res.json({ text });
            } else {
                const prompt = `Generate a concise case study for ${topic}. Language: ${language}. Keep it under 200 words.`;
                const text = await callLocalAI(prompt, 'mistral');
                res.json({ text });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/question-paper', async (req, res) => {
        const { subject, topic, difficulty = 'Medium', language = 'English' } = req.body;
        const prompt = `Generate a 25-MARK question paper for: ${subject} / ${topic}.
Difficulty: ${difficulty}. Language: ${language}.

REQUIRED STRUCTURE (Exactly 25 Marks Total):
Section A (Objective): 5 MCQs @ 1 mark each = 5 marks
Section B (Short Answer): 2 questions @ 5 marks each = 10 marks
Section C (Long Answer): 1 question @ 10 marks = 10 marks

Format as JSON:
{
  "title": "${subject} Exam Paper - 25 Marks",
  "subject": "${subject}",
  "instructions": "Solve all questions. Total Marks: 25. Time: 45 Minutes.",
  "totalMarks": 25,
  "duration": "45 Minutes",
  "sections": [
    {
      "title": "Section A (Objective)",
      "questions": [
        { "questionText": "...", "marks": 1 }
      ]
    },
    {
      "title": "Section B (Short Answer)",
      "questions": [
        { "questionText": "...", "marks": 5 }
      ]
    },
    {
      "title": "Section C (Long Answer)",
      "questions": [
        { "questionText": "...", "marks": 10 }
      ]
    }
  ]
}
Return only the JSON.`;

        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 1000 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: "Failed to generate paper" });
        }
    });

    app.post('/api/ai/curriculum', async (req, res) => {
        const { domain, language = 'English' } = req.body;
        const prompt = `Perform a curriculum intelligence analysis for: ${domain}. Language: ${language}.
Must analyze market demand and recommended career roadmap.

Format as JSON:
{
  "topics": [
    {
      "name": "Topic Name",
      "demandScore": 85,
      "growthTrend": "rising", // rising/stable/declining
      "jobRoles": ["Role 1", "Role 2"]
    }
  ],
  "learningPath": ["Step 1", "Step 2", "Step 3"]
}
Limit to 5-7 core topics. Return only the JSON.`;

        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 1000 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: "Failed to generate curriculum" });
        }
    });

    app.post('/api/ai-router', async (req, res) => {
        try {
            const { model = 'mistral', prompt, options = {} } = req.body;
            const aiResponseText = await callLocalAI(prompt, model, options);
            res.json({ text: aiResponseText });
        } catch (error) {
            console.error('AI Router Error:', error);
            res.status(500).json({ error: error.message || 'AI generation failed' });
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
}
