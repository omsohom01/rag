# RAG Backend

Backend-only RAG chatbot using Gemini and Pinecone.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENV=your_pinecone_environment
PINECONE_INDEX=your_index_name
```

3. Add PDF files to `pdfs/` directory

4. Run ingestion:
```bash
npm run ingest
```

5. Deploy to Vercel or run locally:
```bash
npm run dev
```

## API Usage

POST `/api/chat`
```json
{
  "query": "Your question here"
}
```

Response:
```json
{
  "answer": "Generated answer",
  "sources": [
    {
      "source": "document.pdf",
      "score": 0.85,
      "chunkIndex": 0
    }
  ]
}
```
