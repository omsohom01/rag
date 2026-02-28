import 'dotenv/config';
import { generateAnswer } from '../src/lib/gemini';
import { logger } from '../src/utils/logger';
import { detectLanguage, translateToEnglish } from '../src/lib/translator';

interface VercelRequest {
  method: string;
  body: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = Date.now().toString(36);
  const separator = '='.repeat(80);
  
  // Log request start with explicit logging
  logger.info(`IMAGE REQUEST START - ID: ${requestId}`);
  console.log(`\n${separator}`);
  console.log(`IMAGE REQUEST START - ID: ${requestId} - TIME: ${new Date().toISOString()}`);
  console.log(separator);
  process.stdout.write(`\n[IMAGE-API] Request ID: ${requestId}\n`);
  
  if (req.method !== 'POST') {
    logger.warn(`Method not allowed: ${req.method}`);
    console.log(`[${requestId}] ERROR: Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      logger.warn('Invalid request: description missing or not a string');
      console.log(`[${requestId}] ERROR: Invalid request - description missing or not a string`);
      return res.status(400).json({ error: 'description is required and must be a string' });
    }

    logger.info(`Processing disease description: ${description.substring(0, 100)}`);
    console.log(`[${requestId}] Disease Description: "${description.substring(0, 100)}${description.length > 100 ? '...' : ''}"\`);

    // Step 1: Detect language
    logger.info('STEP 1/4: Detecting language');
    console.log(`[${requestId}] STEP 1/4: Detecting language...`);
    process.stdout.write(`[${requestId}] Language detection starting...\n`);
    
    const detectedLanguage = await detectLanguage(description);
    
    logger.info(`Language detected: ${detectedLanguage}`);
    console.log(`[${requestId}] SUCCESS: Language detected: ${detectedLanguage.toUpperCase()}`);
    process.stdout.write(`[${requestId}] Detected language: ${detectedLanguage}\n`);

    let englishDescription = description;

    // Step 2: Translate to English if not already in English
    if (detectedLanguage !== 'en') {
      logger.info('STEP 2/4: Translating to English');
      console.log(`[${requestId}] STEP 2/4: Translating to English...`);
      englishDescription = await translateToEnglish(description, detectedLanguage);
      logger.info('Translation complete');
      console.log(`[${requestId}] SUCCESS: Translation complete`);
    } else {
      logger.info('STEP 2/4: Skipping translation (already English)');
      console.log(`[${requestId}] STEP 2/4: Skipping translation (already English)`);
    }

    // Step 3: Generate treatment string
    logger.info('STEP 3/4: Generating treatment plan');
    console.log(`[${requestId}] STEP 3/4: Generating treatment plan...`);
    process.stdout.write(`[${requestId}] Starting treatment generation...\n`);
    
    const treatmentPrompt = detectedLanguage !== 'en'
      ? `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable TREATMENT plan. Respond ONLY with the treatment steps, no extra explanation. Respond in ${detectedLanguage} language.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nTREATMENT in ${detectedLanguage}:`
      : `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable TREATMENT plan. Respond ONLY with the treatment steps, no extra explanation.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nTREATMENT:`;

    const treatment = await generateAnswer(treatmentPrompt);
    
    logger.info(`Treatment generated: ${treatment.length} characters`);
    console.log(`[${requestId}] SUCCESS: Treatment generated (${treatment.length} characters)`);
    process.stdout.write(`[${requestId}] Treatment complete: ${treatment.length} chars\n`);

    // Step 4: Generate prevention string
    logger.info('STEP 4/4: Generating prevention plan');
    console.log(`[${requestId}] STEP 4/4: Generating prevention plan...`);
    process.stdout.write(`[${requestId}] Starting prevention generation...\n`);
    
    const preventionPrompt = detectedLanguage !== 'en'
      ? `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable PREVENTION plan to avoid this disease in the future. Respond ONLY with the prevention steps, no extra explanation. Respond in ${detectedLanguage} language.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nPREVENTION in ${detectedLanguage}:`
      : `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable PREVENTION plan to avoid this disease in the future. Respond ONLY with the prevention steps, no extra explanation.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nPREVENTION:`;

    const prevention = await generateAnswer(preventionPrompt);
    
    logger.info(`Prevention generated: ${prevention.length} characters`);
    console.log(`[${requestId}] SUCCESS: Prevention generated (${prevention.length} characters)`);
    process.stdout.write(`[${requestId}] Prevention complete: ${prevention.length} chars\n`);

    logger.info('IMAGE REQUEST COMPLETE - Sending response');
    console.log(`[${requestId}] SUCCESS - Sending response`);
    console.log(separator);
    console.log(`IMAGE REQUEST COMPLETE - ID: ${requestId} - TIME: ${new Date().toISOString()}`);
    console.log(separator + '\n');
    process.stdout.write(`[${requestId}] Request completed successfully\n\n`);

    return res.status(200).json({
      treatment,
      prevention,
      detectedLanguage,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error processing disease description: ${errorMsg}`, error);
    console.error(`[${requestId}] ERROR: ${errorMsg}`);
    process.stderr.write(`[${requestId}] ERROR: ${errorMsg}\n`);
    
    if (error instanceof Error && error.stack) {
      console.error(`[${requestId}] Stack trace:`);
      console.error(error.stack);
      process.stderr.write(`[${requestId}] Stack: ${error.stack}\n`);
    }
    
    console.log(separator);
    console.log(`IMAGE REQUEST FAILED - ID: ${requestId} - TIME: ${new Date().toISOString()}`);
    console.log(separator + '\n');
    process.stderr.write(`[${requestId}] Request failed\n\n`);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
