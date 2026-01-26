import { generateAnswer } from './gemini';
import { logger } from '../utils/logger';

// Pre-translated rejection messages to avoid additional API calls
const REJECTION_MESSAGES: Record<string, string> = {
  'en': 'Sorry, I can only answer questions related to farming, agriculture, environment, weather, banking/loans, government schemes, or farming news.',
  'hi': 'क्षमा करें, मैं केवल कृषि, पर्यावरण, मौसम, बैंकिंग/ऋण, सरकारी योजनाओं या कृषि समाचार से संबंधित प्रश्नों का उत्तर दे सकता हूं।',
  'bn': 'দুঃখিত, আমি শুধুমাত্র কৃষি, পরিবেশ, আবহাওয়া, ব্যাংকিং/ঋণ, সরকারী স্কিম বা কৃষি সংবাদ সম্পর্কিত প্রশ্নের উত্তর দিতে পারি।',
  'es': 'Lo siento, solo puedo responder preguntas relacionadas con agricultura, medio ambiente, clima, banca/préstamos, programas gubernamentales o noticias agrícolas.',
  'fr': 'Désolé, je ne peux répondre qu\'aux questions liées à l\'agriculture, l\'environnement, la météo, la banque/les prêts, les programmes gouvernementaux ou les actualités agricoles.',
  'de': 'Entschuldigung, ich kann nur Fragen zu Landwirtschaft, Umwelt, Wetter, Banking/Darlehen, Regierungsprogrammen oder Agrarwissenschaften beantworten.',
  'pt': 'Desculpe, posso responder apenas perguntas relacionadas a agricultura, meio ambiente, clima, bancos/empréstimos, programas governamentais ou notícias agrícolas.',
  'zh': '抱歉，我只能回答与农业、环境、天气、银行/贷款、政府计划或农业新闻相关的问题。',
  'ar': 'عذرًا، يمكنني الإجابة فقط على الأسئلة المتعلقة بالزراعة والبيئة والطقس والبنوك والقروض والمخططات الحكومية أو الأخبار الزراعية.',
  'ru': 'Извините, я могу ответить только на вопросы, связанные с сельским хозяйством, окружающей средой, погодой, банками/кредитами, государственными программами или сельскохозяйственными новостями.',
};

/**
 * Gets the rejection message in the specified language
 * @param languageCode - Language code (e.g., 'en', 'hi', 'bn')
 * @returns Rejection message in the specified language
 */
export function getRejectionMessage(languageCode: string = 'en'): string {
  return REJECTION_MESSAGES[languageCode] || REJECTION_MESSAGES['en'];
}

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
        message: getRejectionMessage('en'),
      };
    }
  } catch (error) {
    logger.error('Error validating topic', error);
    // In case of error, allow the query to proceed (fail-open)
    return { isValid: true };
  }
}
