import { embedText } from '../src/lib/gemini';
import { upsertVectors, VectorMetadata } from '../src/lib/pinecone';
import { logger } from '../src/utils/logger';
import { withRetry } from '../src/utils/retry';
import { TextChunk } from './chunker';

function generateChunkId(source: string, index: number): string {
  const sanitized = source.replace(/[^a-zA-Z0-9]/g, '_');
  return `${sanitized}_chunk_${index}`;
}

export async function embedAndUpsertChunks(chunks: TextChunk[]): Promise<void> {
  logger.info(`Starting embedding and upserting ${chunks.length} chunks`);

  const BATCH_SIZE = 10;
  const vectors: { id: string; values: number[]; metadata: VectorMetadata }[] = [];

  // Process chunks in parallel batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
    
    logger.info(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`);

    try {
      // Embed all chunks in the batch in parallel
      const embeddings = await Promise.all(
        batch.map((chunk) =>
          withRetry(
            () => embedText(chunk.text),
            { maxAttempts: 3, delayMs: 1000 }
          )
        )
      );

      // Create vectors from embeddings
      batch.forEach((chunk, idx) => {
        vectors.push({
          id: generateChunkId(chunk.source, chunk.index),
          values: embeddings[idx],
          metadata: {
            text: chunk.text,
            source: chunk.source,
            chunkIndex: chunk.index,
            ...chunk.metadata,
          },
        });
      });

      logger.info(`✓ Completed batch ${batchNumber}/${totalBatches} - Total embedded: ${vectors.length}/${chunks.length}`);

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(500);
      }
    } catch (error) {
      logger.error(`Failed to embed batch ${batchNumber}`, error);
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
