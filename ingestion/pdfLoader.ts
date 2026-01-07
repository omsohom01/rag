import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';
import { logger } from '../src/utils/logger';

export interface PDFDocument {
  filename: string;
  text: string;
  pageCount: number;
}

export async function loadPDF(filePath: string): Promise<PDFDocument> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);

    logger.info(`Loaded PDF: ${path.basename(filePath)}`, {
      pages: data.numpages,
      textLength: data.text.length,
    });

    return {
      filename: path.basename(filePath),
      text: data.text,
      pageCount: data.numpages,
    };
  } catch (error) {
    logger.error(`Error loading PDF: ${filePath}`, error);
    throw error;
  }
}

export async function loadPDFsFromDirectory(dirPath: string): Promise<PDFDocument[]> {
  try {
    const files = fs.readdirSync(dirPath);
    const pdfFiles = files.filter((file) => file.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      logger.warn(`No PDF files found in ${dirPath}`);
      return [];
    }

    logger.info(`Found ${pdfFiles.length} PDF files`);

    const documents: PDFDocument[] = [];
    for (const file of pdfFiles) {
      const filePath = path.join(dirPath, file);
      const doc = await loadPDF(filePath);
      documents.push(doc);
    }

    return documents;
  } catch (error) {
    logger.error(`Error loading PDFs from directory: ${dirPath}`, error);
    throw error;
  }
}
