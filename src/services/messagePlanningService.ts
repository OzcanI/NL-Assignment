import { User, AutoMessage, Conversation } from '../models';
import { queueService } from './queueService';
import mongoose from 'mongoose';
import * as cron from 'node-cron';

interface UserPair {
  sender: any;
  receiver: any;
}

interface MessageTemplate {
  content: string;
  messageType: string;
}

class MessagePlanningService {
  private cronJob: cron.ScheduledTask | null = null;
  private readonly CRON_EXPRESSION = '0 2 * * *'; // Her gün 02:00'da çalışır

  // Mesaj şablonları
  private readonly messageTemplates: MessageTemplate[] = [
    { content: "Merhaba! Nasılsın?", messageType: "text" },
    { content: "Günaydın! Bugün nasıl geçiyor?", messageType: "text" },
    { content: "Selam! Yeni bir gün başladı, umarım güzel geçer.", messageType: "text" },
    { content: "Hey! Ne yapıyorsun?", messageType: "text" },
    { content: "Merhaba! Bugün hava nasıl?", messageType: "text" },
    { content: "Selam! Nasıl gidiyor hayat?", messageType: "text" },
    { content: "Hey! Uzun zamandır görüşemedik.", messageType: "text" },
    { content: "Merhaba! Yeni projeler var mı?", messageType: "text" },
    { content: "Selam! Bugün planların neler?", messageType: "text" },
    { content: "Hey! Nasıl bir gün geçiriyorsun?", messageType: "text" }
  ];

  start(): void {
    console.log('📅 Mesaj planlama servisi başlatılıyor...');
    
    // Cron job'ı başlat
    this.cronJob = cron.schedule(this.CRON_EXPRESSION, () => {
      console.log('🕐 Mesaj planlama zamanı geldi!');
      this.planMessages();
    }, {
      timezone: 'Europe/Istanbul'
    });
    
    console.log('✅ Mesaj planlama servisi başlatıldı (Her gece 02:00)');
    console.log(`📅 Cron expression: ${this.CRON_EXPRESSION}`);
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Mesaj planlama servisi durduruldu');
    }
  }

  private async planMessages(): Promise<void> {
    try {
      console.log('🎯 Mesaj planlama başlatılıyor...');
      
      // Aktif kullanıcıları getir
      const activeUsers = await this.getActiveUsers();
      console.log(`👥 ${activeUsers.length} aktif kullanıcı bulundu`);
      
      if (activeUsers.length < 2) {
        console.log('⚠️ Yeterli aktif kullanıcı yok (en az 2 gerekli)');
        return;
      }
      
      // Kullanıcıları eşleştir
      const userPairs = this.createUserPairs(activeUsers);
      console.log('userPairs', userPairs)
      console.log(`🤝 ${userPairs.length} kullanıcı çifti oluşturuldu`);
      
      // Her çift için mesaj planla
      let createdCount = 0;
      for (const pair of userPairs) {
        try {
          await this.createMessageForPair(pair);
          createdCount++;
        } catch (error) {
          console.error(`❌ Çift için mesaj oluşturma hatası:`, error);
        }
      }
      
      console.log(`✅ ${createdCount} otomatik mesaj planlandı`);
      
      // İstatistikleri logla
      await this.logPlanningStats(createdCount, userPairs.length);
      
    } catch (error) {
      console.error('❌ Mesaj planlama hatası:', error);
    }
  }

  private async getActiveUsers(): Promise<any[]> {
    try {
      // Son 30 gün içinde aktif olan kullanıcıları getir
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUsers = await User.find({
        isActive: true,
        lastLoginAt: { $gte: thirtyDaysAgo }
      }).select('_id username firstName lastName email profile');
      console.log('activeUsers', activeUsers)
      return activeUsers;
    } catch (error) {
      console.error('❌ Aktif kullanıcıları getirme hatası:', error);
      return [];
    }
  }

  private createUserPairs(users: any[]): UserPair[] {
    const pairs: UserPair[] = [];
    const shuffledUsers = this.shuffleArray([...users]);
    
    // İkişerli gruplar oluştur
    for (let i = 0; i < shuffledUsers.length - 1; i += 2) {
      pairs.push({
        sender: shuffledUsers[i],
        receiver: shuffledUsers[i + 1]
      });
    }
    
    // Tek kalan kullanıcı varsa, ilk kullanıcı ile eşleştir
    if (shuffledUsers.length % 2 === 1) {
      pairs.push({
        sender: shuffledUsers[shuffledUsers.length - 1],
        receiver: shuffledUsers[0]
      });
    }
    
    return pairs;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp!;
    }
    return shuffled;
  }

  private async createMessageForPair(pair: UserPair): Promise<void> {
    try {
      // Önce konuşma var mı kontrol et, yoksa oluştur
      let conversation = await this.findOrCreateConversation(pair.sender._id, pair.receiver._id);
      
      // Rastgele mesaj şablonu seç
      const templateIndex = Math.floor(Math.random() * this.messageTemplates.length);
      const template = this.messageTemplates[templateIndex];
      
      if (!template) {
        throw new Error('Mesaj şablonu bulunamadı');
      }
      
      // Gönderim tarihini belirle (1-7 gün sonra)
      const sendDate = this.generateRandomSendDate();
      
      // Yeni otomatik mesaj oluştur
      const newAutoMessage = new AutoMessage({
        conversationId: conversation._id,
        senderId: pair.sender._id,
        content: template.content,
        messageType: template.messageType,
        sendDate: sendDate,
        repeatType: 'none',
        repeatInterval: null,
        isQueued: false,
        isSent: false,
        isFailed: false,
        metadata: {
          planningType: 'auto_match',
          receiverId: pair.receiver._id,
          plannedAt: new Date()
        }
      });
      
      await newAutoMessage.save();
      
      console.log(`📝 Mesaj planlandı: ${pair.sender.username} -> ${pair.receiver.username} (${sendDate.toLocaleDateString()})`);
      
    } catch (error) {
      console.error(`❌ Çift için mesaj oluşturma hatası:`, error);
      throw error;
    }
  }

  private async findOrCreateConversation(senderId: any, receiverId: any): Promise<any> {
    try {
      // ObjectId'leri string'e çevir
      const senderObjectId = senderId.toString();
      const receiverObjectId = receiverId.toString();
      
      // Önce mevcut konuşma var mı kontrol et
      let conversation = await Conversation.findOne({
        type: 'direct',
        participants: { 
          $all: [senderObjectId, receiverObjectId],
          $size: 2
        }
      });
      
      if (!conversation) {
        // Yeni konuşma oluştur
        conversation = new Conversation({
          name: `Direct Chat`,
          type: 'direct',
          participants: [senderObjectId, receiverObjectId],
          creatorId: senderObjectId,
          description: 'Otomatik oluşturulan konuşma',
          isActive: true
        });
        
        await conversation.save();
        console.log(`💬 Yeni konuşma oluşturuldu: ${senderObjectId} - ${receiverObjectId}`);
      }
      
      return conversation;
    } catch (error) {
      console.error('❌ Konuşma bulma/oluşturma hatası:', error);
      throw error;
    }
  }

  private generateRandomSendDate(): Date {
    const now = new Date();
    const futureDate = new Date(now);
    
    // 1-7 gün sonra rastgele bir tarih
    const randomDays = Math.floor(Math.random() * 7) + 1;
    futureDate.setDate(futureDate.getDate() + randomDays);
    
    // Saat 09:00-18:00 arası rastgele
    const randomHour = Math.floor(Math.random() * 9) + 9; // 9-17 arası
    const randomMinute = Math.floor(Math.random() * 60);
    
    futureDate.setHours(randomHour, randomMinute, 0, 0);
    
    return futureDate;
  }

  private async logPlanningStats(createdCount: number, pairCount: number): Promise<void> {
    try {
      const stats = {
        date: new Date().toISOString(),
        planningType: 'auto_match',
        totalPairs: pairCount,
        createdMessages: createdCount,
        successRate: pairCount > 0 ? (createdCount / pairCount * 100).toFixed(2) + '%' : '0%'
      };
      
      console.log('📊 Planlama İstatistikleri:', stats);
      
      // İsteğe bağlı: İstatistikleri veritabanına kaydet
      // await PlanningStats.create(stats);
      
    } catch (error) {
      console.error('❌ İstatistik kaydetme hatası:', error);
    }
  }

  // Manuel tetikleme (test için)
  async triggerNow(): Promise<void> {
    console.log('🚀 Manuel mesaj planlama tetiklendi');
    await this.planMessages();
  }

  // Servis durumu
  getStatus(): any {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(2, 0, 0, 0); // 02:00
    
    return {
      isRunning: this.cronJob !== null,
      cronExpression: this.CRON_EXPRESSION,
      nextRun: nextRun.toISOString(),
      timeUntilNextRun: nextRun.getTime() - now.getTime()
    };
  }
}

export const messagePlanningService = new MessagePlanningService(); 