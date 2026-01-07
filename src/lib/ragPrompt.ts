export function buildRAGPrompt(query: string, context: string): string {
  return `You are a helpful assistant that answers questions based solely on the provided context.

CONTEXT:
${context}

INSTRUCTIONS:
- Answer the question using ONLY the information from the context above
- If the answer cannot be found in the context, respond with: "Information not found in provided documents."
- Keep your response concise and factual
- Do not add information from outside the provided context
- Do not make assumptions or inferences beyond what is explicitly stated

QUESTION: ${query}

ANSWER:`;
}
