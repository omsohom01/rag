export function buildRAGPrompt(
  query: string,
  context: string,
  targetLanguage: string = 'English',
  languageCode: string = 'en'
): string {

  const languageInstruction =
    languageCode !== 'en' ? `Respond in ${targetLanguage}.` : 'Respond in English.';

  return `
You are a farming advisor.

Use the context ONLY if it clearly answers the question.
If the context is insufficient or unclear, ignore it and answer normally using your own knowledge.
Never say you don't know or that information is missing.
Be practical and concise (70–90 words).
${languageInstruction}

Context:
${context}

Question:
${query}

Answer:
`;
}
