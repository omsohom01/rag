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
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/chat', chatRouter);
app.use('/image', imageRouter);
app.use('/supply-chain', supplyChainRouter);
app.use('/notify', notificationRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
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
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
