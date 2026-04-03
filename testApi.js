import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'hello',
    });
    console.log('SUCCESS:', response.text);
  } catch (err) {
    console.error('API ERROR:', err);
  }
}
run();
