import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { redisService } from './services/redis';
import { rabbitMQService } from './services/rabbitmq';
import { mongoDBService } from './services/mongodb';
import { socketService } from './services/socket';
import { queueService } from './services/queueService';
import { cronService } from './services/cronService';
import { messagePlanningService } from './services/messagePlanningService';

// Routes
import redisRoutes from './routes/redisRoutes';
import rabbitMQRoutes from './routes/rabbitMQRoutes';
import mongoDBRoutes from './routes/mongoDBRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import messageRoutes from './routes/messageRoutes';
import socketRoutes from './routes/socketRoutes';
import autoMessageRoutes from './routes/autoMessageRoutes';
import planningRoutes from './routes/planningRoutes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env['PORT'] || 3000;

// Initialize services
async function initializeServices() {
  try {
    // MongoDB bağlantısı
    await mongoDBService.connect();
    
    // Redis bağlantısı
    await redisService.connect();
    
    // RabbitMQ bağlantısı
    await rabbitMQService.connect();
    
          // Test queue oluştur
      await rabbitMQService.createQueue('test-queue');
      
      // Queue servisi başlat
      await queueService.initialize();
      
      // Cron servisi başlat
      cronService.start();
      
      // Mesaj planlama servisi başlat
      messagePlanningService.start();
      
      // Socket.IO başlat
      socketService.initialize(server);
    
    console.log('✅ Tüm servisler başarıyla başlatıldı');
  } catch (error) {
    console.error('❌ Servis başlatma hatası:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Hoş geldiniz! TypeScript Node.js API çalışıyor.',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Merhaba Dünya!',
    language: 'TypeScript',
    framework: 'Express.js'
  });
});

// API Routes
app.use('/api/redis', redisRoutes);
app.use('/api/rabbitmq', rabbitMQRoutes);
app.use('/api/mongodb', mongoDBRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/socket', socketRoutes);
app.use('/api/auto-messages', autoMessageRoutes);
app.use('/api/planning', planningRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Bir şeyler ters gitti!',
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Sayfa bulunamadı',
    path: req.originalUrl
  });
});

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API endpoint: http://localhost:${PORT}/api/hello`);
  await initializeServices();
  console.log(`🔗 Redis status: http://localhost:${PORT}/api/redis/status`);
      console.log(`🐰 RabbitMQ status: http://localhost:${PORT}/api/rabbitmq/status`);
    console.log(`🐍 MongoDB status: http://localhost:${PORT}/api/mongodb/status`);
    console.log(`🔌 Socket.IO status: http://localhost:${PORT}/api/socket/status`);
    console.log(`⏰ AutoMessage status: http://localhost:${PORT}/api/auto-messages/stats`);
    console.log(`📅 Message Planning status: http://localhost:${PORT}/api/planning/status`);
});

export default app;