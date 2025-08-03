import { Request, Response } from 'express';
import { redisService } from '../services/redis';

export class RedisController {
  // Redis durumunu kontrol et
  static async getStatus(req: any, res: Response): Promise<void> {
    try {
      res.json({
        connected: redisService.getConnectionStatus(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Redis durum kontrolü hatası', details: error });
    }
  }

  // Redis'e değer kaydet
  static async setValue(req: Request, res: Response): Promise<void> {
    try {
      const { key, value, ttl } = req.body;
      
      if (!key || !value) {
        res.status(400).json({ error: 'Key ve value gerekli' });
        return;
      }
      
      await redisService.set(key, value, ttl);
      res.json({ 
        success: true, 
        message: 'Değer kaydedildi',
        key,
        ttl: ttl || 'süresiz'
      });
    } catch (error) {
      res.status(500).json({ error: 'Redis SET hatası', details: error });
    }
  }

  // Redis'ten değer al
  static async getValue(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const value = await redisService.get(key as string);
      
      res.json({ 
        key, 
        value, 
        exists: value !== null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Redis GET hatası', details: error });
    }
  }

  // Redis'ten değer sil
  static async deleteValue(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const deletedCount = await redisService.del(key as string);
      
      res.json({ 
        success: deletedCount > 0,
        message: deletedCount > 0 ? 'Değer silindi' : 'Değer bulunamadı',
        key,
        deletedCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Redis DEL hatası', details: error });
    }
  }

  // Redis'te değer var mı kontrol et
  static async checkExists(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const exists = await redisService.exists(key as string);
      
      res.json({ 
        key, 
        exists: exists > 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Redis EXISTS hatası', details: error });
    }
  }

  // Redis ping testi
  static async ping(req: Request, res: Response): Promise<void> {
    try {
      const response = await redisService.ping();
      res.json({ 
        success: true,
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Redis PING hatası', details: error });
    }
  }

  // Redis'te TTL ayarla
  static async setExpiry(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { seconds } = req.body;
      
      if (!seconds || seconds <= 0) {
        res.status(400).json({ error: 'Geçerli bir süre (seconds) gerekli' });
        return;
      }
      
      const success = await redisService.expire(key as string, seconds);
      res.json({ 
        success,
        message: success ? 'TTL ayarlandı' : 'Key bulunamadı',
        key,
        seconds
      });
    } catch (error) {
      res.status(500).json({ error: 'Redis EXPIRE hatası', details: error });
    }
  }
} 