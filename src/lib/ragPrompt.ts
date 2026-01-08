export function buildRAGPrompt(query: string, context: string, targetLanguage: string = 'en', languageCode: string = 'en'): string {
  const languageInstruction = languageCode !== 'en' 
    ? ` Respond in ${targetLanguage}.`
    : '';

  return `You are a farming advisor. Answer the question using only the information provided below.

CONTEXT:
${context}

RULES:
- Answer only using the context above
- If the context doesn't contain the answer, say "I don't have specific information about that at the moment."
- Keep answers concise (around 70-90 words)
- Be practical and direct
- Do not mention sources${languageInstruction}

QUESTION: ${query}

ANSWER:`;
}
