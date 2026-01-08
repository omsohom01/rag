import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../src/utils/logger';

export interface JSONDocument {
  text: string;
  filename: string;
  metadata: Record<string, any>;
}

interface JSONEntry {
  text?: string;
  content?: string;
  answer?: string;
  question?: string;
  [key: string]: any;
}

// Target chunk size in tokens (same as PDF chunks)
const TARGET_CHUNK_SIZE = 400;
const AVG_CHARS_PER_TOKEN = 4; // Approximate: 1 token ≈ 4 characters
const TARGET_CHUNK_CHARS = TARGET_CHUNK_SIZE * AVG_CHARS_PER_TOKEN; // ~1600 characters

/**
 * Extracts text from a JSON entry
 * For Q&A format, combines question and answer
 */
function extractTextFromEntry(entry: JSONEntry): string {
  // For Q&A format, combine question and answer to preserve context
  if (entry.question && entry.answer) {
    return `Q: ${entry.question}\nA: ${entry.answer}`;
  }
  
  if (entry.text) return entry.text;
  if (entry.content) return entry.content;
  if (entry.answer) return entry.answer;
  if (entry.question) return entry.question;
  
  // Fallback: stringify the entire object
  return JSON.stringify(entry);
}

/**
 * Combines multiple JSON entries into chunks of similar size to PDF chunks
 */
function combineEntriesIntoChunks(entries: JSONEntry[], filename: string): JSONDocument[] {
  const chunks: JSONDocument[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;
  let entryIds: number[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const text = extractTextFromEntry(entry);
    const textLength = text.length;

    // If adding this entry would exceed target size and we have content, save current chunk
    if (currentLength + textLength > TARGET_CHUNK_CHARS && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join('\n\n'),
        filename,
        metadata: {
          entryCount: currentChunk.length,
          entryIds: entryIds.map(id => String(id)),
          chunkIndex: chunks.length,
        },
      });
      
      // Start new chunk
      currentChunk = [];
      currentLength = 0;
      entryIds = [];
    }

    // Add entry to current chunk
    currentChunk.push(text);
    currentLength += textLength + 2; // +2 for the "\n\n" separator
    if (entry.id !== undefined) {
      entryIds.push(entry.id);
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join('\n\n'),
      filename,
      metadata: {
        entryCount: currentChunk.length,
        entryIds: entryIds.map(id => String(id)),
        chunkIndex: chunks.length,
      },
    });
  }

  return chunks;
}

/**
 * Loads a single JSON file and converts entries to balanced chunks
 */
async function loadJSONFile(filePath: string): Promise<JSONDocument[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const filename = path.basename(filePath);

    if (!Array.isArray(data)) {
      logger.warn(`JSON file ${filename} is not an array, skipping`);
      return [];
    }

    // Combine multiple entries into chunks of similar size to PDF chunks
    const chunks = combineEntriesIntoChunks(data, filename);

    logger.info(`Loaded ${data.length} entries from JSON file: ${filename}`);
    logger.info(`Combined into ${chunks.length} balanced chunks (~${TARGET_CHUNK_SIZE} tokens each)`);
    
    return chunks;
  } catch (error) {
    logger.error(`Failed to load JSON file: ${filePath}`, error);
    throw error;
  }
}

/**
 * Loads all JSON files from a directory
 */
export async function loadJSONsFromDirectory(dirPath: string): Promise<JSONDocument[]> {
  try {
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter((f) => f.toLowerCase().endsWith('.json'));

    if (jsonFiles.length === 0) {
      logger.info('No JSON files found in directory');
      return [];
    }

    logger.info(`Found ${jsonFiles.length} JSON file(s)`);

    const allDocuments: JSONDocument[] = [];

    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file);
      const chunks = await loadJSONFile(filePath);
      allDocuments.push(...chunks);
    }

    logger.info(`Total JSON chunks created: ${allDocuments.length}`);
    return allDocuments;
  } catch (error) {
    logger.error('Failed to load JSON files from directory', error);
    throw error;
  }
}
