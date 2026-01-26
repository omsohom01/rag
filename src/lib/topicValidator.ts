import { generateAnswer } from './gemini';
import { logger } from '../utils/logger';

/**
 * Validates if a query is related to allowed topics using AI analysis
 * Allowed topics: farming, agriculture, environment, weather, banking/loans, government schemes, farming news
 * @param query - The user's query to validate
 * @returns Object with isValid (boolean) and message (string)
 */
export async function validateQueryTopic(query: string): Promise<{
  isValid: boolean;
  message?: string;
}> {
  try {
    const validationPrompt = `You are a topic classifier. Analyze the following query and determine if it is related to ANY of these topics:

1. Farming or Agriculture (crops, livestock, farming techniques, soil, irrigation, harvesting, pest control, etc.)
2. Environment or Environmental issues (climate, pollution, conservation, biodiversity, sustainability, etc.)
3. Weather (rainfall, temperature, seasons, climate patterns, forecasts, etc.)
4. Banking or Bank Loans (agricultural loans, credit, financing, interest rates, loan schemes, etc.)
5. Government Schemes (subsidies, programs, policies, benefits for farmers, agricultural schemes, etc.)
6. Farming News or Agricultural Updates (market prices, policies, innovations, trends, etc.)

Analyze the INTENT and MEANING of the query, not just keywords. Consider:
- Is the core subject matter related to any of the above topics?
- Would a farmer, agricultural expert, or rural development professional find this relevant?
- Does it connect to rural livelihoods, agricultural economy, or farming-related concerns?

Query: "${query}"

Respond with ONLY one word:
- "VALID" if the query is related to any of the above topics
- "INVALID" if the query is NOT related to any of the above topics

Your response:`;

    const response = await generateAnswer(validationPrompt);
    const normalizedResponse = response.trim().toUpperCase();

    if (normalizedResponse.includes('VALID') && !normalizedResponse.includes('INVALID')) {
      logger.info('Topic validation: VALID', { query });
      return { isValid: true };
    } else {
      logger.info('Topic validation: INVALID', { query });
      return {
        isValid: false,
        message: 'Sorry, I can only answer questions related to farming, agriculture, environment, weather, banking/loans, government schemes, or farming news. Please ask a question related to these topics.',
      };
    }
  } catch (error) {
    logger.error('Error validating topic', error);
    // In case of error, allow the query to proceed (fail-open)
    return { isValid: true };
  }
}
