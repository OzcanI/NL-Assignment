import { Request, Response } from 'express';
import { rabbitMQService, MessageData } from '../services/rabbitmq';

export class RabbitMQController {
  // RabbitMQ durumunu kontrol et
  static async getStatus(req: any, res: Response): Promise<void> {
    try {
      res.json({
        connected: rabbitMQService.getConnectionStatus(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'RabbitMQ durum kontrolü hatası', details: error });
    }
  }

  // Queue oluştur
  static async createQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName, options } = req.body;
      
      if (!queueName) {
        res.status(400).json({ error: 'Queue name gerekli' });
        return;
      }
      
      await rabbitMQService.createQueue(queueName, options);
      res.json({ 
        success: true, 
        message: 'Queue oluşturuldu',
        queueName
      });
    } catch (error) {
      res.status(500).json({ error: 'Queue oluşturma hatası', details: error });
    }
  }

  // Mesaj gönder
  static async publishMessage(req: Request, res: Response): Promise<void> {
    try {
      const { queueName, message, messageType = 'test' } = req.body;
      
      if (!queueName || !message) {
        res.status(400).json({ error: 'Queue name ve message gerekli' });
        return;
      }
      
      const messageData: MessageData = {
        id: Date.now().toString(),
        type: messageType,
        data: message,
        timestamp: new Date()
      };
      
      const result = await rabbitMQService.publishMessage(queueName, messageData);
      res.json({ 
        success: result, 
        messageId: messageData.id,
        queueName,
        timestamp: messageData.timestamp
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesaj gönderme hatası', details: error });
    }
  }

  // Queue bilgisi al
  static async getQueueInfo(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      const queueInfo = await rabbitMQService.getQueueInfo(queueName as string);
      
      res.json({ 
        queueName, 
        info: queueInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Queue bilgisi alma hatası', details: error });
    }
  }

  // Queue temizle
  static async purgeQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      await rabbitMQService.purgeQueue(queueName as string);
      
      res.json({ 
        success: true, 
        message: 'Queue temizlendi',
        queueName
      });
    } catch (error) {
      res.status(500).json({ error: 'Queue temizleme hatası', details: error });
    }
  }

  // Queue sil
  static async deleteQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      await rabbitMQService.deleteQueue(queueName as string);
      
      res.json({ 
        success: true, 
        message: 'Queue silindi',
        queueName
      });
    } catch (error) {
      res.status(500).json({ error: 'Queue silme hatası', details: error });
    }
  }

  // Mesaj dinlemeye başla
  static async startConsuming(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      
      // Bu endpoint sadece dinlemeyi başlatır, gerçek mesaj işleme ayrı bir süreçte olmalı
      res.json({ 
        success: true, 
        message: 'Mesaj dinleme başlatıldı',
        queueName,
        note: 'Mesajlar ayrı bir süreçte işleniyor'
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesaj dinleme hatası', details: error });
    }
  }

  // Batch mesaj gönder
  static async publishBatchMessages(req: Request, res: Response): Promise<void> {
    try {
      const { queueName, messages } = req.body;
      
      if (!queueName || !messages || !Array.isArray(messages)) {
        res.status(400).json({ error: 'Queue name ve messages array gerekli' });
        return;
      }
      
      const results = [];
      
      for (const message of messages) {
        const messageData: MessageData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: message.type || 'batch',
          data: message.data,
          timestamp: new Date()
        };
        
        const result = await rabbitMQService.publishMessage(queueName, messageData);
        results.push({
          messageId: messageData.id,
          success: result,
          data: message.data
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Batch mesajlar gönderildi',
        queueName,
        totalMessages: messages.length,
        results
      });
    } catch (error) {
      res.status(500).json({ error: 'Batch mesaj gönderme hatası', details: error });
    }
  }
} 