import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const caseStudySchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: 'The title of the case study.' },
        introduction: { type: Type.STRING, description: 'An introduction or background for the case study.' },
        problem: { type: Type.STRING, description: 'The core problem or challenge presented in the case study.' },
        solution: { type: Type.STRING, description: 'The solution, actions taken, or process implemented.' },
        conclusion: { type: Type.STRING, description: 'The results, outcome, and key takeaways of the case study.' }
    },
    required: ['title', 'introduction', 'problem', 'solution', 'conclusion']
};
async function test() {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'generate a case study about react',
        config: {
            responseMimeType: 'application/json',
            responseSchema: caseStudySchema
        }
    });
    console.log('SUCCESS:', response.text);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
