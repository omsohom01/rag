import { detectLanguage, translateText, translateAnswer } from '../src/lib/translator';

async function testTranslation() {
  console.log('=== Translation Feature Test ===\n');

  // Test 1: Spanish query
  const spanishQuery = '¿Cuál es el mejor fertilizante para el maíz?';
  console.log('Test 1 - Spanish Query:');
  console.log('Original:', spanishQuery);
  
  const lang1 = await detectLanguage(spanishQuery);
  console.log('Detected Language:', lang1);
  
  const englishFromSpanish = await translateText(spanishQuery, 'en');
  console.log('Translated to English:', englishFromSpanish);
  console.log('');

  // Test 2: French query
  const frenchQuery = 'Quelles sont les meilleures pratiques pour l\'irrigation des tomates?';
  console.log('Test 2 - French Query:');
  console.log('Original:', frenchQuery);
  
  const lang2 = await detectLanguage(frenchQuery);
  console.log('Detected Language:', lang2);
  
  const englishFromFrench = await translateText(frenchQuery, 'en');
  console.log('Translated to English:', englishFromFrench);
  console.log('');

  // Test 3: English query (should not translate)
  const englishQuery = 'What is the best fertilizer for corn?';
  console.log('Test 3 - English Query:');
  console.log('Original:', englishQuery);
  
  const lang3 = await detectLanguage(englishQuery);
  console.log('Detected Language:', lang3);
  
  const englishFromEnglish = await translateText(englishQuery, 'en');
  console.log('After processing:', englishFromEnglish);
  console.log('');

  // Test 4: Hindi query
  const hindiQuery = 'गेहूं की फसल के लिए सर्वोत्तम बीज कौन से हैं?';
  console.log('Test 4 - Hindi Query:');
  console.log('Original:', hindiQuery);
  
  const lang4 = await detectLanguage(hindiQuery);
  console.log('Detected Language:', lang4);
  
  const englishFromHindi = await translateText(hindiQuery, 'en');
  console.log('Translated to English:', englishFromHindi);
  console.log('');

  // Test 5: Answer translation (simulate RAG answer being translated back)
  const ragAnswer = 'The best fertilizer for corn is nitrogen-rich fertilizer applied at the right stage of growth.';
  console.log('Test 5 - Answer Translation to Spanish:');
  console.log('Original Answer:', ragAnswer);
  
  const translatedAnswer = await translateAnswer(ragAnswer, 'es');
  console.log('Translated to Spanish:', translatedAnswer);
  console.log('');

  console.log('=== All Tests Completed ===');
}

testTranslation().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
