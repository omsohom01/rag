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

/**
 * Extracts text from a JSON entry
 * Looks for common text fields: text, content, answer
 * For Q&A format, returns only the answer (question stored in metadata)
 */
function extractTextFromEntry(entry: JSONEntry): string {
  if (entry.text) return entry.text;
  if (entry.content) return entry.content;
  if (entry.answer) return entry.answer;
  if (entry.question) return entry.question;
  
  // Fallback: stringify the entire object
  return JSON.stringify(entry);
}

/**
 * Extracts metadata from a JSON entry, excluding text fields
 */
function extractMetadata(entry: JSONEntry): Record<string, any> {
  const metadata: Record<string, any> = {};
  const textFields = new Set(['text', 'content', 'answer', 'question']);
  
  for (const [key, value] of Object.entries(entry)) {
    if (!textFields.has(key) && value !== null && value !== undefined) {
      // Only include primitive values and simple objects
      if (typeof value !== 'object' || Array.isArray(value)) {
        metadata[key] = value;
      }
    }
  }
  
  return metadata;
}

/**
 * Loads a single JSON file and converts entries to documents
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

    const documents: JSONDocument[] = [];

    for (const entry of data) {
      if (typeof entry === 'object' && entry !== null) {
        const text = extractTextFromEntry(entry);
        const metadata = extractMetadata(entry);

        documents.push({
          text,
          filename,
          metadata,
        });
      }
    }

    logger.info(`Loaded ${documents.length} entries from JSON file: ${filename}`);
    return documents;
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
      const docs = await loadJSONFile(filePath);
      allDocuments.push(...docs);
    }

    logger.info(`Total JSON entries loaded: ${allDocuments.length}`);
    return allDocuments;
  } catch (error) {
    logger.error('Failed to load JSON files from directory', error);
    throw error;
  }
}
