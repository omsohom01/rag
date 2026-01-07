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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadJSONsFromDirectory = loadJSONsFromDirectory;
var fs = __importStar(require("fs/promises"));
var path = __importStar(require("path"));
var logger_1 = require("../src/utils/logger");
/**
 * Extracts text from a JSON entry
 * Looks for common text fields: text, content, answer
 * For Q&A format, combines question and answer
 */
function extractTextFromEntry(entry) {
    if (entry.text)
        return entry.text;
    if (entry.content)
        return entry.content;
    if (entry.answer && entry.question) {
        return "Question: ".concat(entry.question, "\nAnswer: ").concat(entry.answer);
    }
    if (entry.answer)
        return entry.answer;
    if (entry.question)
        return entry.question;
    // Fallback: stringify the entire object
    return JSON.stringify(entry);
}
/**
 * Extracts metadata from a JSON entry, excluding text fields
 */
function extractMetadata(entry) {
    var metadata = {};
    var textFields = new Set(['text', 'content', 'answer', 'question']);
    for (var _i = 0, _a = Object.entries(entry); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
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
function loadJSONFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var content, data, filename, documents, _i, data_1, entry, text, metadata, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 1:
                    content = _a.sent();
                    data = JSON.parse(content);
                    filename = path.basename(filePath);
                    if (!Array.isArray(data)) {
                        logger_1.logger.warn("JSON file ".concat(filename, " is not an array, skipping"));
                        return [2 /*return*/, []];
                    }
                    documents = [];
                    for (_i = 0, data_1 = data; _i < data_1.length; _i++) {
                        entry = data_1[_i];
                        if (typeof entry === 'object' && entry !== null) {
                            text = extractTextFromEntry(entry);
                            metadata = extractMetadata(entry);
                            documents.push({
                                text: text,
                                filename: filename,
                                metadata: metadata,
                            });
                        }
                    }
                    logger_1.logger.info("Loaded ".concat(documents.length, " entries from JSON file: ").concat(filename));
                    return [2 /*return*/, documents];
                case 2:
                    error_1 = _a.sent();
                    logger_1.logger.error("Failed to load JSON file: ".concat(filePath), error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Loads all JSON files from a directory
 */
function loadJSONsFromDirectory(dirPath) {
    return __awaiter(this, void 0, void 0, function () {
        var files, jsonFiles, allDocuments, _i, jsonFiles_1, file, filePath, docs, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, fs.readdir(dirPath)];
                case 1:
                    files = _a.sent();
                    jsonFiles = files.filter(function (f) { return f.toLowerCase().endsWith('.json'); });
                    if (jsonFiles.length === 0) {
                        logger_1.logger.info('No JSON files found in directory');
                        return [2 /*return*/, []];
                    }
                    logger_1.logger.info("Found ".concat(jsonFiles.length, " JSON file(s)"));
                    allDocuments = [];
                    _i = 0, jsonFiles_1 = jsonFiles;
                    _a.label = 2;
                case 2:
                    if (!(_i < jsonFiles_1.length)) return [3 /*break*/, 5];
                    file = jsonFiles_1[_i];
                    filePath = path.join(dirPath, file);
                    return [4 /*yield*/, loadJSONFile(filePath)];
                case 3:
                    docs = _a.sent();
                    allDocuments.push.apply(allDocuments, docs);
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    logger_1.logger.info("Total JSON entries loaded: ".concat(allDocuments.length));
                    return [2 /*return*/, allDocuments];
                case 6:
                    error_2 = _a.sent();
                    logger_1.logger.error('Failed to load JSON files from directory', error_2);
                    throw error_2;
                case 7: return [2 /*return*/];
            }
        });
    });
}
