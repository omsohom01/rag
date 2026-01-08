import * as path from 'path';
import * as dotenv from 'dotenv';
import { loadPDFsFromDirectory } from './pdfLoader';
import { loadJSONsFromDirectory } from './jsonLoader';
import { chunkDocuments } from './chunker';
import { embedAndUpsertChunks } from './embedAndUpsert';
import { logger } from '../src/utils/logger';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  try {
    logger.info('Starting document ingestion process');
    logger.info('🔍 DIAGNOSTIC MODE ENABLED - Full logging active');

    const pdfsDir = path.join(__dirname, '..', 'pdfs');
    logger.info(`Loading documents from: ${pdfsDir}`);

    // Load PDFs
    logger.info('--- Loading PDF files ---');
    const pdfDocuments = await loadPDFsFromDirectory(pdfsDir);
    logger.info(`Loaded ${pdfDocuments.length} PDF documents`);

    // Load JSONs
    logger.info('--- Loading JSON files ---');
    const jsonDocuments = await loadJSONsFromDirectory(pdfsDir);
    logger.info(`Loaded ${jsonDocuments.length} JSON entries`);

    const totalDocuments = pdfDocuments.length + jsonDocuments.length;

    if (totalDocuments === 0) {
      logger.warn('No documents to process');
      return;
    }

    logger.info(`Total documents to process: ${totalDocuments} (${pdfDocuments.length} PDFs, ${jsonDocuments.length} JSON entries)`);

    // Convert PDFs to uniform format
    const pdfDocsForChunking = pdfDocuments.map((doc) => ({
      text: doc.text,
      source: doc.filename,
    }));

    // Convert JSONs to uniform format with metadata
    const jsonDocsForChunking = jsonDocuments.map((doc) => ({
      text: doc.text,
      source: doc.filename,
      metadata: doc.metadata,
    }));

    // Combine all documents
    const allDocs = [...pdfDocsForChunking, ...jsonDocsForChunking];

    logger.info('--- Chunking documents ---');
    const chunks = chunkDocuments(allDocs);
    
    // DIAGNOSTIC: Analyze chunks
    logger.info(`\n📊 Chunk Analysis:`);
    const chunksBySource: Record<string, number> = {};
    chunks.forEach(chunk => {
      chunksBySource[chunk.source] = (chunksBySource[chunk.source] || 0) + 1;
    });
    Object.entries(chunksBySource).forEach(([source, count]) => {
      logger.info(`   ${source}: ${count} chunks`);
    });
    
    // Check for index resets
    const indexesBySource: Record<string, number[]> = {};
    chunks.forEach(chunk => {
      if (!indexesBySource[chunk.source]) {
        indexesBySource[chunk.source] = [];
      }
      indexesBySource[chunk.source].push(chunk.index);
    });
    
    logger.info(`\n🔍 Index Range Check (detecting potential ID collisions):`);
    Object.entries(indexesBySource).forEach(([source, indices]) => {
      const min = Math.min(...indices);
      const max = Math.max(...indices);
      const hasReset = min === 0 || indices.includes(0);
      logger.info(`   ${source}: indices ${min} to ${max} ${hasReset ? '⚠️ (starts at 0 - potential collision!)' : '✓'}`);
    });

    logger.info('\n--- Embedding and upserting chunks ---');
    await embedAndUpsertChunks(chunks);

    logger.info('\n✓ Ingestion completed successfully');
    logger.info(`Summary: Processed ${totalDocuments} documents into ${chunks.length} chunks`);
  } catch (error) {
    logger.error('Ingestion failed', error);
    process.exit(1);
  }
}

main();
