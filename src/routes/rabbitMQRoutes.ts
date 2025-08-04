import { Router } from 'express';
import { RabbitMQController } from '../controllers/rabbitMQController';
import { QueueController } from '../controllers/queueController';

const router = Router();

// RabbitMQ durum kontrolü
router.get('/status', RabbitMQController.getStatus);

// Queue işlemleri
router.post('/queue', RabbitMQController.createQueue);
router.get('/queue/:queueName', RabbitMQController.getQueueInfo);
router.delete('/queue/:queueName', RabbitMQController.deleteQueue);
router.delete('/queue/:queueName/purge', RabbitMQController.purgeQueue);

// Mesaj işlemleri
router.post('/publish', RabbitMQController.publishMessage);
router.post('/publish/batch', RabbitMQController.publishBatchMessages);
router.post('/consume/:queueName', RabbitMQController.startConsuming);

// AutoMessage Queue yönetimi endpoints
router.get('/auto-queue/status', QueueController.getQueueStatus);
router.get('/cron/status', QueueController.getCronStatus);
router.post('/cron/trigger', QueueController.triggerCron);
router.post('/cron/stop', QueueController.stopCron);
router.post('/cron/start', QueueController.startCron);

export default router; 