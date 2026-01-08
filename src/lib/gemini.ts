import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function embedText(text: string): Promise<number[]> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    logger.error('Error embedding text', error);
    throw error;
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'text-embedding-004' });
    const results = await Promise.all(
      texts.map((text) => model.embedContent(text))
    );
    return results.map((result) => result.embedding.values);
  } catch (error) {
    logger.error('Error embedding batch', error);
    throw error;
  }
}

export async function generateAnswer(prompt: string): Promise<string> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    logger.error('Error generating answer', error);
    throw error;
  }
}
