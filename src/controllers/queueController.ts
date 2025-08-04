import { Request, Response } from 'express';
import { queueService } from '../services/queueService';
import { cronService } from '../services/cronService';

export class QueueController {
  // Kuyruk durumu
  static async getQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await queueService.getQueueStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({ error: 'Kuyruk durumu alma hatası', details: error });
    }
  }

  // Cron servisi durumu
  static async getCronStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = cronService.getStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({ error: 'Cron durumu alma hatası', details: error });
    }
  }

  // Manuel tetikleme
  static async triggerCron(req: Request, res: Response): Promise<void> {
    try {
      console.log('Cron servisi manuel olarak tetiklendi')
      await cronService.triggerNow();
      
      res.json({
        success: true,
        message: 'Cron servisi manuel olarak tetiklendi'
      });
    } catch (error) {
      res.status(500).json({ error: 'Cron tetikleme hatası', details: error });
    }
  }

  // Cron servisini durdur
  static async stopCron(req: Request, res: Response): Promise<void> {
    try {
      cronService.stop();
      
      res.json({
        success: true,
        message: 'Cron servisi durduruldu'
      });
    } catch (error) {
      res.status(500).json({ error: 'Cron durdurma hatası', details: error });
    }
  }

  // Cron servisini başlat
  static async startCron(req: Request, res: Response): Promise<void> {
    try {
      cronService.start();
      
      res.json({
        success: true,
        message: 'Cron servisi başlatıldı'
      });
    } catch (error) {
      res.status(500).json({ error: 'Cron başlatma hatası', details: error });
    }
  }
} 