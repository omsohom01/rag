"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const pdfLoader_1 = require("./pdfLoader");
const chunker_1 = require("./chunker");
const embedAndUpsert_1 = require("./embedAndUpsert");
const logger_1 = require("../src/utils/logger");
dotenv.config({ path: path.join(__dirname, '..', '.env') });
async function main() {
    try {
        logger_1.logger.info('Starting PDF ingestion process');
        const pdfsDir = path.join(__dirname, '..', 'pdfs');
        logger_1.logger.info(`Loading PDFs from: ${pdfsDir}`);
        const documents = await (0, pdfLoader_1.loadPDFsFromDirectory)(pdfsDir);
        if (documents.length === 0) {
            logger_1.logger.warn('No documents to process');
            return;
        }
        logger_1.logger.info(`Loaded ${documents.length} documents`);
        const docsForChunking = documents.map((doc) => ({
            text: doc.text,
            source: doc.filename,
        }));
        const chunks = (0, chunker_1.chunkDocuments)(docsForChunking);
        await (0, embedAndUpsert_1.embedAndUpsertChunks)(chunks);
        logger_1.logger.info('Ingestion completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Ingestion failed', error);
        process.exit(1);
    }
}
main();
