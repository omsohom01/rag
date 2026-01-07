import { embedText } from '../lib/gemini';
import { upsertVectors, VectorMetadata } from '../lib/pinecone';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { TextChunk } from './chunker';

function generateChunkId(source: string, index: number): string {
  const sanitized = source.replace(/[^a-zA-Z0-9]/g, '_');
  return `${sanitized}_chunk_${index}`;
}

export async function embedAndUpsertChunks(chunks: TextChunk[]): Promise<void> {
  logger.info(`Starting embedding and upserting ${chunks.length} chunks`);

  const vectors: { id: string; values: number[]; metadata: VectorMetadata }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      const embedding = await withRetry(
        () => embedText(chunk.text),
        { maxAttempts: 3, delayMs: 1000 }
      );

      vectors.push({
        id: generateChunkId(chunk.source, chunk.index),
        values: embedding,
        metadata: {
          text: chunk.text,
          source: chunk.source,
          chunkIndex: chunk.index,
        },
      });

      if ((i + 1) % 10 === 0) {
        logger.info(`Embedded ${i + 1}/${chunks.length} chunks`);
      }

      await sleep(100);
    } catch (error) {
      logger.error(`Failed to embed chunk ${i}`, error);
      throw error;
    }
  }

  logger.info('Upserting vectors to Pinecone');
  await upsertVectors(vectors);
  logger.info('Successfully upserted all vectors');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
