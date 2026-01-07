import * as path from 'path';
import * as dotenv from 'dotenv';
import { loadPDFsFromDirectory } from './pdfLoader';
import { chunkDocuments } from './chunker';
import { embedAndUpsertChunks } from './embedAndUpsert';
import { logger } from '../src/utils/logger';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  try {
    logger.info('Starting PDF ingestion process');

    const pdfsDir = path.join(__dirname, '..', 'pdfs');
    logger.info(`Loading PDFs from: ${pdfsDir}`);

    const documents = await loadPDFsFromDirectory(pdfsDir);

    if (documents.length === 0) {
      logger.warn('No documents to process');
      return;
    }

    logger.info(`Loaded ${documents.length} documents`);

    const docsForChunking = documents.map((doc) => ({
      text: doc.text,
      source: doc.filename,
    }));

    const chunks = chunkDocuments(docsForChunking);

    await embedAndUpsertChunks(chunks);

    logger.info('Ingestion completed successfully');
  } catch (error) {
    logger.error('Ingestion failed', error);
    process.exit(1);
  }
}

main();
