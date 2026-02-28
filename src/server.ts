import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import chatRouter from './routes/chat';
import imageRouter from './routes/image';
import supplyChainRouter from './routes/supplyChain';
import notificationRouter from './routes/notification';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images

// Request logging
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} [${new Date().toISOString()}]`);
  process.stdout.write(`[HTTP] ${req.method} ${req.path}\n`);
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
console.log('🛣️  Registering routes...');
app.use('/chat', chatRouter);
console.log('  ✅ /chat');
app.use('/image', imageRouter);
console.log('  ✅ /image');
app.use('/supply-chain', supplyChainRouter);
console.log('  ✅ /supply-chain');
app.use('/notify', notificationRouter);
console.log('  ✅ /notify');
console.log('🛣️  All routes registered!\n');

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check OK');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ══════════════════════════════════════════');
  console.log(`🚀 SERVER STARTED on port ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Firebase: ${process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 'CONFIGURED' : 'NOT SET'}`);
  console.log(`🚀 Gemini Keys: ${(process.env.GEMINI_API_KEY || '').split(',').length}`);
  console.log(`🚀 WhatsApp Token: ${process.env.WHATSAPP_ACCESS_TOKEN ? 'SET' : 'NOT SET'}`);
  console.log('🚀 ══════════════════════════════════════════\n');
  process.stdout.write(`[SERVER] ✅ Listening on port ${PORT}\n`);
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
