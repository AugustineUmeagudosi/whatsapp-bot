import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GERMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const queryGenerativeAI = async (query: string): Promise<string> => {
  try {
    const result = await model.generateContent(query);
    const response = result.response.text();

    if (!response) return 'Sorry, I could not generate a response.';
    return response || 'No response generated.';
  } catch (error) {
    console.error('Error querying Generative AI:', error);
    return 'Sorry, I am having trouble responding right now.';
  }
};
