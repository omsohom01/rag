import { logger } from '../src/utils/logger';

export interface TextChunk {
  text: string;
  index: number;
  source: string;
  metadata?: Record<string, any>;
}

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 50;

function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).length);
}

export function chunkText(text: string, source: string, metadata?: Record<string, any>): TextChunk[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const potentialChunk = currentChunk + ' ' + trimmedSentence;
    const tokenCount = estimateTokenCount(potentialChunk);

    if (tokenCount > CHUNK_SIZE && currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        source,
        metadata,
      });

      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-CHUNK_OVERLAP);
      currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
      chunkIndex++;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      source,
      metadata,
    });
  }

  logger.info(`Chunked document: ${source}`, {
    totalChunks: chunks.length,
    avgChunkSize: Math.round(
      chunks.reduce((sum, c) => sum + estimateTokenCount(c.text), 0) / chunks.length
    ),
  });

  return chunks;
}

export function chunkDocuments(documents: { text: string; source: string; metadata?: Record<string, any> }[]): TextChunk[] {
  const allChunks: TextChunk[] = [];

  for (const doc of documents) {
    const chunks = chunkText(doc.text, doc.source, doc.metadata);
    allChunks.push(...chunks);
  }

  logger.info(`Total chunks created: ${allChunks.length}`);
  return allChunks;
}
