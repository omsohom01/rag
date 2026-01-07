import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger';

let pinecone: Pinecone | null = null;
let indexName: string | null = null;

function getClient(): Pinecone {
  if (!pinecone) {
    const apiKey = process.env.PINECONE_API_KEY;
    indexName = process.env.PINECONE_INDEX || null;
    
    if (!apiKey || !indexName) {
      throw new Error('PINECONE_API_KEY and PINECONE_INDEX environment variables are required');
    }
    
    pinecone = new Pinecone({ apiKey });
  }
  return pinecone;
}

export interface VectorMetadata {
  text: string;
  source: string;
  chunkIndex: number;
  [key: string]: string | number;
}

export interface QueryMatch {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export async function getIndex() {
  const client = getClient();
  if (!indexName) {
    throw new Error('PINECONE_INDEX is not defined');
  }
  return client.index(indexName);
}

export async function upsertVectors(
  vectors: { id: string; values: number[]; metadata: VectorMetadata }[]
): Promise<void> {
  try {
    const index = await getIndex();
    
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      logger.info(`Upserted batch ${Math.floor(i / batchSize) + 1}`, {
        count: batch.length,
      });
    }
  } catch (error) {
    logger.error('Error upserting vectors', error);
    throw error;
  }
}

export async function queryVectors(
  queryVector: number[],
  topK: number = 5
): Promise<QueryMatch[]> {
  try {
    const index = await getIndex();
    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    return (queryResponse.matches || []).map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as unknown as VectorMetadata,
    }));
  } catch (error) {
    logger.error('Error querying vectors', error);
    throw error;
  }
}
