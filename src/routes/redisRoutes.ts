import { Router } from 'express';
import { RedisController } from '../controllers/redisController';

const router = Router();

// Redis durum kontrolü
router.get('/status', RedisController.getStatus);

// Redis ping testi
router.get('/ping', RedisController.ping);

// Redis değer işlemleri
router.post('/set', RedisController.setValue);
router.get('/get/:key', RedisController.getValue);
router.delete('/delete/:key', RedisController.deleteValue);
router.get('/exists/:key', RedisController.checkExists);
router.post('/expire/:key', RedisController.setExpiry);

export default router; 