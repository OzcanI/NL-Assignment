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

// Online kullanıcı durumu işlemleri
router.get('/online/count', RedisController.getOnlineUserCount);
router.get('/online/status/:userId', RedisController.checkUserOnlineStatus);
router.get('/online/users', RedisController.getOnlineUserIds);

export default router; 