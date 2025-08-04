import { Request, Response } from 'express';
import { messagePlanningService } from '../services/messagePlanningService';
import { AuthRequest } from '../middleware/auth';

export class PlanningController {
  // Planlama servisi durumu
  static async getPlanningStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const status = messagePlanningService.getStatus();
      
      res.json({
        success: true,
        data: {
          service: 'Message Planning Service',
          ...status,
          nextRunFormatted: new Date(status.nextRun).toLocaleString('tr-TR'),
          timeUntilNextRunFormatted: this.formatTime(status.timeUntilNextRun)
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Planlama durumu alma hatası', details: error });
    }
  }

  // Manuel tetikleme (sadece admin)
  static async triggerPlanning(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      // TODO: Admin kontrolü eklenebilir
      // if (!req.user?.isAdmin) {
      //   res.status(403).json({ error: 'Admin yetkisi gerekli' });
      //   return;
      // }

      await messagePlanningService.triggerNow();
      
      res.json({
        success: true,
        message: 'Mesaj planlama manuel olarak tetiklendi'
      });
    } catch (error) {
      res.status(500).json({ error: 'Planlama tetikleme hatası', details: error });
    }
  }

  // Planlama servisini durdur
  static async stopPlanning(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      // TODO: Admin kontrolü eklenebilir
      messagePlanningService.stop();
      
      res.json({
        success: true,
        message: 'Mesaj planlama servisi durduruldu'
      });
    } catch (error) {
      res.status(500).json({ error: 'Planlama durdurma hatası', details: error });
    }
  }

  // Planlama servisini başlat
  static async startPlanning(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      // TODO: Admin kontrolü eklenebilir
      messagePlanningService.start();
      
      res.json({
        success: true,
        message: 'Mesaj planlama servisi başlatıldı'
      });
    } catch (error) {
      res.status(500).json({ error: 'Planlama başlatma hatası', details: error });
    }
  }

  // Zaman formatı yardımcı fonksiyonu
  private static formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} gün ${hours % 24} saat ${minutes % 60} dakika`;
    } else if (hours > 0) {
      return `${hours} saat ${minutes % 60} dakika`;
    } else if (minutes > 0) {
      return `${minutes} dakika ${seconds % 60} saniye`;
    } else {
      return `${seconds} saniye`;
    }
  }
} 