import { embedText } from '../src/lib/gemini';
import { upsertVectors, VectorMetadata } from '../src/lib/pinecone';
import { logger } from '../src/utils/logger';
import { withRetry } from '../src/utils/retry';
import { TextChunk } from './chunker';
import { randomUUID } from 'crypto';

// Track all generated IDs globally to detect duplicates
const allGeneratedIds = new Set<string>();
let duplicatesDetected = false;

function generateChunkId(source: string, index: number): string {
  if (duplicatesDetected) {
    // Switch to UUID mode if duplicates were detected
    return `${source.replace(/[^a-zA-Z0-9]/g, '_')}_${randomUUID()}`;
  }
  
  const sanitized = source.replace(/[^a-zA-Z0-9]/g, '_');
  const id = `${sanitized}_chunk_${index}`;
  
  // Check for duplicates
  if (allGeneratedIds.has(id)) {
    logger.warn(`🚨 DUPLICATE ID DETECTED: ${id}`);
    logger.warn(`Source: ${source}, Index: ${index}`);
    duplicatesDetected = true;
    // Switch to UUID mode
    const uniqueId = `${sanitized}_${randomUUID()}`;
    allGeneratedIds.add(uniqueId);
    return uniqueId;
  }
  
  allGeneratedIds.add(id);
  return id;
}

export async function embedAndUpsertChunks(chunks: TextChunk[]): Promise<void> {
  logger.info(`Starting embedding and upserting ${chunks.length} chunks`);
  logger.info(`🔍 DIAGNOSTIC MODE: Tracking IDs and metadata for troubleshooting`);

  const BATCH_SIZE = 100;
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

      const batchStartIndex = vectors.length;

      // Create vectors from embeddings
      batch.forEach((chunk, idx) => {
        const id = generateChunkId(chunk.source, chunk.index);
        const embeddingLength = embeddings[idx].length;
        
        vectors.push({
          id,
          values: embeddings[idx],
          metadata: {
            text: chunk.text,
            source: chunk.source,
            chunkIndex: chunk.index,
            ...chunk.metadata,
          },
        });
      });

      // DIAGNOSTIC: Log batch details
      const batchVectors = vectors.slice(batchStartIndex);
      const first5Ids = batchVectors.slice(0, 5).map(v => v.id);
      const last5Ids = batchVectors.slice(-5).map(v => v.id);
      const embeddingDimension = embeddings[0]?.length || 0;
      
      logger.info(`📊 Batch ${batchNumber} Vector IDs:`);
      logger.info(`   First 5: ${first5Ids.join(', ')}`);
      logger.info(`   Last 5: ${last5Ids.join(', ')}`);
      logger.info(`   Embedding dimension: ${embeddingDimension}`);
      logger.info(`   Sources in batch: ${[...new Set(batch.map(c => c.source))].join(', ')}`);

      logger.info(`✓ Completed batch ${batchNumber}/${totalBatches} - Total embedded: ${vectors.length}/${chunks.length}`);

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(200);
      }
    } catch (error) {
      logger.error(`Failed to embed batch ${batchNumber}`, error);
      throw error;
    }
  }

  // DIAGNOSTIC: Final summary before upsert
  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`📈 PRE-UPSERT SUMMARY:`);
  logger.info(`   Total vectors created: ${vectors.length}`);
  logger.info(`   Unique IDs: ${allGeneratedIds.size}`);
  logger.info(`   Duplicates detected: ${duplicatesDetected ? 'YES ⚠️' : 'NO ✓'}`);
  logger.info(`   Expected dimension: ${vectors[0]?.values.length || 0}`);
  
  const sourceCounts: Record<string, number> = {};
  vectors.forEach(v => {
    sourceCounts[v.metadata.source] = (sourceCounts[v.metadata.source] || 0) + 1;
  });
  logger.info(`   Vectors by source:`);
  Object.entries(sourceCounts).forEach(([source, count]) => {
    logger.info(`     - ${source}: ${count} vectors`);
  });
  logger.info(`${'='.repeat(60)}\n`);

  logger.info('Upserting vectors to Pinecone');
  await upsertVectors(vectors);
  logger.info('Successfully upserted all vectors');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
