import mongoose from 'mongoose';

export class MongoDBService {
  private isConnected = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      console.log('🗄️ MongoDB bağlantısı kuruldu');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err: any) => {
      console.error('❌ MongoDB bağlantı hatası:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB bağlantısı kesildi');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB yeniden bağlandı');
      this.isConnected = true;
    });
  }

  async connect(): Promise<void> {
    try {
      //Add username and password to the uri
      const mongoDbUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/typescript_project?authSource=admin';
      console.log(mongoDbUri)
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false
      };

      await mongoose.connect(mongoDbUri, options);
    } catch (error) {
      console.error('MongoDB bağlantı hatası:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log('🔌 MongoDB bağlantısı kapatıldı');
    } catch (error) {
      console.error('MongoDB bağlantısını kapatma hatası:', error);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getConnection(): typeof mongoose {
    return mongoose;
  }
}

// Singleton instance
export const mongoDBService = new MongoDBService(); 