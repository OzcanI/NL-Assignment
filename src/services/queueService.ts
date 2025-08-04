import amqp, { Channel, Connection, Message, Options } from 'amqplib';
import { AutoMessage, Message as MessageModel, Conversation, User } from '../models';
import { socketService } from './socket';

interface QueueMessage {
  autoMessageId: string;
  conversationId: string;
  content: string;
  messageType: string;
  senderId: string;
  sendDate: string;
  retryCount?: number;
}

class QueueService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly QUEUE_NAME = 'message_sending_queue';
  private readonly RETRY_QUEUE_NAME = 'message_retry_queue';
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 5000; // 5 saniye

  async initialize(): Promise<void> {
    try {
      // RabbitMQ bağlantısı
      this.connection = await amqp.connect(process.env['RABBITMQ_URL'] || 'amqp://localhost:5672') as any;
      if (!this.connection) {
        throw new Error('RabbitMQ bağlantısı kurulamadı');
      }
      
      this.channel = await (this.connection as any).createChannel();
      if (!this.channel) {
        throw new Error('RabbitMQ channel oluşturulamadı');
      }

      // Ana kuyruk oluştur
      await this.channel.assertQueue(this.QUEUE_NAME, {
        durable: true,
        arguments: {
          'x-message-ttl': 300000, // 5 dakika TTL
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': this.RETRY_QUEUE_NAME
        }
      });

      // Retry kuyruğu oluştur
      await this.channel.assertQueue(this.RETRY_QUEUE_NAME, {
        durable: true,
        arguments: {
          'x-message-ttl': this.RETRY_DELAY
        }
      });

      // Consumer başlat
      await this.startConsumer();

      console.log('✅ Queue servisi başlatıldı');
    } catch (error) {
      console.error('❌ Queue servisi başlatma hatası:', error);
      throw error;
    }
  }

  // Producer: Mesajı kuyruğa ekle
  async addMessageToQueue(messageData: QueueMessage): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('Queue channel bağlantısı yok');
      }

      const message = JSON.stringify(messageData);
      console.log('message', message)
      await this.channel.sendToQueue(this.QUEUE_NAME, Buffer.from(message), {
        persistent: true,
        headers: {
          'x-retry-count': 0
        }
      });

      console.log(`📤 Mesaj kuyruğa eklendi: ${messageData.autoMessageId}`);
    } catch (error) {
      console.error('❌ Mesaj kuyruğa ekleme hatası:', error);
      throw error;
    }
  }

  // Consumer: Kuyruktaki mesajları işle
  private async startConsumer(): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('Queue channel bağlantısı yok');
      }

      // Ana kuyruk consumer'ı
      await this.channel.consume(this.QUEUE_NAME, async (msg) => {
        if (msg) {
          await this.processMessage(msg);
        }
      });

      // Retry kuyruk consumer'ı
      await this.channel.consume(this.RETRY_QUEUE_NAME, async (msg) => {
        if (msg) {
          await this.processRetryMessage(msg);
        }
      });

      console.log('✅ Queue consumer\'lar başlatıldı');
    } catch (error) {
      console.error('❌ Consumer başlatma hatası:', error);
      throw error;
    }
  }

  // Mesaj işleme
  private async processMessage(msg: Message): Promise<void> {
    try {
      const messageData: QueueMessage = JSON.parse(msg.content.toString());
      const retryCount = msg.properties.headers?.['x-retry-count'] || 0;

      console.log(`📨 Mesaj işleniyor: ${messageData.autoMessageId} (Deneme: ${retryCount + 1})`);

      // Mesajı veritabanına kaydet
      console.log('messageData', messageData)
      const newMessage = new MessageModel({
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        content: messageData.content,
        messageType: messageData.messageType,
        status: 'sent',
        metadata: {
          sentAt: new Date(),
          clientInfo: 'AutoMessage',
          autoMessageId: messageData.autoMessageId
        }
      });

      await newMessage.save();

      // Konuşmanın son mesaj bilgilerini güncelle
      const conversation = await Conversation.findById(messageData.conversationId);
      if (conversation) {
        (conversation as any).lastMessage = {
          content: messageData.content.length > 100 ? messageData.content.substring(0, 100) + '...' : messageData.content,
          sender: messageData.senderId,
          timestamp: new Date()
        };
        conversation.updatedAt = new Date();
        await conversation.save();
      }

      // Socket.IO ile gerçek zamanlı bildirim gönder
      const sender = await User.findById(messageData.senderId).select('username firstName lastName profile');
      const messagePayload = {
        id: newMessage._id,
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        senderName: sender?.username,
        sender: {
          id: sender?._id,
          username: sender?.username,
          firstName: sender?.firstName,
          lastName: sender?.lastName,
          displayName: sender?.profile?.displayName
        },
        content: messageData.content,
        messageType: messageData.messageType,
        status: 'sent',
        timestamp: new Date().toISOString(),
        createdAt: newMessage.createdAt
      };

      // Odadaki tüm kullanıcılara mesajı gönder
      socketService.sendToRoom(messageData.conversationId, 'new_message', messagePayload);

      // AutoMessage'ı güncelle
      await AutoMessage.findByIdAndUpdate(messageData.autoMessageId, {
        isSent: true,
        sentAt: new Date(),
        messageId: newMessage._id
      });

      // Mesajı kuyruktan sil
      this.channel?.ack(msg);

      console.log(`✅ Mesaj başarıyla işlendi: ${messageData.autoMessageId}`);

    } catch (error) {
      console.error(`❌ Mesaj işleme hatası: ${error}`);
      
      // Retry mekanizması
      const retryCount = msg.properties.headers?.['x-retry-count'] || 0;
      
      if (retryCount < this.MAX_RETRY_COUNT) {
        // Retry kuyruğuna gönder
        const messageData: QueueMessage = JSON.parse(msg.content.toString());
        messageData.retryCount = retryCount + 1;
        
        await this.channel?.sendToQueue(this.RETRY_QUEUE_NAME, Buffer.from(JSON.stringify(messageData)), {
          persistent: true,
          headers: {
            'x-retry-count': retryCount + 1
          }
        });
        
        console.log(`🔄 Mesaj retry kuyruğuna gönderildi: ${messageData.autoMessageId} (Deneme: ${retryCount + 1})`);
      } else {
        // Maksimum deneme sayısına ulaşıldı, AutoMessage'ı hata durumuna getir
        const messageData: QueueMessage = JSON.parse(msg.content.toString());
        await AutoMessage.findByIdAndUpdate(messageData.autoMessageId, {
          isFailed: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date()
        });
        
        console.log(`💥 Mesaj işleme başarısız: ${messageData.autoMessageId} (Maksimum deneme sayısına ulaşıldı)`);
      }
      
      this.channel?.ack(msg);
    }
  }

  // Retry mesaj işleme
  private async processRetryMessage(msg: Message): Promise<void> {
    try {
      const messageData: QueueMessage = JSON.parse(msg.content.toString());
      
      // Ana kuyruğa geri gönder
      await this.channel?.sendToQueue(this.QUEUE_NAME, Buffer.from(JSON.stringify(messageData)), {
        persistent: true,
        headers: {
          'x-retry-count': messageData.retryCount || 0
        }
      });
      
      this.channel?.ack(msg);
      
      console.log(`🔄 Retry mesajı ana kuyruğa gönderildi: ${messageData.autoMessageId}`);
    } catch (error) {
      console.error('❌ Retry mesaj işleme hatası:', error);
      this.channel?.ack(msg);
    }
  }

  // Kuyruk durumu
  async getQueueStatus(): Promise<any> {
    try {
      if (!this.channel) {
        throw new Error('Queue channel bağlantısı yok');
      }

      const mainQueue = await this.channel.checkQueue(this.QUEUE_NAME);
      const retryQueue = await this.channel.checkQueue(this.RETRY_QUEUE_NAME);

      return {
        mainQueue: {
          name: this.QUEUE_NAME,
          messageCount: mainQueue.messageCount,
          consumerCount: mainQueue.consumerCount
        },
        retryQueue: {
          name: this.RETRY_QUEUE_NAME,
          messageCount: retryQueue.messageCount,
          consumerCount: retryQueue.consumerCount
        },
        maxRetryCount: this.MAX_RETRY_COUNT,
        retryDelay: this.RETRY_DELAY
      };
    } catch (error) {
      console.error('❌ Kuyruk durumu alma hatası:', error);
      throw error;
    }
  }

  // Bağlantıyı kapat
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await (this.connection as any).close();
      }
      console.log('✅ Queue bağlantısı kapatıldı');
    } catch (error) {
      console.error('❌ Queue bağlantısı kapatma hatası:', error);
    }
  }
}

export const queueService = new QueueService(); 