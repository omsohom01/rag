import 'dotenv/config';
import { getIndex } from '../src/lib/pinecone';
import { logger } from '../src/utils/logger';

async function clearIndex() {
  try {
    console.log('⚠️  WARNING: This will delete ALL vectors from the Pinecone index!');
    console.log('Starting in 3 seconds...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const index = await getIndex();
    
    console.log('Deleting all vectors...');
    await index.deleteAll();
    
    console.log('✓ Successfully cleared the index');
    logger.info('Index cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear index:', error);
    logger.error('Failed to clear index', error);
    process.exit(1);
  }
}

clearIndex();
