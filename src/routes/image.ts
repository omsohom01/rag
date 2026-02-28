import 'dotenv/config';
import { generateAnswer } from '../lib/gemini';
import { logger } from '../utils/logger';
import { detectLanguage, translateToEnglish } from '../lib/translator';

interface VercelRequest {
  method: string;
  body: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'description is required and must be a string' });
    }

    logger.info('Processing disease description', { description });
    console.log(`\n🦠 Disease Description: "${description}"`);

    // Step 1: Detect language
    const detectedLanguage = await detectLanguage(description);
    console.log(`🌍 Detected Language: ${detectedLanguage}`);

    let englishDescription = description;

    // Step 2: Translate to English if not already in English
    if (detectedLanguage !== 'en') {
      console.log('🔄 Translating to English...');
      englishDescription = await translateToEnglish(description, detectedLanguage);
      console.log(`📖 English Description: "${englishDescription}"`);
    }

    console.log('-'.repeat(60));

    // Step 3: Generate treatment string
    console.log('💊 Generating treatment...');
    const treatmentPrompt = detectedLanguage !== 'en'
      ? `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable TREATMENT plan. Respond ONLY with the treatment steps, no extra explanation. Respond in ${detectedLanguage} language.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nTREATMENT in ${detectedLanguage}:`
      : `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable TREATMENT plan. Respond ONLY with the treatment steps, no extra explanation.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nTREATMENT:`;

    const treatment = await generateAnswer(treatmentPrompt);
    console.log(`✓ Treatment generated (${treatment.length} chars)`);

    // Step 4: Generate prevention string
    console.log('🛡️ Generating prevention...');
    const preventionPrompt = detectedLanguage !== 'en'
      ? `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable PREVENTION plan to avoid this disease in the future. Respond ONLY with the prevention steps, no extra explanation. Respond in ${detectedLanguage} language.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nPREVENTION in ${detectedLanguage}:`
      : `You are an expert agricultural plant disease specialist. Given the following plant/crop disease description, provide a concise and actionable PREVENTION plan to avoid this disease in the future. Respond ONLY with the prevention steps, no extra explanation.\n\nDISEASE DESCRIPTION: ${englishDescription}\n\nPREVENTION:`;

    const prevention = await generateAnswer(preventionPrompt);
    console.log(`✓ Prevention generated (${prevention.length} chars)`);

    console.log('-'.repeat(60));

    return res.status(200).json({
      treatment,
      prevention,
      detectedLanguage,
    });
  } catch (error) {
    logger.error('Error processing disease description', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
