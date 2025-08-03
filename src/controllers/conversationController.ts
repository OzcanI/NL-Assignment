import { Request, Response } from 'express';
import { Conversation, User, Message } from '../models';
import { AuthRequest } from '../middleware/auth';

export class ConversationController {
  // Yeni konuşma oluşturma
  static async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, type = 'direct', participants, description, settings } = req.body;
      const creatorId = req.user?.userId;

      if (!creatorId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        res.status(400).json({ error: 'En az bir katılımcı gerekli' });
        return;
      }

      // Katılımcıların var olduğunu kontrol et
      const existingUsers = await User.find({
        _id: { $in: participants }
      }).select('_id username firstName lastName');

      if (existingUsers.length !== participants.length) {
        res.status(400).json({ error: 'Bazı kullanıcılar bulunamadı' });
        return;
      }

      // Yaratıcıyı da katılımcılara ekle
      const allParticipants = [...new Set([...participants, creatorId])];

      // Direct mesaj için özel kontrol
      if (type === 'direct' && allParticipants.length !== 2) {
        res.status(400).json({ error: 'Direct mesaj sadece 2 kişi arasında olabilir' });
        return;
      }

      // Direct mesaj için mevcut konuşma var mı kontrol et
      if (type === 'direct') {
        const existingConversation = await Conversation.findOne({
          type: 'direct',
          participants: { $all: allParticipants }
        });

        if (existingConversation) {
          res.status(409).json({ 
            error: 'Bu kullanıcılar arasında zaten bir konuşma var',
            conversationId: existingConversation._id
          });
          return;
        }
      }

      // Yeni konuşma oluştur
      const newConversation = new Conversation({
        name: name || (type === 'direct' ? 'Direct Message' : 'Group Chat'),
        type,
        participants: allParticipants,
        creatorId,
        description,
        settings: {
          allowInvites: settings?.allowInvites ?? true,
          allowEditing: settings?.allowEditing ?? true,
          allowDeletion: settings?.allowDeletion ?? true,
          readReceipts: settings?.readReceipts ?? true,
          ...settings
        }
      });

      await newConversation.save();

      // Katılımcı bilgilerini al
      const participantDetails = await User.find({
        _id: { $in: allParticipants }
      }).select('username firstName lastName profile isActive lastLoginAt');

      res.status(201).json({
        success: true,
        message: 'Konuşma başarıyla oluşturuldu',
        data: {
          id: newConversation._id,
          name: newConversation.name,
          type: newConversation.type,
          description: newConversation.description,
          creator: {
            id: creatorId,
            username: req.user?.username
          },
          participants: participantDetails.map(user => ({
            id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.profile?.displayName,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt
          })),
          settings: newConversation.settings,
          createdAt: newConversation.createdAt,
          updatedAt: newConversation.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Konuşma oluşturma hatası', details: error });
    }
  }

  // Kullanıcının konuşmalarını listele
  static async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, type, search } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      // Filtre oluştur
      const filter: any = { participants: userId };
      
      if (type) filter.type = type;
      if (search) {
        filter.name = { $regex: search, $options: 'i' };
      }

      const conversations = await Conversation.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('participants', 'username firstName lastName profile isActive lastLoginAt')
        .populate('creatorId', 'username firstName lastName');

      const total = await Conversation.countDocuments(filter);

      // Her konuşma için son mesaj bilgisini al
      const conversationsWithLastMessage = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await Message.findOne({ conversationId: conv._id })
            .sort({ createdAt: -1 })
            .populate('senderId', 'username firstName lastName profile');

          return {
            id: conv._id,
            name: conv.name,
            type: conv.type,
            description: conv.metadata?.description,
            creator: {
              id: req.user?.userId,
              username: req.user?.username
            },
            participants: conv.participants.map((user: any) => ({
              id: user._id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              displayName: user.profile?.displayName,
              isActive: user.isActive,
              lastLoginAt: user.lastLoginAt
            })),
            lastMessage: lastMessage ? {
              id: lastMessage._id,
              content: lastMessage.content,
              messageType: lastMessage.messageType,
              sender: {
                id: (lastMessage.senderId as any)._id,
                username: (lastMessage.senderId as any).username,
                firstName: (lastMessage.senderId as any).firstName,
                lastName: (lastMessage.senderId as any).lastName,
                displayName: (lastMessage.senderId as any).profile?.displayName
              },
              sentAt: lastMessage.metadata?.sentAt,
              createdAt: lastMessage.createdAt
            } : null,
            unreadCount: 0, // TODO: Implement unread count
            settings: conv.settings,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt
          };
        })
      );

      res.json({
        success: true,
        data: {
          conversations: conversationsWithLastMessage,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Konuşmaları getirme hatası', details: error });
    }
  }

  // Konuşma detaylarını getir
  static async getConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      const conversation = await Conversation.findById(conversationId)
        .populate('participants', 'username firstName lastName profile isActive lastLoginAt')
        .populate('creatorId', 'username firstName lastName');

      if (!conversation) {
        res.status(404).json({ error: 'Konuşma bulunamadı' });
        return;
      }

      if (!conversation.participants.some((p: any) => p._id.toString() === userId)) {
        res.status(403).json({ error: 'Bu konuşmaya erişim yetkiniz yok' });
        return;
      }

      // Son mesaj bilgisini al
      const lastMessage = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .populate('senderId', 'username firstName lastName profile');

      // Okunmamış mesaj sayısını al
      const unreadCount = await Message.countDocuments({
        conversationId,
        senderId: { $ne: userId },
        status: { $ne: 'read' }
      });

      res.json({
        success: true,
        data: {
          id: conversation._id,
          name: conversation.name,
          type: conversation.type,
          description: conversation.metadata?.description,
          creator: {
            id: req.user?.userId,
            username: req.user?.username
          },
          participants: conversation.participants.map((user: any) => ({
            id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.profile?.displayName,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt
          })),
          lastMessage: lastMessage ? {
            id: lastMessage._id,
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            sender: {
              id: (lastMessage.senderId as any)._id,
              username: (lastMessage.senderId as any).username,
              firstName: (lastMessage.senderId as any).firstName,
              lastName: (lastMessage.senderId as any).lastName,
              displayName: (lastMessage.senderId as any).profile?.displayName
            },
            sentAt: lastMessage.metadata?.sentAt,
            createdAt: lastMessage.createdAt
          } : null,
          unreadCount,
          settings: conversation.settings,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Konuşma detaylarını getirme hatası', details: error });
    }
  }

  // Konuşma güncelleme
  static async updateConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { name, description, settings } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Konuşma bulunamadı' });
        return;
      }

      // Yaratıcı mı veya admin mi kontrol et
      const isCreator = conversation.creatorId.toString() === userId;
      const isAdmin = req.user?.role === 'admin';

      if (!isCreator && !isAdmin) {
        res.status(403).json({ error: 'Bu konuşmayı düzenleme yetkiniz yok' });
        return;
      }

      // Güncelleme
      if (name) conversation.name = name;
      if (description !== undefined) conversation.description = description;
      if (settings) {
        conversation.settings = { ...conversation.settings, ...settings };
      }

      await conversation.save();

      res.json({
        success: true,
        message: 'Konuşma başarıyla güncellendi',
        data: {
          id: conversation._id,
          name: conversation.name,
          description: conversation.description,
          settings: conversation.settings,
          updatedAt: conversation.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Konuşma güncelleme hatası', details: error });
    }
  }

  // Konuşmaya katılımcı ekleme
  static async addParticipants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { participants } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        res.status(400).json({ error: 'Katılımcı listesi gerekli' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Konuşma bulunamadı' });
        return;
      }

      // Yaratıcı mı veya admin mi kontrol et
      const isCreator = conversation.creatorId.toString() === userId;
      const isAdmin = req.user?.role === 'admin';

      if (!isCreator && !isAdmin) {
        res.status(403).json({ error: 'Bu konuşmaya katılımcı ekleme yetkiniz yok' });
        return;
      }

      // Direct mesaj kontrolü
      if (conversation.type === 'direct') {
        res.status(400).json({ error: 'Direct mesajlara katılımcı eklenemez' });
        return;
      }

      // Kullanıcıların var olduğunu kontrol et
      const existingUsers = await User.find({
        _id: { $in: participants }
      }).select('_id username firstName lastName');

      if (existingUsers.length !== participants.length) {
        res.status(400).json({ error: 'Bazı kullanıcılar bulunamadı' });
        return;
      }

      // Zaten katılımcı olanları filtrele
      const newParticipants = participants.filter(
        (p: string) => !conversation.participants.includes(p as any)
      );

      if (newParticipants.length === 0) {
        res.status(400).json({ error: 'Tüm kullanıcılar zaten katılımcı' });
        return;
      }

      // Katılımcıları ekle
      (conversation.participants as any).push(...newParticipants.map((p: string) => p as any));
      await conversation.save();

      // Yeni katılımcı bilgilerini al
      const newParticipantDetails = await User.find({
        _id: { $in: newParticipants }
      }).select('username firstName lastName profile isActive lastLoginAt');

      res.json({
        success: true,
        message: 'Katılımcılar başarıyla eklendi',
        data: {
          addedParticipants: newParticipantDetails.map(user => ({
            id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.profile?.displayName,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt
          })),
          totalParticipants: conversation.participants.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Katılımcı ekleme hatası', details: error });
    }
  }

  // Konuşmadan katılımcı çıkarma
  static async removeParticipants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { participants } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        res.status(400).json({ error: 'Katılımcı listesi gerekli' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Konuşma bulunamadı' });
        return;
      }

      // Yaratıcı mı veya admin mi kontrol et
      const isCreator = conversation.creatorId.toString() === userId;
      const isAdmin = req.user?.role === 'admin';

      if (!isCreator && !isAdmin) {
        res.status(403).json({ error: 'Bu konuşmadan katılımcı çıkarma yetkiniz yok' });
        return;
      }

      // Yaratıcıyı çıkarmaya çalışıyorsa engelle
      if (participants.includes(conversation.creatorId.toString())) {
        res.status(400).json({ error: 'Konuşma yaratıcısı çıkarılamaz' });
        return;
      }

      // Katılımcıları çıkar
      conversation.participants = conversation.participants.filter(
        (p: any) => !participants.includes(p.toString())
      );

      await conversation.save();

      res.json({
        success: true,
        message: 'Katılımcılar başarıyla çıkarıldı',
        data: {
          removedParticipants: participants,
          totalParticipants: conversation.participants.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Katılımcı çıkarma hatası', details: error });
    }
  }

  // Konuşma silme
  static async deleteConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Konuşma bulunamadı' });
        return;
      }

      // Yaratıcı mı veya admin mi kontrol et
      const isCreator = conversation.creatorId.toString() === userId;
      const isAdmin = req.user?.role === 'admin';

      if (!isCreator && !isAdmin) {
        res.status(403).json({ error: 'Bu konuşmayı silme yetkiniz yok' });
        return;
      }

      // Konuşmayı ve tüm mesajlarını sil
      await Promise.all([
        Conversation.findByIdAndDelete(conversationId),
        Message.deleteMany({ conversationId })
      ]);

      res.json({
        success: true,
        message: 'Konuşma başarıyla silindi'
      });
    } catch (error) {
      res.status(500).json({ error: 'Konuşma silme hatası', details: error });
    }
  }
} 