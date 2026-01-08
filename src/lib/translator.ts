import translate from 'google-translate-api-x';
import { logger } from '../utils/logger';

// Mapping of language names to language codes
const languageMap: { [key: string]: string } = {
  'afrikaans': 'af',
  'arabic': 'ar',
  'armenian': 'hy',
  'basque': 'eu',
  'bengali': 'bn',
  'bulgarian': 'bg',
  'catalan': 'ca',
  'chinese': 'zh',
  'chinese simplified': 'zh-CN',
  'chinese traditional': 'zh-TW',
  'danish': 'da',
  'dutch': 'nl',
  'english': 'en',
  'finnish': 'fi',
  'french': 'fr',
  'german': 'de',
  'greek': 'el',
  'gujarati': 'gu',
  'hebrew': 'he',
  'hindi': 'hi',
  'hungarian': 'hu',
  'indonesian': 'id',
  'italian': 'it',
  'japanese': 'ja',
  'kannada': 'kn',
  'korean': 'ko',
  'lithuanian': 'lt',
  'malay': 'ms',
  'malayalam': 'ml',
  'marathi': 'mr',
  'norwegian': 'no',
  'odia': 'or',
  'polish': 'pl',
  'portuguese': 'pt',
  'punjabi': 'pa',
  'romanian': 'ro',
  'russian': 'ru',
  'slovak': 'sk',
  'spanish': 'es',
  'swedish': 'sv',
  'tamil': 'ta',
  'telugu': 'te',
  'thai': 'th',
  'turkish': 'tr',
  'ukrainian': 'uk',
  'urdu': 'ur',
  'vietnamese': 'vi',
};

// List of supported language codes
const supportedLanguages = Object.values(languageMap);

/**
 * Detect the language of a given text
 * @param text - The text to detect language for
 * @returns Language code (e.g., 'es', 'fr', 'de') or 'en' if English or undetectable
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    // Use Google Translate API to detect language
    const result = await translate(text, { to: 'en' });
    
    const detectedLang = result.from?.language?.iso || 'en';
    logger.info('Language detection result', { text: text.substring(0, 50), detected: detectedLang });
    
    return detectedLang;
  } catch (error) {
    logger.warn('Language detection failed, defaulting to English', error);
    return 'en';
  }
}

/**
 * Translate text from source language to target language
 * @param text - Text to translate
 * @param targetLang - Target language code (default: 'en')
 * @returns Translated text
 */
export async function translateText(text: string, targetLang: string = 'en'): Promise<string> {
  try {
    if (targetLang === 'en') {
      // If target is English, detect source and translate to English
      const sourceLang = await detectLanguage(text);
      if (sourceLang === 'en') {
        return text; // Already in English
      }
      const result = await translate(text, { to: 'en' });
      logger.info('Translation to English', { 
        sourceLang,
        text: text.substring(0, 50),
        translated: result.text.substring(0, 50)
      });
      return result.text;
    } else {
      // Translate from English to target language
      const result = await translate(text, { from: 'en', to: targetLang });
      logger.info('Translation from English', { 
        targetLang,
        text: text.substring(0, 50),
        translated: result.text.substring(0, 50)
      });
      return result.text;
    }
  } catch (error) {
    logger.error('Translation error', error);
    return text; // Return original text if translation fails
  }
}

/**
 * Translate answer back to original language
 * @param answer - The answer text to translate
 * @param originalLanguage - The original language code
 * @returns Translated answer
 */
export async function translateAnswer(answer: string, originalLanguage: string): Promise<string> {
  if (originalLanguage === 'en') {
    return answer; // Already in English
  }

  return translateText(answer, originalLanguage);
}

/**
 * Translate to English (alias for translateText with target 'en')
 * @param text - Text to translate
 * @param sourceLang - Source language code (optional)
 * @returns Translated text in English
 */
export async function translateToEnglish(text: string, sourceLang?: string): Promise<string> {
  return translateText(text, 'en');
}

/**
 * Translate from English to target language
 * @param text - Text to translate
 * @param targetLang - Target language code
 * @returns Translated text
 */
export async function translateFromEnglish(text: string, targetLang: string): Promise<string> {
  return translateText(text, targetLang);
}

/**
 * Check if text is in English
 * @param text - Text to check
 * @returns true if in English, false otherwise
 */
export async function isEnglish(text: string): Promise<boolean> {
  const lang = await detectLanguage(text);
  return lang === 'en';
}

