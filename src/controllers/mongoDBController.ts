import { Request, Response } from 'express';
import { mongoDBService } from '../services/mongodb';
import { User, Conversation, Message, AutoMessage } from '../models';

export class MongoDBController {
  // MongoDB durumunu kontrol et
  static async getStatus(req: any, res: Response): Promise<void> {
    try {
      res.json({
        connected: mongoDBService.getConnectionStatus(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'MongoDB durum kontrolü hatası', details: error });
    }
  }

  // Koleksiyonları listele
  static async getCollections(req: any, res: Response): Promise<void> {
    try {
      const db = mongoDBService.getConnection().connection.db;
      if (!db) {
        res.status(500).json({ error: 'MongoDB bağlantısı kurulamadı' });
        return;
      }
      
      const collections = await db.listCollections().toArray();
      res.json({ 
        collections: collections.map((col: any) => col.name),
        totalCollections: collections.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'MongoDB hatası', details: error });
    }
  }

  // Koleksiyon istatistikleri
  static async getCollectionStats(req: Request, res: Response): Promise<void> {
    try {
      const { collectionName } = req.params;
      const db = mongoDBService.getConnection().connection.db;
      
      if (!db) {
        res.status(500).json({ error: 'MongoDB bağlantısı kurulamadı' });
        return;
      }
      
      const stats = await (db.collection(collectionName as string) as any).stats();
      res.json({ 
        collectionName,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Koleksiyon istatistikleri alma hatası', details: error });
    }
  }

  // User işlemleri
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData = req.body;
      const user = new User(userData);
      await user.save();
      
      res.status(201).json({ 
        success: true, 
        message: 'Kullanıcı oluşturuldu',
        user: user.toJSON()
      });
    } catch (error) {
      res.status(500).json({ error: 'Kullanıcı oluşturma hatası', details: error });
    }
  }

  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, role, isActive } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      
      const filter: any = {};
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      
      const users = await User.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .select('-password');
      
      const total = await User.countDocuments(filter);
      
      res.json({ 
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Kullanıcıları getirme hatası', details: error });
    }
  }

  // Conversation işlemleri
  static async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const conversationData = req.body;
      const conversation = new Conversation(conversationData);
      await conversation.save();
      
      res.status(201).json({ 
        success: true, 
        message: 'Konuşma oluşturuldu',
        conversation
      });
    } catch (error) {
      res.status(500).json({ error: 'Konuşma oluşturma hatası', details: error });
    }
  }

  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, type, isActive } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      
      const filter: any = {};
      if (type) filter.type = type;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      
      const conversations = await Conversation.find(filter)
        .populate('participants', 'username firstName lastName avatar')
        .skip(skip)
        .limit(Number(limit))
        .sort({ updatedAt: -1 });
      
      const total = await Conversation.countDocuments(filter);
      
      res.json({ 
        conversations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Konuşmaları getirme hatası', details: error });
    }
  }

  // Message işlemleri
  static async createMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageData = req.body;
      const message = new Message(messageData);
      await message.save();
      
      // Conversation'ın lastMessage'ını güncelle
      await Conversation.findByIdAndUpdate(messageData.conversationId, {
        lastMessage: {
          content: messageData.content,
          sender: messageData.sender,
          timestamp: new Date()
        }
      });
      
      res.status(201).json({ 
        success: true, 
        message: 'Mesaj oluşturuldu',
        data: message
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesaj oluşturma hatası', details: error });
    }
  }

  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      
      const messages = await Message.find({ conversationId })
        .skip(skip)
        .limit(Number(limit));
      
      const total = await Message.countDocuments({ 
        conversationId,
        'metadata.isDeleted': false
      });
      
      res.json({ 
        messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesajları getirme hatası', details: error });
    }
  }

  // AutoMessage işlemleri
  static async createAutoMessage(req: Request, res: Response): Promise<void> {
    try {
      const autoMessageData = req.body;
      const autoMessage = new AutoMessage(autoMessageData);
      await autoMessage.save();
      
      res.status(201).json({ 
        success: true, 
        message: 'Otomatik mesaj oluşturuldu',
        autoMessage
      });
    } catch (error) {
      res.status(500).json({ error: 'Otomatik mesaj oluşturma hatası', details: error });
    }
  }

  static async getAutoMessages(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, triggerType, isActive } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      
      const filter: any = {};
      if (triggerType) filter.triggerType = triggerType;
      if (isActive !== undefined) filter['settings.isActive'] = isActive === 'true';
      
      const autoMessages = await AutoMessage.find(filter)
        .populate('metadata.createdBy', 'username firstName lastName')
        .skip(skip)
        .limit(Number(limit))
        .sort({ 'settings.priority': -1, createdAt: -1 });
      
      const total = await AutoMessage.countDocuments(filter);
      
      res.json({ 
        autoMessages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Otomatik mesajları getirme hatası', details: error });
    }
  }

  // Veritabanı istatistikleri
  static async getDatabaseStats(req: any, res: Response): Promise<void> {
    try {
      const db = mongoDBService.getConnection().connection.db;
      if (!db) {
        res.status(500).json({ error: 'MongoDB bağlantısı kurulamadı' });
        return;
      }
      
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();
      
      // Her koleksiyon için belge sayısını al
      const collectionStats = await Promise.all(
        collections.map(async (col: any) => {
          const count = await db.collection(col.name).countDocuments();
          return { name: col.name, count };
        })
      );
      
      res.json({ 
        databaseStats: stats,
        collectionStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Veritabanı istatistikleri alma hatası', details: error });
    }
  }
} 