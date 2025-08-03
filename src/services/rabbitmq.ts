import * as amqp from 'amqplib';

export interface MessageData {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

export class RabbitMQService {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private isConnected = false;

  constructor() {
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown(): void {
    process.on('SIGINT', () => this.disconnect());
    process.on('SIGTERM', () => this.disconnect());
  }

  async connect(): Promise<void> {
    try {
      const url = process.env['RABBITMQ_URL'] || 'amqp://localhost:5672';
      const username = process.env['RABBITMQ_USER'] || 'admin';
      const password = process.env['RABBITMQ_PASSWORD'] || 'admin123';

      const connectionString = url.replace('amqp://', `amqp://${username}:${password}@`);
      
      this.connection = await amqp.connect(connectionString);
      this.channel = await this.connection.createChannel();
      
      this.isConnected = true;
      console.log('🐰 RabbitMQ bağlantısı kuruldu');

      // Bağlantı event listener'ları
      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ bağlantı hatası:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.log('🔌 RabbitMQ bağlantısı kesildi');
        this.isConnected = false;
      });

      this.channel.on('error', (err) => {
        console.error('❌ RabbitMQ kanal hatası:', err);
      });

      this.channel.on('return', (msg) => {
        console.log('📤 RabbitMQ mesaj döndü:', msg.content.toString());
      });

    } catch (error) {
      console.error('RabbitMQ bağlantı hatası:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      console.log('🔌 RabbitMQ bağlantısı kapatıldı');
    } catch (error) {
      console.error('RabbitMQ bağlantısını kapatma hatası:', error);
    }
  }

  async createQueue(queueName: string, options?: amqp.Options.AssertQueue): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ kanalı mevcut değil');
    }

    try {
      await this.channel.assertQueue(queueName, {
        durable: true,
        ...options
      });
      console.log(`📋 Queue oluşturuldu: ${queueName}`);
    } catch (error) {
      console.error('Queue oluşturma hatası:', error);
      throw error;
    }
  }

  async publishMessage(queueName: string, message: MessageData): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ kanalı mevcut değil');
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const result = this.channel.sendToQueue(queueName, messageBuffer, {
        persistent: true,
        timestamp: Date.now()
      });

      if (result) {
        console.log(`📤 Mesaj gönderildi: ${message.id} -> ${queueName}`);
      }
      return result;
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      throw error;
    }
  }

  async consumeMessages(queueName: string, callback: (message: MessageData) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ kanalı mevcut değil');
    }

    try {
      await this.channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const messageData: MessageData = JSON.parse(msg.content.toString());
            console.log(`📥 Mesaj alındı: ${messageData.id} <- ${queueName}`);
            
            await callback(messageData);
            
            // Mesajı onayla
            this.channel?.ack(msg);
          } catch (error) {
            console.error('Mesaj işleme hatası:', error);
            // Mesajı reddet ve tekrar kuyruğa koy
            this.channel?.nack(msg, false, true);
          }
        }
      });

      console.log(`👂 Mesaj dinleme başlatıldı: ${queueName}`);
    } catch (error) {
      console.error('Mesaj dinleme hatası:', error);
      throw error;
    }
  }

  async getQueueInfo(queueName: string): Promise<amqp.Replies.AssertQueue> {
    if (!this.channel) {
      throw new Error('RabbitMQ kanalı mevcut değil');
    }

    try {
      return await this.channel.assertQueue(queueName);
    } catch (error) {
      console.error('Queue bilgisi alma hatası:', error);
      throw error;
    }
  }

  async purgeQueue(queueName: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ kanalı mevcut değil');
    }

    try {
      await this.channel.purgeQueue(queueName);
      console.log(`🗑️ Queue temizlendi: ${queueName}`);
    } catch (error) {
      console.error('Queue temizleme hatası:', error);
      throw error;
    }
  }

  async deleteQueue(queueName: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ kanalı mevcut değil');
    }

    try {
      await this.channel.deleteQueue(queueName);
      console.log(`🗑️ Queue silindi: ${queueName}`);
    } catch (error) {
      console.error('Queue silme hatası:', error);
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getChannel(): amqp.Channel | null {
    return this.channel;
  }
}

// Singleton instance
export const rabbitMQService = new RabbitMQService(); 