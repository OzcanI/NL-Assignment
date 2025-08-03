import { Router } from 'express';
import { RabbitMQController } from '../controllers/rabbitMQController';

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

export default router; 