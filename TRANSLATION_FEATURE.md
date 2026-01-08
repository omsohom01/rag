# Multi-Language Translation Feature

## Overview

The RAG system now supports automatic language detection and translation. Any query in a non-English language will be:

1. **Detected** - Automatically identify the source language
2. **Translated to English** - Convert to English for RAG processing
3. **Processed** - Search knowledge base and generate answer in English
4. **Translated Back** - Return the final answer in the original language

## How It Works

### Request Flow

```
User Query (Any Language)
    ↓
Language Detection
    ↓
Translate to English (if needed)
    ↓
Embed English Query
    ↓
Search Pinecone Vector DB
    ↓
Generate Answer with RAG
    ↓
Translate Answer Back to Original Language
    ↓
Return Response
```

### Supported Languages

The system supports 40+ languages including:
- Spanish, French, German, Portuguese, Italian
- Chinese (Simplified & Traditional), Japanese, Korean
- Hindi, Tamil, Telugu, Marathi, Punjabi, Bengali, Gujarati
- Russian, Ukrainian, Polish, Romanian, Hungarian
- Arabic, Hebrew, Turkish, Thai, Vietnamese
- And many more...

## API Usage

### Request Format
```json
{
  "query": "¿Cuál es el mejor fertilizante para el maíz?"
}
```

### Response Format
```json
{
  "answer": "El mejor fertilizante para el maíz es un fertilizante rico en nitrógeno...",
  "sources": [
    {
      "source": "Found in documents: agri_knowledge_backup.json",
      "score": 0.85,
      "chunkIndex": 42
    }
  ]
}
```

## Examples

### Example 1: Spanish Query
**Input:**
```json
{
  "query": "¿Cómo controlo las plagas en mis cultivos?"
}
```

**Process:**
1. Detects Spanish (es)
2. Translates: "How do I control pests in my crops?"
3. Searches RAG knowledge base in English
4. Generates answer in English
5. Translates answer back to Spanish

**Output:**
```json
{
  "answer": "Para controlar las plagas en tus cultivos, puedes usar...",
  "sources": [...]
}
```

### Example 2: Hindi Query
**Input:**
```json
{
  "query": "गेहूं की सर्वोत्तम उपज के लिए क्या करना चाहिए?"
}
```

**Process:**
1. Detects Hindi (hi)
2. Translates to English for processing
3. Performs RAG search
4. Translates result back to Hindi

**Output:** Answer in Hindi

### Example 3: English Query
**Input:**
```json
{
  "query": "What is the best way to grow tomatoes?"
}
```

**Process:**
1. Detects English (en)
2. Skips translation (already in English)
3. Performs RAG search directly
4. Skips translation back

**Output:** Answer in English

## Key Features

✅ **Automatic Language Detection** - No need to specify language
✅ **Transparent Processing** - Users don't need to know about translation
✅ **Multi-Language Support** - Works with 40+ languages
✅ **Fallback Handling** - If translation fails, uses original text
✅ **Logging** - All language detections and translations are logged
✅ **Retry Logic** - Translation failures are retried up to 3 times

## Testing

### Run Translation Tests
```bash
pnpm test:translation
```

This will test:
- Spanish language detection and translation
- French language detection and translation
- English language handling (no translation needed)
- Hindi language detection and translation
- Answer translation to different languages

### Test Chat with Different Languages

```bash
# Spanish query
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Cuál es el mejor fertilizante para el maíz?"}'

# French query
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Quelles sont les meilleures pratiques d'\''irrigation?"}'

# Hindi query
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "गेहूं की अच्छी फसल के लिए क्या करें?"}'
```

## Implementation Details

### New Files Created

1. **`src/lib/translator.ts`** - Main translation module with functions:
   - `detectLanguage(text)` - Detects input language
   - `translateText(text, targetLang)` - Translates text
   - `translateAnswer(answer, language)` - Translates answer back
   - `isEnglish(text)` - Checks if text is English

### Modified Files

1. **`api/chat.ts`** - Updated to:
   - Detect query language
   - Translate query to English
   - Use English text for RAG processing
   - Translate final answer back to original language
   - Add retry logic for translation operations

2. **`package.json`** - Added:
   - New dependency: `google-translate-api-x`
   - New script: `test:translation`

## Environment Variables

The translation system uses `google-translate-api-x` library which doesn't require additional API keys. It uses public Google Translate endpoints.

## Error Handling

If translation fails at any point:
- The system logs the error
- Uses the original text as fallback
- Retries up to 3 times before giving up
- Continues with normal RAG processing

## Performance Considerations

- Each non-English query adds ~1-2 seconds (translation overhead)
- Translation happens in parallel with retry logic
- English queries have no performance impact
- Caching could be added in future for repeated queries

## Future Enhancements

Potential improvements:
1. Add translation caching to avoid re-translating common queries
2. Support for language-specific RAG models
3. Multilingual embeddings to reduce translation overhead
4. Language preference from user profile
5. Batch translation for multiple queries

## Troubleshooting

### Translation seems slow
- This is expected; translation adds 1-2 seconds per request
- Can be optimized with caching

### Translation quality issues
- Using Google Translate API for accuracy
- Consider providing feedback for incorrect translations
- Some languages may have better support than others

### Language not detected correctly
- Ensure the text contains enough words (minimum 3-5 words recommended)
- Some short queries may be misdetected
- The system will still work, just with incorrect language assumption

## Testing Locally

1. Start the server:
```bash
pnpm dev
```

2. Open another terminal and test:
```bash
pnpm test:translation
```

3. Or use the API directly:
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Pregunta en español aquí"}'
```
