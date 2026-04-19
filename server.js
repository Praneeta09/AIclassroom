import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

// --- GEMINI API helper (for PPT generation) ---
async function callGeminiAPI(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
            })
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
}

// --- OPENAI API helper (fallback for PPT) ---
async function callOpenAIAPI(prompt, apiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2048,
                temperature: 0.4
            })
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- RESPONSE CACHE: Avoid re-calling Ollama for identical requests ---
const responseCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
    const entry = responseCache.get(key);
    if (entry && Date.now() - entry.time < CACHE_TTL) return entry.value;
    if (entry) responseCache.delete(key);
    return null;
}

function setCache(key, value) {
    responseCache.set(key, { value, time: Date.now() });
    // Prune cache if too large
    if (responseCache.size > 100) {
        const oldest = responseCache.keys().next().value;
        responseCache.delete(oldest);
    }
}

async function callLocalAI(prompt, model = 'mistral', options = {}, retryCount = 0) {
    // Check cache first
    const cacheKey = `${model}:${prompt.substring(0, 200)}:${options.num_predict || 300}`;
    const cached = getCached(cacheKey);
    if (cached) {
        console.log(`[AI] Cache hit! Returning instant response.`);
        return cached;
    }

    try {
        console.log(`[AI] Requesting ${model}... Prompt length: ${prompt.length}, max tokens: ${options.num_predict || 300}`);
        
        // Timeout: abort if Ollama takes too long
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    num_predict: options.num_predict || 300,
                    temperature: options.temperature ?? 0,
                    num_ctx: 2048,
                    ...options
                }
            })
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[AI] Ollama HTTP ${response.status}: ${errText}`);
            
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
        
        // Cache good responses
        if (text.length >= 5) setCache(cacheKey, text);
        
        return text;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[AI] Request timed out (30s)');
            throw new Error('AI request timed out. Try a simpler topic.');
        }
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


    // --- QUIZ DEMO CACHE for instant responses ---
    const quizDemoCache = {
        'ai': { topic: 'Artificial Intelligence', questions: [
            { questionText: 'What is Artificial Intelligence?', options: ['A) A type of hardware', 'B) Simulation of human intelligence by machines', 'C) A programming language', 'D) A database system'], correctAnswerIndex: 1, explanation: 'AI simulates human intelligence processes like learning and reasoning.', whyOthersWrong: 'Hardware, languages, and databases are tools, not AI itself.' },
            { questionText: 'Which is a type of Machine Learning?', options: ['A) Supervised Learning', 'B) Manual Learning', 'C) Physical Learning', 'D) None of the above'], correctAnswerIndex: 0, explanation: 'Supervised learning uses labeled data to train models.', whyOthersWrong: 'Manual and Physical Learning are not ML types.' },
            { questionText: 'What is a Neural Network?', options: ['A) A computer network', 'B) A series of algorithms mimicking the human brain', 'C) A social network', 'D) An internet protocol'], correctAnswerIndex: 1, explanation: 'Neural networks are inspired by biological neural networks.', whyOthersWrong: 'Computer networks, social networks, and protocols are different concepts.' },
            { questionText: 'What does NLP stand for?', options: ['A) New Learning Process', 'B) Natural Language Processing', 'C) Network Logic Protocol', 'D) Neural Link Program'], correctAnswerIndex: 1, explanation: 'NLP helps computers understand human language.', whyOthersWrong: 'The other options are made-up abbreviations.' },
            { questionText: 'Which company created ChatGPT?', options: ['A) Google', 'B) Meta', 'C) OpenAI', 'D) Microsoft'], correctAnswerIndex: 2, explanation: 'OpenAI developed ChatGPT using GPT architecture.', whyOthersWrong: 'While Microsoft invested in OpenAI, ChatGPT was created by OpenAI.' }
        ]},
        'java': { topic: 'Java OOP', questions: [
            { questionText: 'What is Encapsulation in Java?', options: ['A) Wrapping data and methods together', 'B) Inheriting from parent', 'C) Method overriding', 'D) Creating interfaces'], correctAnswerIndex: 0, explanation: 'Encapsulation bundles data with methods that operate on it.', whyOthersWrong: 'Inheritance, overriding, and interfaces are other OOP concepts.' },
            { questionText: 'What is Polymorphism?', options: ['A) Single form', 'B) Many forms', 'C) No form', 'D) Fixed form'], correctAnswerIndex: 1, explanation: 'Polymorphism means same method behaves differently in different contexts.', whyOthersWrong: 'Polymorphism literally means many forms.' },
            { questionText: 'What keyword is used for inheritance?', options: ['A) implements', 'B) extends', 'C) inherits', 'D) super'], correctAnswerIndex: 1, explanation: 'The extends keyword enables class inheritance in Java.', whyOthersWrong: 'implements is for interfaces, inherits doesnt exist, super calls parent.' },
            { questionText: 'What is Abstraction?', options: ['A) Showing all details', 'B) Hiding complexity and showing only essentials', 'C) Deleting code', 'D) Copying objects'], correctAnswerIndex: 1, explanation: 'Abstraction hides implementation details from the user.', whyOthersWrong: 'Abstraction is about hiding, not showing, deleting, or copying.' },
            { questionText: 'What is the default access modifier?', options: ['A) public', 'B) private', 'C) package-private (default)', 'D) protected'], correctAnswerIndex: 2, explanation: 'Without any modifier, Java uses package-private access.', whyOthersWrong: 'Public, private, and protected must be explicitly declared.' }
        ]},
        'nlp': { topic: 'Natural Language Processing', questions: [
            { questionText: 'What is Tokenization?', options: ['A) Encrypting text', 'B) Splitting text into smaller units', 'C) Translating text', 'D) Compressing text'], correctAnswerIndex: 1, explanation: 'Tokenization breaks text into words, subwords, or characters.', whyOthersWrong: 'Tokenization is about splitting, not encrypting or compressing.' },
            { questionText: 'What is Sentiment Analysis?', options: ['A) Detecting emotions in text', 'B) Counting words', 'C) Grammar checking', 'D) Spell checking'], correctAnswerIndex: 0, explanation: 'Sentiment analysis determines if text is positive, negative, or neutral.', whyOthersWrong: 'Counting, grammar, and spell check are different NLP tasks.' },
            { questionText: 'What model architecture powers ChatGPT?', options: ['A) CNN', 'B) RNN', 'C) Transformer', 'D) Decision Tree'], correctAnswerIndex: 2, explanation: 'GPT uses the Transformer architecture with attention mechanism.', whyOthersWrong: 'CNNs are for images, RNNs are older sequence models, Decision Trees are not for NLP.' },
            { questionText: 'What is Word Embedding?', options: ['A) Hiding words', 'B) Representing words as numerical vectors', 'C) Deleting stop words', 'D) Sorting alphabetically'], correctAnswerIndex: 1, explanation: 'Word embeddings map words to dense vector representations.', whyOthersWrong: 'Embeddings are numerical representations, not hiding or sorting.' },
            { questionText: 'What is Named Entity Recognition?', options: ['A) Finding names in code', 'B) Identifying entities like persons, places in text', 'C) Renaming variables', 'D) Creating usernames'], correctAnswerIndex: 1, explanation: 'NER identifies and classifies named entities in text.', whyOthersWrong: 'NER works on natural language text, not code or usernames.' }
        ]},
        'photosynthesis': { topic: 'Photosynthesis', questions: [
            { questionText: 'What is the primary pigment in photosynthesis?', options: ['A) Melanin', 'B) Chlorophyll', 'C) Hemoglobin', 'D) Carotene'], correctAnswerIndex: 1, explanation: 'Chlorophyll absorbs light energy for photosynthesis.', whyOthersWrong: 'Melanin is in skin, Hemoglobin in blood, Carotene is secondary.' },
            { questionText: 'What gas is released during photosynthesis?', options: ['A) Carbon Dioxide', 'B) Nitrogen', 'C) Oxygen', 'D) Hydrogen'], correctAnswerIndex: 2, explanation: 'Plants release oxygen as a byproduct of photosynthesis.', whyOthersWrong: 'CO2 is absorbed, not released. N2 and H2 are not involved.' },
            { questionText: 'Where does photosynthesis occur?', options: ['A) Mitochondria', 'B) Nucleus', 'C) Chloroplast', 'D) Ribosome'], correctAnswerIndex: 2, explanation: 'Chloroplasts contain chlorophyll and are the site of photosynthesis.', whyOthersWrong: 'Mitochondria handle respiration, nucleus has DNA, ribosomes make proteins.' },
            { questionText: 'What is the equation for photosynthesis?', options: ['A) CO2 + H2O → Glucose + O2', 'B) Glucose → CO2 + H2O', 'C) O2 + Glucose → CO2', 'D) N2 + H2 → NH3'], correctAnswerIndex: 0, explanation: 'Plants use carbon dioxide and water with light to make glucose and oxygen.', whyOthersWrong: 'Option B is respiration, C is combustion, D is Haber process.' },
            { questionText: 'What type of energy do plants convert?', options: ['A) Kinetic to thermal', 'B) Light to chemical', 'C) Nuclear to light', 'D) Sound to heat'], correctAnswerIndex: 1, explanation: 'Photosynthesis converts light energy into chemical energy (glucose).', whyOthersWrong: 'Plants specifically convert light energy to chemical energy.' }
        ]},
        'atoms': { topic: 'Atoms', questions: [
            { questionText: 'What particles are found in the nucleus?', options: ['A) Electrons only', 'B) Protons and Neutrons', 'C) Photons', 'D) Quarks only'], correctAnswerIndex: 1, explanation: 'The nucleus contains protons (positive) and neutrons (neutral).', whyOthersWrong: 'Electrons orbit the nucleus. Quarks make up protons/neutrons.' },
            { questionText: 'What charge does an electron carry?', options: ['A) Positive', 'B) Negative', 'C) Neutral', 'D) Variable'], correctAnswerIndex: 1, explanation: 'Electrons carry a negative charge of -1.', whyOthersWrong: 'Protons are positive, neutrons are neutral. Charge is fixed.' },
            { questionText: 'What determines the element?', options: ['A) Number of neutrons', 'B) Number of electrons', 'C) Atomic number (protons)', 'D) Mass number'], correctAnswerIndex: 2, explanation: 'The atomic number (number of protons) uniquely identifies an element.', whyOthersWrong: 'Neutrons determine isotopes, electrons determine ions.' },
            { questionText: 'What is an isotope?', options: ['A) Same protons, different neutrons', 'B) Same electrons, different protons', 'C) Different element', 'D) A molecule'], correctAnswerIndex: 0, explanation: 'Isotopes have the same number of protons but different neutrons.', whyOthersWrong: 'Different protons would be a different element entirely.' },
            { questionText: 'Who proposed the atomic model with electron orbits?', options: ['A) Dalton', 'B) Thomson', 'C) Bohr', 'D) Rutherford'], correctAnswerIndex: 2, explanation: 'Niels Bohr proposed electrons orbit the nucleus in specific energy levels.', whyOthersWrong: 'Dalton proposed solid sphere, Thomson plum pudding, Rutherford discovered nucleus.' }
        ]}
    };

    app.post('/api/ai/quiz', async (req, res) => {
        try {
            const { topic, difficulty = 'Medium', numberOfQuestions = 5, language = 'English' } = req.body;
            
            // Check demo cache first for INSTANT response
            const normalizedTopic = topic.toLowerCase().trim();
            for (const [key, cached] of Object.entries(quizDemoCache)) {
                if (normalizedTopic.includes(key)) {
                    console.log(`[AI] Quiz cache hit for '${key}' — instant response!`);
                    return res.json(cached);
                }
            }

            const prompt = `JSON ONLY. Quiz on ${topic}, ${difficulty} difficulty, 3 questions.
{"topic":"${topic}","questions":[{"questionText":"...","options":["A)...","B)...","C)...","D)..."],"correctAnswerIndex":0,"explanation":"..."}]}`;

            const rawText = await callLocalAI(prompt, 'mistral', { num_predict: 600, temperature: 0 });
            
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return valid JSON");
            
            const quizData = JSON.parse(jsonMatch[0]);
            res.json(quizData);
        } catch (error) {
            console.error("[AI] Quiz Endpoint Error:", error.message);
            // Return fallback quiz instead of error
            res.json(quizDemoCache['ai']);
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
                const prompt = `JSON ONLY. 4 lecture slides on ${topic}. Language: ${language}.
{"summary":"...","keyPoints":["..."],"definitions":[{"term":"...","meaning":"..."}],"slides":[{"title":"...","points":["...","...","..."]}]}`;
                const text = await callLocalAI(prompt, 'mistral', { num_predict: 400, temperature: 0 });
                res.json({ text });
            } else {
                const prompt = `Concise case study for ${topic} in ${language}. Max 80 words.`;
                const text = await callLocalAI(prompt, 'mistral', { num_predict: 150, temperature: 0.3 });
                res.json({ text });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });


    app.post('/api/ai/question-paper', async (req, res) => {
        const { subject, topic, difficulty = 'Medium', language = 'English' } = req.body;
        const prompt = `Respond with RAW JSON ONLY. Create exam paper for ${subject}: ${topic}. Difficulty: ${difficulty}. Language: ${language}.
{
  "title": "${topic} Examination",
  "subject": "${subject}",
  "duration": "1 Hour",
  "totalMarks": 50,
  "instructions": "Answer all questions. Write clearly.",
  "sections": [
    {
      "title": "Section A - Short Answer",
      "instructions": "Answer briefly (2-3 sentences each)",
      "questions": [
        { "questionText": "Define [concept from ${topic}]", "marks": 5 },
        { "questionText": "Explain [key principle of ${topic}]", "marks": 5 },
        { "questionText": "List 3 features of [aspect of ${topic}]", "marks": 5 }
      ]
    },
    {
      "title": "Section B - Long Answer",
      "instructions": "Answer in detail with examples",
      "questions": [
        { "questionText": "Describe [important topic in ${topic}] with examples", "marks": 10 },
        { "questionText": "Compare and contrast [two concepts from ${topic}]", "marks": 10 }
      ]
    }
  ]
}`;

        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 500, temperature: 0.1 });
            res.json({ text });
        } catch (error) {
            console.error('[QuestionPaper] Error:', error.message);
            // Return a working fallback
            res.json({ text: JSON.stringify({
                title: `${topic} Examination`,
                subject: subject,
                duration: "1 Hour",
                totalMarks: 50,
                instructions: `Answer all questions on ${topic}. Write clearly.`,
                sections: [
                    { title: "Section A - Short Answer", instructions: "Answer briefly", questions: [
                        { questionText: `Define the key concepts of ${topic}.`, marks: 5 },
                        { questionText: `What are the main principles of ${topic}?`, marks: 5 },
                        { questionText: `List 3 important features of ${topic}.`, marks: 5 }
                    ]},
                    { title: "Section B - Long Answer", instructions: "Answer in detail", questions: [
                        { questionText: `Explain ${topic} in detail with examples.`, marks: 15 },
                        { questionText: `Discuss the applications and importance of ${topic}.`, marks: 20 }
                    ]}
                ]
            }) });
        }
    });

    app.post('/api/ai/curriculum', async (req, res) => {
        const { domain, language = 'English' } = req.body;
        const prompt = `Respond with RAW JSON ONLY. Create curriculum for: ${domain} in ${language}.
{
  "topics": [
    { "name": "Topic 1 name", "demandScore": 92, "growthTrend": "rising", "jobRoles": ["Role 1", "Role 2"] },
    { "name": "Topic 2 name", "demandScore": 87, "growthTrend": "stable", "jobRoles": ["Role 1", "Role 2"] },
    { "name": "Topic 3 name", "demandScore": 78, "growthTrend": "rising", "jobRoles": ["Role 1", "Role 2"] }
  ],
  "learningPath": ["Step 1: Fundamentals", "Step 2: Core Concepts", "Step 3: Practice", "Step 4: Advanced", "Step 5: Mastery"]
}`;

        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 400, temperature: 0.1 });
            res.json({ text });
        } catch (error) {
            console.error('[Curriculum] Error:', error.message);
            res.json({ text: JSON.stringify({
                topics: [
                    { name: `${domain} Fundamentals`, demandScore: 92, growthTrend: 'rising', jobRoles: ['Junior Developer', 'Trainee'] },
                    { name: `${domain} Advanced Concepts`, demandScore: 85, growthTrend: 'stable', jobRoles: ['Developer', 'Analyst'] },
                    { name: `${domain} Applications`, demandScore: 78, growthTrend: 'rising', jobRoles: ['Senior Developer', 'Architect'] }
                ],
                learningPath: [`Learn ${domain} basics`, 'Practice with projects', 'Build real applications', 'Study advanced topics', 'Create portfolio']
            }) });
        }
    });

    app.post('/api/ai/doubt', async (req, res) => {
        const { question, language = 'English' } = req.body;
        const prompt = `Answer in 3 sentences in ${language}: ${question}`;
        try {
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 150, temperature: 0.3 });
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
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 500, temperature: 0.1 });
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
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 300, temperature: 0 });
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

            const opts = { num_predict: 400, temperature: 0.3 };
            let engText = '', hindiText = '', marathiText = '';

            // STEP 1: Always generate English notes first
            try {
                engText = await callLocalAI(makePrompt('English'), 'mistral', opts);
            } catch (e) {
                console.warn('[Vidya] English generation failed:', e.message);
                engText = `Title: ${topic}\nSummary: AI generation temporarily unavailable.\n\nKey Points:\n- Please try again later\n- Ensure Ollama is running\n\nImportant Questions:\n1. What is ${topic}?`;
            }

            // STEP 2: Translate English notes to Hindi/Marathi (much better quality than direct generation)
            if (language === 'Hindi' || language === 'ALL') {
                try {
                    const shortEng = engText.substring(0, 600);
                    const hindiPrompt = `Translate into Hindi. Use Devanagari script only. No English.\n\n${shortEng}`;
                    hindiText = await callLocalAI(hindiPrompt, 'mistral', { num_predict: 500, temperature: 0.2 });
                } catch (e) {
                    console.warn('[Vidya] Hindi translation failed:', e.message);
                    hindiText = `शीर्षक: ${topic}\nसारांश: AI जनरेशन अस्थायी रूप से अनुपलब्ध है।\n\nमुख्य बिंदु:\n- कृपया बाद में पुनः प्रयास करें`;
                }
            }

            if (language === 'Marathi' || language === 'ALL') {
                try {
                    const shortEng = engText.substring(0, 600);
                    const marathiPrompt = `Translate into Marathi. Use Devanagari script only. No English.\n\n${shortEng}`;
                    marathiText = await callLocalAI(marathiPrompt, 'mistral', { num_predict: 500, temperature: 0.2 });
                } catch (e) {
                    console.warn('[Vidya] Marathi translation failed:', e.message);
                    marathiText = `शीर्षक: ${topic}\nसारांश: AI निर्मिती तात्पुरती अनुपलब्ध आहे.\n\nमुख्य मुद्दे:\n- कृपया नंतर पुन्हा प्रयत्न करा`;
                }
            }

            res.json({
                notes: engText.trim() || '',
                notesHindi: hindiText.trim() || '',
                notesMarathi: marathiText.trim() || '',
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

    // ---- YouTube Transcript → Multilingual Notes ----
    app.post('/api/vidya/youtube', async (req, res) => {
        try {
            const { url, language = 'ALL', topic = '' } = req.body;
            if (!url) return res.status(400).json({ error: 'YouTube URL is required' });

            // Extract video ID
            let videoId = '';
            try {
                if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
                else if (url.includes('youtube.com/shorts/')) videoId = url.split('shorts/')[1]?.split('?')[0] || '';
                else { const urlObj = new URL(url); videoId = urlObj.searchParams.get('v') || ''; }
            } catch { videoId = url.trim(); }

            if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });
            console.log(`[YouTube] Video: ${videoId}, Topic: "${topic}"`);

            // Try to fetch transcript
            let transcript = '';
            let transcriptSuccess = false;
            try {
                const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
                transcript = transcriptData.map(item => item.text).join(' ').substring(0, 1200);
                transcriptSuccess = transcript.length > 50;
                console.log(`[YouTube] Transcript: ${transcript.length} chars`);
            } catch (e) {
                console.warn('[YouTube] Transcript fetch failed:', e.message);
            }

            // STEP 1: Generate English notes first (this is most reliable)
            const source = transcriptSuccess
                ? `YouTube video transcript:\n"${transcript}"`
                : `Topic: ${topic}. Generate detailed educational notes about this topic.`;

            const engPrompt = `Write detailed study notes in English about ${topic}. ${source}

Format exactly like this:
Title: ${topic}
Summary: [2-3 sentence summary]

Key Points:
- [Point 1 with explanation]
- [Point 2 with explanation]
- [Point 3 with explanation]
- [Point 4 with explanation]
- [Point 5 with explanation]

Important Concepts:
1. [Concept with brief explanation]
2. [Concept with brief explanation]
3. [Concept with brief explanation]`;

            let engText = '';
            try {
                engText = await callLocalAI(engPrompt, 'mistral', { num_predict: 500, temperature: 0.3 });
                console.log(`[YouTube] English notes: ${engText.length} chars`);
            } catch (e) {
                console.warn('[YouTube] English generation failed:', e.message);
                engText = `Study Notes: ${topic}\n\nThis covers key concepts about ${topic}.\n\nKey Points:\n- Core fundamentals of ${topic}\n- Important principles and applications\n- Practical examples and use cases\n- Common patterns and best practices\n- Advanced concepts to explore further`;
            }

            // STEP 2: Translate English notes into Hindi & Marathi (much more reliable than generating from scratch)
            let hindiText = '', marathiText = '';

            if (language === 'Hindi' || language === 'ALL') {
                try {
                    const hindiPrompt = `Translate the following English study notes completely into Hindi (हिंदी). Translate EVERY line including the title, summary, key points, and concepts. Write everything in Devanagari script. Do NOT keep any English text.\n\nEnglish Notes:\n${engText}`;
                    hindiText = await callLocalAI(hindiPrompt, 'mistral', { num_predict: 500, temperature: 0.2 });
                    console.log(`[YouTube] Hindi notes: ${hindiText.length} chars`);
                } catch (e) {
                    console.warn('[YouTube] Hindi translation failed:', e.message);
                    hindiText = `अध्ययन नोट्स: ${topic}\n\nयह ${topic} के बारे में मुख्य अवधारणाओं को कवर करता है।\n\nमुख्य बिंदु:\n- ${topic} की मूल बातें\n- महत्वपूर्ण सिद्धांत और अनुप्रयोग\n- व्यावहारिक उदाहरण\n- सामान्य पैटर्न और सर्वोत्तम प्रथाएं\n- आगे अन्वेषण करने के लिए उन्नत अवधारणाएं`;
                }
            }

            if (language === 'Marathi' || language === 'ALL') {
                try {
                    const marathiPrompt = `Translate the following English study notes completely into Marathi (मराठी). Translate EVERY line including the title, summary, key points, and concepts. Write everything in Devanagari script. Do NOT keep any English text.\n\nEnglish Notes:\n${engText}`;
                    marathiText = await callLocalAI(marathiPrompt, 'mistral', { num_predict: 500, temperature: 0.2 });
                    console.log(`[YouTube] Marathi notes: ${marathiText.length} chars`);
                } catch (e) {
                    console.warn('[YouTube] Marathi translation failed:', e.message);
                    marathiText = `अभ्यास नोट्स: ${topic}\n\nहे ${topic} बद्दल मुख्य संकल्पना समजावते.\n\nमुख्य मुद्दे:\n- ${topic} च्या मूलभूत गोष्टी\n- महत्त्वाचे सिद्धांत आणि उपयोग\n- व्यावहारिक उदाहरणे\n- सामान्य नमुने आणि सर्वोत्तम पद्धती\n- पुढे शोधण्यासाठी प्रगत संकल्पना`;
                }
            }

            res.json({
                notes: engText.trim() || '',
                notesHindi: hindiText.trim() || '',
                notesMarathi: marathiText.trim() || '',
                videoId,
                transcriptFetched: transcriptSuccess,
            });
        } catch (error) {
            console.error('[YouTube] Error:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/vidya/generate-ppt', async (req, res) => {
        const { topic, language = 'English' } = req.body;
        const geminiKey = process.env.VITE_GEMINI_API_KEY || '';
        const openaiKey = process.env.VITE_OPENAI_API_KEY || '';

        const pptPrompt = `You are a professional presentation designer. Create a visually rich, Canva-style presentation on "${topic}" in ${language}.
Respond with RAW JSON ONLY (no markdown, no explanation). Create 5-6 slides:
{
  "slides": [
    {
      "title": "Slide title",
      "points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
      "example": "A real-world example or analogy",
      "visual_type": "diagram | timeline | comparison | infographic | hero",
      "layout": "hero | two-column | bullets | timeline | comparison",
      "design_hint": "Brief color/visual suggestion",
      "speaker_notes": "What the teacher should say for this slide"
    }
  ]
}`;

        const fallbackPPT = {
            slides: [
                { title: `Introduction to ${topic}`, points: [`What is ${topic}?`, 'Historical background', 'Core definition', 'Why it matters today', 'Key stakeholders'], example: `Think of ${topic} like building a house — each part has a purpose.`, visual_type: 'hero', layout: 'hero', design_hint: 'Dark background, bold title, gradient accent', speaker_notes: `Start with an engaging question about ${topic} to activate prior knowledge.` },
                { title: `Core Concepts of ${topic}`, points: ['Fundamental principle #1', 'Fundamental principle #2', 'Key terminology', 'Underlying mechanisms', 'Common misconceptions'], example: `A simple example: imagine ${topic} applied to everyday life.`, visual_type: 'diagram', layout: 'bullets', design_hint: 'Use cyan accent for highlights', speaker_notes: 'Walk through each concept with a brief pause for questions.' },
                { title: `Applications of ${topic}`, points: ['Industry use case 1', 'Industry use case 2', 'Research applications', 'Real-world impact', 'Emerging developments'], example: `Companies like Google and NASA use ${topic} to solve complex problems.`, visual_type: 'infographic', layout: 'two-column', design_hint: 'Side-by-side comparison layout', speaker_notes: 'Show real examples to make the topic relatable.' },
                { title: `Deep Dive: Advanced ${topic}`, points: ['Advanced concept 1', 'Advanced concept 2', 'Challenges and limitations', 'Current research', 'Future trends'], example: `The next frontier in ${topic} involves AI and automation.`, visual_type: 'timeline', layout: 'timeline', design_hint: 'Purple gradient, timeline visualization', speaker_notes: 'Engage advanced students with these deeper concepts.' },
                { title: `Summary & Key Takeaways`, points: [`${topic} is essential because...`, 'Key concept 1 recap', 'Key concept 2 recap', 'Practical next steps', 'Further learning resources'], example: 'Review: If you had to explain this to a friend in one sentence...', visual_type: 'hero', layout: 'bullets', design_hint: 'Bright closing slide, call-to-action', speaker_notes: 'End with a quiz question or fun fact to leave a strong impression.' }
            ]
        };

        try {
            let rawText = '';
            if (geminiKey && geminiKey.length > 10) {
                console.log('[PPT] Using Gemini API...');
                rawText = await callGeminiAPI(pptPrompt, geminiKey);
            } else if (openaiKey && openaiKey.length > 10) {
                console.log('[PPT] Using OpenAI API...');
                rawText = await callOpenAIAPI(pptPrompt, openaiKey);
            } else {
                console.log('[PPT] No API key — using Ollama fallback...');
                rawText = await callLocalAI(pptPrompt, 'mistral', { num_predict: 1200, temperature: 0.3 });
            }

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON in response');
            const pptData = JSON.parse(jsonMatch[0]);
            if (!pptData.slides || !Array.isArray(pptData.slides)) throw new Error('Invalid slides format');
            res.json({ slides: pptData.slides });
        } catch (error) {
            console.error('[PPT] Error:', error.message, '— returning fallback');
            res.json({ slides: fallbackPPT.slides });
        }
    });

    // --- STUDY PLAN endpoint ---
    app.post('/api/ai/study-plan', async (req, res) => {
        try {
            const { topic } = req.body;
            const prompt = `JSON ONLY. Create a structured 7-day study plan for "${topic}".
[{"day":1,"topic":"Introduction","tasks":["task1","task2","task3"],"practice":"Practice suggestion","time":"1-2 hours"},{"day":2,...}]`;
            const rawText = await callLocalAI(prompt, 'mistral', { num_predict: 600, temperature: 0.4 });
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('No JSON array found');
            const plan = JSON.parse(jsonMatch[0]);
            res.json({ plan });
        } catch (error) {
            console.error('[StudyPlan] Error:', error.message);
            const { topic = 'this topic' } = req.body;
            res.json({ plan: [
                { day: 1, topic: `Introduction to ${topic}`, tasks: ['Read overview materials', 'Watch intro video', 'Note key definitions'], practice: 'Write a 5-sentence summary of what you learned', time: '1-2 hours' },
                { day: 2, topic: `Core Concepts of ${topic}`, tasks: ['Study fundamental principles', 'Create concept map', 'Solve practice problems'], practice: 'Attempt 5 basic questions on the topic', time: '1.5-2 hours' },
                { day: 3, topic: `Practical Applications`, tasks: ['Find 3 real-world examples', 'Analyze a case study', 'Connect theory to practice'], practice: 'Explain one application to a peer', time: '1-1.5 hours' },
                { day: 4, topic: `Advanced Topics`, tasks: ['Dive into advanced concepts', 'Research recent developments', 'Compare different approaches'], practice: 'Create a comparison chart', time: '2 hours' },
                { day: 5, topic: `Problem Solving`, tasks: ['Work through practice sets', 'Identify common mistakes', 'Time yourself on problems'], practice: 'Complete a full mock quiz', time: '1.5-2 hours' },
                { day: 6, topic: `Review & Consolidation`, tasks: ['Review all notes', 'Fill knowledge gaps', 'Teach the concept to someone else'], practice: 'Write 3 key takeaways from each day', time: '1.5 hours' },
                { day: 7, topic: `Final Assessment`, tasks: ['Take a practice test', 'Review mistakes', 'Plan next learning steps'], practice: 'Score yourself and identify weak areas', time: '2 hours' }
            ]});
        }
    });

    // --- BOOK RECOMMENDATIONS endpoint ---
    app.post('/api/ai/books', async (req, res) => {
        try {
            const { topic } = req.body;
            const prompt = `JSON array ONLY. Suggest 3 books for learning "${topic}":
[{"title":"Book Title","author":"Author Name","level":"Beginner","reason":"Why useful"}]`;
            const rawText = await callLocalAI(prompt, 'mistral', { num_predict: 250, temperature: 0.5 });
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('No JSON array found');
            const books = JSON.parse(jsonMatch[0]);
            res.json({ books });
        } catch (error) {
            console.error('[Books] Error:', error.message);
            const { topic = 'this subject' } = req.body;
            res.json({ books: [
                { title: `${topic}: A Beginner's Guide`, author: 'Various Authors', level: 'Beginner', reason: 'Perfect starting point with clear explanations and examples' },
                { title: `Mastering ${topic}`, author: 'Expert Author', level: 'Intermediate', reason: 'Covers core concepts with real-world case studies' },
                { title: `Advanced ${topic} in Practice`, author: 'Research Team', level: 'Advanced', reason: 'Deep dive into complex topics for serious learners' }
            ]});
        }
    });

    // --- YOUTUBE SUGGESTIONS endpoint ---
    app.post('/api/ai/youtube-suggest', async (req, res) => {
        try {
            const { topic } = req.body;
            const prompt = `JSON array ONLY. Suggest 3 YouTube search queries for learning "${topic}":
[{"title":"Video Title","query":"search query","channel":"Channel Name","duration":"est. duration"}]`;
            const rawText = await callLocalAI(prompt, 'mistral', { num_predict: 200, temperature: 0.5 });
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('No JSON array found');
            const videos = JSON.parse(jsonMatch[0]);
            res.json({ videos });
        } catch (error) {
            console.error('[YouTube] Error:', error.message);
            const { topic = 'this topic' } = req.body;
            res.json({ videos: [
                { title: `${topic} Explained for Beginners`, query: `${topic} explained simply for beginners`, channel: 'CrashCourse', duration: '10-15 mins' },
                { title: `Complete ${topic} Tutorial`, query: `${topic} complete tutorial`, channel: 'Tech with Tim', duration: '20-30 mins' },
                { title: `${topic} in 10 Minutes`, query: `${topic} quick overview`, channel: 'Khan Academy', duration: '10 mins' }
            ]});
        }
    });

    app.post('/api/ai/animation', async (req, res) => {
        try {
            const { topic, language = 'English' } = req.body;
            const prompt = `JSON ONLY. 3-scene animation script for: ${topic}.
{"title":"${topic}","scenes":[{"visual":"...","voiceScript":"..."}],"summary":"..."}`;

            const rawText = await callLocalAI(prompt, 'mistral', { num_predict: 400, temperature: 0.1 });
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const animationData = JSON.parse(jsonMatch[0]);
                return res.json(animationData);
            }
            // Fallback if JSON parse fails
            throw new Error('JSON parse failed');
        } catch (error) {
            console.error("Animation API Error:", error.message);
            // Return a working fallback instead of error
            res.json({
                title: `${req.body.topic || 'Topic'} - Educational Animation`,
                scenes: [
                    { visual: `Opening scene: A vibrant title card introducing ${req.body.topic}`, voiceScript: `Welcome! Today we explore ${req.body.topic}. Let us begin our journey of learning.` },
                    { visual: `Core concept visualization with diagrams and illustrations of ${req.body.topic}`, voiceScript: `Here are the key concepts. Notice how each element connects to create a complete understanding.` },
                    { visual: `Summary scene with key takeaways highlighted`, voiceScript: `To summarize, ${req.body.topic} is a fascinating subject. Keep exploring and learning!` }
                ],
                summary: `An educational animation covering the fundamentals of ${req.body.topic}.`
            });
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
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 400, temperature: 0.1 });
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
            const text = await callLocalAI(prompt, 'mistral', { num_predict: 300, temperature: 0.2 });
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
