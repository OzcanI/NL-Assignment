import { AutoMessage } from '../models';
import { queueService } from './queueService';
import * as cron from 'node-cron';

class CronService {
  private cronJob: cron.ScheduledTask | null = null;
  private readonly CRON_EXPRESSION = '* * * * *'; // Her dakika çalışır

  start(): void {
    console.log('⏰ Cron servisi başlatılıyor...');
    
    // İlk çalıştırma
    this.processAutoMessages();
    
    // Cron job'ı başlat
    this.cronJob = cron.schedule(this.CRON_EXPRESSION, () => {
      this.processAutoMessages();
    }, {
      timezone: 'Europe/Istanbul'
    });
    
    console.log('✅ Cron servisi başlatıldı (her dakika)');
    console.log(`📅 Cron expression: ${this.CRON_EXPRESSION}`);
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Cron servisi durduruldu');
    }
  }

  private async processAutoMessages(): Promise<void> {
    try {
      console.log('🔍 Otomatik mesajlar kontrol ediliyor...');
      
      const now = new Date();
      
      // Gönderim zamanı gelmiş ve henüz kuyruğa eklenmemiş mesajları bul
      const pendingMessages = await AutoMessage.find({
        sendDate: { $lte: now },
        isQueued: false,
        isSent: false,
        isFailed: false
      })

      console.log(`📋 ${pendingMessages.length} adet bekleyen otomatik mesaj bulundu`);

      for (const autoMessage of pendingMessages) {
        try {
          // Mesajı kuyruğa ekle
          await queueService.addMessageToQueue({
            autoMessageId: (autoMessage as any)._id.toString(),
            conversationId: (autoMessage as any).conversationId.toString(),
            content: (autoMessage as any).content,
            messageType: (autoMessage as any).messageType,
            senderId: (autoMessage as any).senderId.toString(),
            sendDate: (autoMessage as any).sendDate.toISOString()
          });

          // AutoMessage'ı kuyruğa eklendi olarak işaretle
          await AutoMessage.findByIdAndUpdate((autoMessage as any)._id, {
            isQueued: true,
            queuedAt: new Date()
          });

          console.log(`✅ Otomatik mesaj kuyruğa eklendi: ${(autoMessage as any)._id}`);

        } catch (error) {
          console.error(`❌ Otomatik mesaj kuyruğa ekleme hatası (${(autoMessage as any)._id}):`, error);
          
          // Hata durumunda AutoMessage'ı işaretle
          await AutoMessage.findByIdAndUpdate((autoMessage as any)._id, {
            isFailed: true,
            errorMessage: error instanceof Error ? error.message : 'Queue error',
            failedAt: new Date()
          });
        }
      }

      // İstatistikler
      const stats = await this.getAutoMessageStats();
      console.log('📊 Otomatik mesaj istatistikleri:', stats);

    } catch (error) {
      console.error('❌ Otomatik mesaj işleme hatası:', error);
    }
  }

  // Manuel tetikleme (test için)
  async triggerNow(): Promise<void> {
    console.log('🚀 Manuel tetikleme başlatıldı');
    await this.processAutoMessages();
  }

  // İstatistikler
  async getAutoMessageStats(): Promise<any> {
    try {
      const now = new Date();
      
      const stats = await AutoMessage.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lte: ['$sendDate', now] },
                      { $eq: ['$isQueued', false] },
                      { $eq: ['$isSent', false] },
                      { $eq: ['$isFailed', false] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            queued: {
              $sum: {
                $cond: [
                  { $eq: ['$isQueued', true] },
                  1,
                  0
                ]
              }
            },
            sent: {
              $sum: {
                $cond: [
                  { $eq: ['$isSent', true] },
                  1,
                  0
                ]
              }
            },
            failed: {
              $sum: {
                $cond: [
                  { $eq: ['$isFailed', true] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      return stats[0] || {
        total: 0,
        pending: 0,
        queued: 0,
        sent: 0,
        failed: 0
      };
    } catch (error) {
      console.error('❌ İstatistik alma hatası:', error);
      return {
        total: 0,
        pending: 0,
        queued: 0,
        sent: 0,
        failed: 0
      };
    }
  }

  // Servis durumu
  getStatus(): any {
    return {
      isRunning: this.cronJob !== null,
      cronExpression: this.CRON_EXPRESSION,
      lastRun: new Date().toISOString()
    };
  }
}

export const cronService = new CronService(); 