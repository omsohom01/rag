# RAG Backend - Render Deployment Guide

This backend is configured for deployment on Render as a Web Service.

## 🚀 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Create New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:

**Build Settings:**
- **Name:** `rag-backend` (or your preferred name)
- **Environment:** `Node`
- **Build Command:** `pnpm install && pnpm build`
- **Start Command:** `pnpm start`

### 3. Environment Variables

Add these in Render Dashboard → Environment:

```env
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENV=your_pinecone_environment
PINECONE_INDEX=your_pinecone_index_name
NODE_ENV=production
PORT=3000
```

Optional:
```env
RAG_DEBUG=false
```

### 4. Deploy

Click **Create Web Service**. Render will:
- Install dependencies with pnpm
- Build TypeScript → JavaScript
- Start the Express server

## 📡 API Endpoints

### POST /chat
Send a query to the RAG chatbot.

**Request:**
```json
{
  "query": "What is the main topic of the document?"
}
```

**Response:**
```json
{
  "answer": "The document discusses...",
  "sources": [
    {
      "source": "document.pdf",
      "score": 0.85,
      "chunkIndex": 3
    }
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## 🔄 Manual Ingestion

Ingestion does **NOT** run on startup. To ingest PDFs:

1. Add PDF files to the `pdfs/` directory
2. Run locally:
   ```bash
   pnpm ingest
   ```

This updates your Pinecone index with the new document embeddings.

## 🛠️ Local Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run ingestion
pnpm ingest

# Type check
pnpm type-check
```

## 📁 Project Structure

```
rag/
├── src/
│   ├── server.ts          # Express server entry
│   ├── routes/
│   │   └── chat.ts        # Chat API route
│   ├── lib/
│   │   ├── gemini.ts      # Gemini AI integration
│   │   ├── pinecone.ts    # Pinecone vector DB
│   │   └── ragPrompt.ts   # RAG prompt builder
│   └── utils/
│       ├── logger.ts      # Logging utility
│       └── retry.ts       # Retry logic
├── ingestion/
│   ├── ingest.ts          # Manual ingestion script
│   ├── chunker.ts         # Text chunking
│   ├── embedAndUpsert.ts  # Embedding & upload
│   └── pdfLoader.ts       # PDF parsing
├── scripts/
│   ├── test-chat.ts       # Test chat flow
│   └── test-rag.ts        # Test RAG retrieval
├── pdfs/                  # PDF documents
├── dist/                  # Compiled JavaScript
└── package.json
```

## 🔒 Security Notes

- Never commit `.env` file
- All secrets configured via Render Dashboard
- CORS enabled for frontend integration
- Production error messages sanitized

## 📊 Monitoring

Monitor your service at:
- Render Dashboard → Your Service → Logs
- Check `/health` endpoint for uptime monitoring

## 🐛 Troubleshooting

**Build fails:**
- Verify all environment variables are set
- Check build logs in Render Dashboard

**Runtime errors:**
- Check service logs in Render
- Verify Pinecone index has data (run ingestion)
- Confirm API keys are valid

**Empty responses:**
- Ensure PDFs have been ingested
- Check Pinecone index contains vectors
- Enable `RAG_DEBUG=true` for detailed logs
