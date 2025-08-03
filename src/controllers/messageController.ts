import { Request, Response } from 'express';
import { Message, Conversation, User } from '../models';
import { AuthRequest } from '../middleware/auth';

export class MessageController {
  // Mesaj gönderme
  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId, content, messageType = 'text', attachments, replyTo } = req.body;
      const senderId = req.user?.userId;

      if (!senderId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!conversationId || !content) {
        res.status(400).json({ error: 'Conversation ID ve content gerekli' });
        return;
      }

      // Konuşmanın var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Konuşma bulunamadı' });
        return;
      }

      if (!conversation.participants.includes(senderId as any)) {
        res.status(403).json({ error: 'Bu konuşmaya mesaj gönderme yetkiniz yok' });
        return;
      }

      // Yeni mesaj oluştur
      const newMessage = new Message({
        conversationId,
        senderId,
        content,
        messageType,
        attachments: attachments || [],
        replyTo,
        status: 'sent',
        metadata: {
          sentAt: new Date(),
          clientInfo: req.headers['user-agent'] || '',
          ipAddress: req.ip || req.connection.remoteAddress
        }
      });

      await newMessage.save();

      // Konuşmanın son mesaj bilgilerini güncelle
      (conversation as any).lastMessage = {
        content: content.length > 100 ? content.substring(0, 100) + '...' : content,
        sender: senderId,
        timestamp: new Date()
      };
      conversation.updatedAt = new Date();
      await conversation.save();

      // Gönderen bilgilerini al
      const sender = await User.findById(senderId).select('username firstName lastName profile');

      res.status(201).json({
        success: true,
        message: 'Mesaj başarıyla gönderildi',
        data: {
          id: newMessage._id,
          conversationId: newMessage.conversationId,
          sender: {
            id: sender?._id,
            username: sender?.username,
            firstName: sender?.firstName,
            lastName: sender?.lastName,
            displayName: sender?.profile?.displayName
          },
          content: newMessage.content,
          messageType: newMessage.messageType,
          attachments: newMessage.attachments,
          replyTo: newMessage.replyTo,
          status: newMessage.status,
          sentAt: newMessage.metadata.sentAt,
          createdAt: newMessage.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesaj gönderme hatası', details: error });
    }
  }

  // Konuşma mesajlarını getir
  static async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50, before, after } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!conversationId) {
        res.status(400).json({ error: 'Conversation ID gerekli' });
        return;
      }

      // Konuşmanın var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Konuşma bulunamadı' });
        return;
      }

      if (!conversation.participants.includes(userId as any)) {
        res.status(403).json({ error: 'Bu konuşmaya erişim yetkiniz yok' });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      // Filtre oluştur
      const filter: any = { conversationId };
      
      if (before) {
        filter.createdAt = { $lt: new Date(before as string) };
      }
      
      if (after) {
        filter.createdAt = { $gt: new Date(after as string) };
      }

      const messages = await Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('senderId', 'username firstName lastName profile');

      const total = await Message.countDocuments(filter);

      // Mesajları ters çevir (en eski mesajlar önce)
      const sortedMessages = messages.reverse();

      res.json({
        success: true,
        data: {
          messages: sortedMessages.map(msg => ({
            id: msg._id,
            conversationId: msg.conversationId,
            sender: {
              id: (msg.senderId as any)._id,
              username: (msg.senderId as any).username,
              firstName: (msg.senderId as any).firstName,
              lastName: (msg.senderId as any).lastName,
              displayName: (msg.senderId as any).profile?.displayName
            },
            content: msg.content,
            messageType: msg.messageType,
            attachments: msg.attachments,
            replyTo: msg.replyTo,
            status: msg.status,
            sentAt: msg.metadata?.sentAt,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
            hasMore: skip + messages.length < total
          }
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesajları getirme hatası', details: error });
    }
  }

  // Mesaj güncelleme
  static async updateMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { content, attachments } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!content) {
        res.status(400).json({ error: 'Content gerekli' });
        return;
      }

      // Mesajı bul
      const message = await Message.findById(messageId);
      if (!message) {
        res.status(404).json({ error: 'Mesaj bulunamadı' });
        return;
      }

      // Mesajın sahibi mi kontrol et
      if (message.senderId.toString() !== userId) {
        res.status(403).json({ error: 'Bu mesajı düzenleme yetkiniz yok' });
        return;
      }

      // Mesajın düzenlenebilir olup olmadığını kontrol et (örn: 5 dakika içinde)
      const messageAge = Date.now() - message.createdAt.getTime();
      const maxEditTime = 5 * 60 * 1000; // 5 dakika

      if (messageAge > maxEditTime) {
        res.status(400).json({ error: 'Mesaj düzenleme süresi dolmuş' });
        return;
      }

      // Mesajı güncelle
      message.content = content;
      if (attachments) {
        message.attachments = attachments;
      }
      message.isEdited = true;
      message.editedAt = new Date();

      await message.save();

      res.json({
        success: true,
        message: 'Mesaj başarıyla güncellendi',
        data: {
          id: message._id,
          content: message.content,
          attachments: message.attachments,
          isEdited: message.isEdited,
          editedAt: message.editedAt,
          updatedAt: message.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesaj güncelleme hatası', details: error });
    }
  }

  // Mesaj silme
  static async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      // Mesajı bul
      const message = await Message.findById(messageId);
      if (!message) {
        res.status(404).json({ error: 'Mesaj bulunamadı' });
        return;
      }

      // Mesajın sahibi mi veya admin mi kontrol et
      const isOwner = message.senderId.toString() === userId;
      const isAdmin = req.user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Bu mesajı silme yetkiniz yok' });
        return;
      }

      // Mesajın silinebilir olup olmadığını kontrol et (örn: 1 saat içinde)
      const messageAge = Date.now() - message.createdAt.getTime();
      const maxDeleteTime = 60 * 60 * 1000; // 1 saat

      if (messageAge > maxDeleteTime && !isAdmin) {
        res.status(400).json({ error: 'Mesaj silme süresi dolmuş' });
        return;
      }

      await Message.findByIdAndDelete(messageId);

      res.json({
        success: true,
        message: 'Mesaj başarıyla silindi'
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesaj silme hatası', details: error });
    }
  }

  // Mesaj durumu güncelleme (okundu, iletildi vb.)
  static async updateMessageStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { status } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!status || !['read', 'delivered', 'sent'].includes(status)) {
        res.status(400).json({ error: 'Geçerli bir status gerekli' });
        return;
      }

      // Mesajı bul
      const message = await Message.findById(messageId);
      if (!message) {
        res.status(404).json({ error: 'Mesaj bulunamadı' });
        return;
      }

      // Mesaj durumunu güncelle
      message.status = status;
      if (status === 'read') {
        message.readAt = new Date();
        (message as any).readBy = userId;
      }

      await message.save();

      res.json({
        success: true,
        message: 'Mesaj durumu güncellendi',
        data: {
          id: message._id,
          status: message.status,
          readAt: message.readAt,
          updatedAt: message.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesaj durumu güncelleme hatası', details: error });
    }
  }

  // Mesaj arama
  static async searchMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { query, conversationId, page = 1, limit = 20 } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!query) {
        res.status(400).json({ error: 'Arama sorgusu gerekli' });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      // Filtre oluştur
      const filter: any = {
        content: { $regex: query, $options: 'i' }
      };

      if (conversationId) {
        // Belirli konuşmada arama
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(userId as any)) {
          res.status(403).json({ error: 'Bu konuşmaya erişim yetkiniz yok' });
          return;
        }
        filter.conversationId = conversationId;
      } else {
        // Tüm konuşmalarda arama - kullanıcının katıldığı konuşmalar
        const userConversations = await Conversation.find({
          participants: userId
        }).select('_id');
        
        const conversationIds = userConversations.map(conv => conv._id);
        filter.conversationId = { $in: conversationIds };
      }

      const messages = await Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('senderId', 'username firstName lastName profile')
        .populate('conversationId', 'name type');

      const total = await Message.countDocuments(filter);

      res.json({
        success: true,
        data: {
          messages: messages.map(msg => ({
            id: msg._id,
            conversation: {
              id: (msg.conversationId as any)._id,
              name: (msg.conversationId as any).name,
              type: (msg.conversationId as any).type
            },
            sender: {
              id: (msg.senderId as any)._id,
              username: (msg.senderId as any).username,
              firstName: (msg.senderId as any).firstName,
              lastName: (msg.senderId as any).lastName,
              displayName: (msg.senderId as any).profile?.displayName
            },
            content: msg.content,
            messageType: msg.messageType,
            createdAt: msg.createdAt
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Mesaj arama hatası', details: error });
    }
  }
} 