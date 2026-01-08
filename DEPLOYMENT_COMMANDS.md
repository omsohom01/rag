# Quick Deployment Commands

## 1. Final Pre-Deployment Check (Run Locally)

```powershell
# Install dependencies
pnpm install

# Type check
pnpm run type-check

# Build
pnpm run build

# Run tests
pnpm tsx scripts/test-chat.ts
```

All should pass ✅

## 2. Commit to GitHub

```bash
git add .
git commit -m "Deploy RAG with translation system to Render"
git push origin main
```

## 3. Render Deployment Setup

1. Go to: https://dashboard.render.com/
2. Click: **New** → **Web Service**
3. Select your GitHub repository
4. Fill in settings:

```
Name: rag-backend
Environment: Node
Build Command: pnpm install && pnpm build
Start Command: pnpm start
```

5. Click: **Create Web Service**

## 4. Set Environment Variables

In Render Dashboard, go to **Environment** and add:

```
GEMINI_API_KEY=<your_key>
PINECONE_API_KEY=<your_key>
PINECONE_ENV=<your_env>
PINECONE_INDEX=<your_index>
NODE_ENV=production
PORT=3000
```

## 5. Test After Deployment

```bash
# Health check
curl https://your-service.onrender.com/health

# Chat endpoint
curl -X POST https://your-service.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is late blight?"}'

# Multilingual test
curl -X POST https://your-service.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "আলুতে লেট ব্লাইট রোগ কী?"}'
```

---

## Current Status: ✅ READY TO DEPLOY
