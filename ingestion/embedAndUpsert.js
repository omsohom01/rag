"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedAndUpsertChunks = embedAndUpsertChunks;
const gemini_1 = require("../src/lib/gemini");
const pinecone_1 = require("../src/lib/pinecone");
const logger_1 = require("../src/utils/logger");
const retry_1 = require("../src/utils/retry");
function generateChunkId(source, index) {
    const sanitized = source.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitized}_chunk_${index}`;
}
async function embedAndUpsertChunks(chunks) {
    logger_1.logger.info(`Starting embedding and upserting ${chunks.length} chunks`);
    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
            const embedding = await (0, retry_1.withRetry)(() => (0, gemini_1.embedText)(chunk.text), { maxAttempts: 3, delayMs: 1000 });
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
                logger_1.logger.info(`Embedded ${i + 1}/${chunks.length} chunks`);
            }
            await sleep(100);
        }
        catch (error) {
            logger_1.logger.error(`Failed to embed chunk ${i}`, error);
            throw error;
        }
    }
    logger_1.logger.info('Upserting vectors to Pinecone');
    await (0, pinecone_1.upsertVectors)(vectors);
    logger_1.logger.info('Successfully upserted all vectors');
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
