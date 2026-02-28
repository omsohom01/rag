import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

// API Key and Model Rotation State
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

const MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

let currentKeyIndex = 0;
let currentModelIndex = 0;
let genAIClients: Map<string, GoogleGenerativeAI> = new Map();

function getClient(apiKey: string): GoogleGenerativeAI {
  if (!genAIClients.has(apiKey)) {
    genAIClients.set(apiKey, new GoogleGenerativeAI(apiKey));
  }
  return genAIClients.get(apiKey)!;
}

function getCurrentApiKey(): string {
  if (API_KEYS.length === 0) {
    throw new Error('No Gemini API keys found in environment variables');
  }
  return API_KEYS[currentKeyIndex];
}

function getCurrentModel(): string {
  return MODELS[currentModelIndex];
}

function rotateToNextModel() {
  currentModelIndex++;
  
  if (currentModelIndex >= MODELS.length) {
    // All models exhausted for current key, move to next key
    currentModelIndex = 0;
    currentKeyIndex++;
    
    if (currentKeyIndex >= API_KEYS.length) {
      // All keys exhausted, wrap around to first key
      currentKeyIndex = 0;
      logger.warn('🔄 All API keys and models exhausted, wrapping back to first key');
    } else {
      logger.info(`🔑 Switching to API key ${currentKeyIndex + 1}`);
    }
  } else {
    logger.info(`🔄 Switching to model: ${getCurrentModel()}`);
  }
}

function isQuotaError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  return (
    errorMessage.includes('quota') ||
    errorMessage.includes('QUOTA_EXCEEDED') ||
    errorMessage.includes('429') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('Resource has been exhausted')
  );
}

function isRetryableError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  const errorStatus = error?.status || error?.statusCode || 0;
  
  return (
    isQuotaError(error) ||
    errorMessage.includes('503') ||
    errorMessage.includes('Service Unavailable') ||
    errorMessage.includes('MODEL_OVERLOADED') ||
    errorMessage.includes('overloaded') ||
    errorMessage.includes('500') ||
    errorMessage.includes('Internal Server Error') ||
    errorMessage.includes('temporarily unavailable') ||
    errorMessage.includes('timeout') ||
    errorStatus === 503 ||
    errorStatus === 500 ||
    errorStatus === 502 ||
    errorStatus === 504
  );
}

async function executeWithRotation<T>(
  operation: (client: GoogleGenerativeAI, model: string) => Promise<T>,
  maxRetries: number = API_KEYS.length * MODELS.length
): Promise<T> {
  let lastError: any;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    const apiKey = getCurrentApiKey();
    const model = getCurrentModel();
    const client = getClient(apiKey);
    
    try {
      logger.info(`🔹 Using API Key ${currentKeyIndex + 1}, Model: ${model}`);
      const result = await operation(client, model);
      return result;
    } catch (error: any) {
      lastError = error;
      
      if (isRetryableError(error)) {
        const errorMsg = (error as any)?.message || (error as any)?.toString() || '';
        if (isQuotaError(error)) {
          logger.warn(`⚠️ Quota exceeded for API Key ${currentKeyIndex + 1}, Model: ${model}`);
        } else {
          logger.warn(`⚠️ Server error (503/500/overloaded) for API Key ${currentKeyIndex + 1}, Model: ${model} - ${errorMsg}`);
        }
        rotateToNextModel();
        attempts++;
        
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }
  
  logger.error('❌ All API keys and models exhausted');
  throw lastError;
}

export async function embedText(text: string): Promise<number[]> {
  try {
    // Embedding uses text-embedding-005 model (768 dims, matching Pinecone index)
    return await executeWithRotation(async (client, _model) => {
      const embeddingModel = client.getGenerativeModel({ model: 'text-embedding-005' });
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    });
  } catch (error) {
    logger.error('Error embedding text', error);
    throw error;
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  try {
    return await executeWithRotation(async (client, _model) => {
      const embeddingModel = client.getGenerativeModel({ model: 'text-embedding-005' });
      const results = await Promise.all(
        texts.map((text) => embeddingModel.embedContent(text))
      );
      return results.map((result) => result.embedding.values);
    });
  } catch (error) {
    logger.error('Error embedding batch', error);
    throw error;
  }
}

export async function generateAnswer(prompt: string): Promise<string> {
  try {
    return await executeWithRotation(async (client, modelName) => {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    });
  } catch (error) {
    logger.error('Error generating answer', error);
    throw error;
  }
}
