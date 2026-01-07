# ✅ Render Deployment Checklist

## Pre-Deployment Verification

### 1. Project Structure ✓
```
✓ src/server.ts - Express entry point
✓ src/routes/chat.ts - Chat API endpoint
✓ src/lib/ - Gemini & Pinecone integration
✓ src/utils/ - Logger & retry utilities
✓ ingestion/ - Manual PDF ingestion (not in server)
✓ dist/ - TypeScript build output
```

### 2. Build Configuration ✓
- ✓ `pnpm build` compiles successfully
- ✓ `pnpm start` runs the server
- ✓ Output directory: `dist/`
- ✓ Main entry: `dist/src/server.js`

### 3. API Endpoints ✓
- ✓ `POST /chat` - RAG chatbot endpoint
- ✓ `GET /health` - Health check

### 4. Dependencies ✓
Production:
- ✓ express
- ✓ cors
- ✓ dotenv
- ✓ @google/generative-ai
- ✓ @pinecone-database/pinecone
- ✓ pdf-parse

DevDependencies:
- ✓ typescript
- ✓ tsx
- ✓ @types/node
- ✓ @types/express
- ✓ @types/cors

### 5. Environment Variables Required
```env
GEMINI_API_KEY=<your-key>
PINECONE_API_KEY=<your-key>
PINECONE_ENV=<environment>
PINECONE_INDEX=<index-name>
NODE_ENV=production
PORT=3000
```

## Render Setup

### Step 1: GitHub Push
```bash
git add .
git commit -m "Deploy to Render"
git push origin main
```

### Step 2: Render Configuration

**Service Type:** Web Service

**Build Command:**
```bash
pnpm install && pnpm build
```

**Start Command:**
```bash
pnpm start
```

**Environment:** Node

### Step 3: Add Environment Variables
Add all required env vars in Render Dashboard → Environment

### Step 4: Deploy
Click "Create Web Service"

## Post-Deployment

### Verify Deployment
1. Check Render logs for successful startup
2. Test health endpoint: `https://your-app.onrender.com/health`
3. Test chat endpoint with POST request

### Example API Test
```bash
curl -X POST https://your-app.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is this about?"}'
```

### Run Ingestion (One-Time)
Before using the chatbot, ingest PDFs locally:
```bash
# Add PDFs to pdfs/ directory
pnpm ingest
```

This uploads embeddings to Pinecone, which the deployed server will query.

## Important Notes

✓ **Ingestion does NOT run on server startup**
✓ **Manual ingestion only** - run `pnpm ingest` locally
✓ **CORS enabled** for frontend integration
✓ **Production error handling** sanitizes sensitive data
✓ **No Vercel dependencies** removed
✓ **Long-running Node server** (not serverless)

## Monitoring

- **Logs:** Render Dashboard → Your Service → Logs
- **Health Check:** GET `/health` returns `{"status": "ok"}`
- **Debug Mode:** Set `RAG_DEBUG=true` for detailed RAG logs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check pnpm install completes, verify TypeScript compiles |
| Server crashes | Check environment variables are set correctly |
| Empty responses | Verify Pinecone has data (run ingestion) |
| CORS errors | Verify CORS middleware is enabled (it is) |

---

**Status:** ✅ Ready for Render Deployment
