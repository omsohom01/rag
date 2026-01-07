"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkText = chunkText;
exports.chunkDocuments = chunkDocuments;
const logger_1 = require("../src/utils/logger");
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
function estimateTokenCount(text) {
    return Math.ceil(text.split(/\s+/).length);
}
function chunkText(text, source) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;
    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence)
            continue;
        const potentialChunk = currentChunk + ' ' + trimmedSentence;
        const tokenCount = estimateTokenCount(potentialChunk);
        if (tokenCount > CHUNK_SIZE && currentChunk) {
            chunks.push({
                text: currentChunk.trim(),
                index: chunkIndex,
                source,
            });
            const words = currentChunk.split(/\s+/);
            const overlapWords = words.slice(-CHUNK_OVERLAP);
            currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
            chunkIndex++;
        }
        else {
            currentChunk = potentialChunk;
        }
    }
    if (currentChunk.trim()) {
        chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex,
            source,
        });
    }
    logger_1.logger.info(`Chunked document: ${source}`, {
        totalChunks: chunks.length,
        avgChunkSize: Math.round(chunks.reduce((sum, c) => sum + estimateTokenCount(c.text), 0) / chunks.length),
    });
    return chunks;
}
function chunkDocuments(documents) {
    const allChunks = [];
    for (const doc of documents) {
        const chunks = chunkText(doc.text, doc.source);
        allChunks.push(...chunks);
    }
    logger_1.logger.info(`Total chunks created: ${allChunks.length}`);
    return allChunks;
}
