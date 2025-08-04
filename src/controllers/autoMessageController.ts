import { Request, Response } from 'express';
import { AutoMessage, Conversation, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { queueService } from '../services/queueService';
import mongoose from 'mongoose';

export class AutoMessageController {
  // Otomatik mesaj oluşturma
  static async createAutoMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId, content, messageType = 'text', sendDate, repeatType, repeatInterval } = req.body;
      const senderId = req.user?.userId;

      if (!senderId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!conversationId || !content || !sendDate) {
        res.status(400).json({ error: 'Conversation ID, content ve sendDate gerekli' });
        return;
      }

      // conversationId'nin geçerli bir ObjectId olup olmadığını kontrol et
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        res.status(400).json({ error: 'Geçersiz konuşma ID formatı' });
        return;
      }

      // Konuşmanın var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Konuşma bulunamadı' });
        return;
      }

      if (!conversation.participants.includes(senderId as any)) {
        res.status(403).json({ error: 'Bu konuşmaya otomatik mesaj gönderme yetkiniz yok' });
        return;
      }

      // Gönderim tarihinin gelecekte olduğunu kontrol et
      const sendDateTime = new Date(sendDate);
      if (sendDateTime <= new Date()) {
        res.status(400).json({ error: 'Gönderim tarihi gelecekte olmalıdır' });
        return;
      }

      // Yeni otomatik mesaj oluştur
      const newAutoMessage = new AutoMessage({
        conversationId,
        senderId,
        content,
        messageType,
        sendDate: sendDateTime,
        repeatType: repeatType || 'none',
        repeatInterval: repeatInterval || null,
        isQueued: false,
        isSent: false,
        isFailed: false
      });

      await newAutoMessage.save();

      // Gönderen bilgilerini al
      const sender = await User.findById(senderId).select('username firstName lastName profile');

      res.status(201).json({
        success: true,
        message: 'Otomatik mesaj başarıyla oluşturuldu',
        data: {
          id: newAutoMessage._id,
          conversation: {
            id: conversation._id,
            name: conversation.name,
            type: conversation.type
          },
          sender: {
            id: sender?._id,
            username: sender?.username,
            firstName: sender?.firstName,
            lastName: sender?.lastName,
            displayName: sender?.profile?.displayName
          },
          content: (newAutoMessage as any).content,
          messageType: (newAutoMessage as any).messageType,
          sendDate: (newAutoMessage as any).sendDate,
          repeatType: (newAutoMessage as any).repeatType,
          repeatInterval: (newAutoMessage as any).repeatInterval,
          status: {
            isQueued: (newAutoMessage as any).isQueued,
            isSent: (newAutoMessage as any).isSent,
            isFailed: (newAutoMessage as any).isFailed
          },
          createdAt: newAutoMessage.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Otomatik mesaj oluşturma hatası', details: error });
    }
  }

  // Otomatik mesajları listele
  static async getAutoMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, status, conversationId } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      // Filtre oluştur
      const filter: any = { senderId: userId };
      
      if (status) {
        switch (status) {
          case 'pending':
            filter.isQueued = false;
            filter.isSent = false;
            filter.isFailed = false;
            break;
          case 'queued':
            filter.isQueued = true;
            filter.isSent = false;
            filter.isFailed = false;
            break;
          case 'sent':
            filter.isSent = true;
            break;
          case 'failed':
            filter.isFailed = true;
            break;
        }
      }

      if (conversationId) {
        if (!mongoose.Types.ObjectId.isValid(conversationId as string)) {
          res.status(400).json({ error: 'Geçersiz konuşma ID formatı' });
          return;
        }
        filter.conversationId = conversationId;
      }

      const autoMessages = await AutoMessage.find(filter)
        .sort({ sendDate: -1 })
        .skip(skip)
        .limit(Number(limit))

      const total = await AutoMessage.countDocuments(filter);

      res.json({
        success: true,
        data: {
          autoMessages: autoMessages.map(msg => ({
            id: msg._id,
            conversation: {
              id: ((msg as any).conversationId as any)._id,
              name: ((msg as any).conversationId as any).name,
              type: ((msg as any).conversationId as any).type
            },
            sender: {
              id: ((msg as any).senderId as any)._id,
              username: ((msg as any).senderId as any).username,
              firstName: ((msg as any).senderId as any).firstName,
              lastName: ((msg as any).senderId as any).lastName,
              displayName: ((msg as any).senderId as any).profile?.displayName
            },
            content: (msg as any).content,
            messageType: (msg as any).messageType,
            sendDate: (msg as any).sendDate,
            repeatType: (msg as any).repeatType,
            repeatInterval: (msg as any).repeatInterval,
            status: {
              isQueued: (msg as any).isQueued,
              isSent: (msg as any).isSent,
              isFailed: (msg as any).isFailed,
              queuedAt: (msg as any).queuedAt,
              sentAt: (msg as any).sentAt,
              failedAt: (msg as any).failedAt,
              errorMessage: (msg as any).errorMessage
            },
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt
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
      res.status(500).json({ error: 'Otomatik mesajları getirme hatası', details: error });
    }
  }

  // Otomatik mesaj detayı
  static async getAutoMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { autoMessageId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(autoMessageId || '')) {
        res.status(400).json({ error: 'Geçersiz otomatik mesaj ID formatı' });
        return;
      }

      const autoMessage = await AutoMessage.findOne({
        _id: autoMessageId,
        senderId: userId
      })

      if (!autoMessage) {
        res.status(404).json({ error: 'Otomatik mesaj bulunamadı' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: autoMessage._id,
          conversation: {
            id: ((autoMessage as any).conversationId as any)._id,
            name: ((autoMessage as any).conversationId as any).name,
            type: ((autoMessage as any).conversationId as any).type
          },
          sender: {
            id: ((autoMessage as any).senderId as any)._id,
            username: ((autoMessage as any).senderId as any).username,
            firstName: ((autoMessage as any).senderId as any).firstName,
            lastName: ((autoMessage as any).senderId as any).lastName,
            displayName: ((autoMessage as any).senderId as any).profile?.displayName
          },
          content: (autoMessage as any).content,
          messageType: (autoMessage as any).messageType,
          sendDate: (autoMessage as any).sendDate,
          repeatType: (autoMessage as any).repeatType,
          repeatInterval: (autoMessage as any).repeatInterval,
          status: {
            isQueued: (autoMessage as any).isQueued,
            isSent: (autoMessage as any).isSent,
            isFailed: (autoMessage as any).isFailed,
            queuedAt: (autoMessage as any).queuedAt,
            sentAt: (autoMessage as any).sentAt,
            failedAt: (autoMessage as any).failedAt,
            errorMessage: (autoMessage as any).errorMessage
          },
          createdAt: autoMessage.createdAt,
          updatedAt: autoMessage.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Otomatik mesaj getirme hatası', details: error });
    }
  }

        // Otomatik mesaj güncelleme
      static async updateAutoMessage(req: AuthRequest, res: Response): Promise<void> {
        try {
          const { autoMessageId } = req.params;
          const { content, messageType, sendDate, repeatType, repeatInterval } = req.body;
          const userId = req.user?.userId;

          if (!userId) {
            res.status(401).json({ error: 'Yetkilendirme gerekli' });
            return;
          }

          if (!mongoose.Types.ObjectId.isValid(autoMessageId || '')) {
            res.status(400).json({ error: 'Geçersiz otomatik mesaj ID formatı' });
            return;
          }

      // Otomatik mesajı bul
      const autoMessage = await AutoMessage.findOne({
        _id: autoMessageId,
        senderId: userId
      });

      if (!autoMessage) {
        res.status(404).json({ error: 'Otomatik mesaj bulunamadı' });
        return;
      }

      // Gönderilmiş mesajları güncelleme
      if ((autoMessage as any).isSent) {
        res.status(400).json({ error: 'Gönderilmiş otomatik mesajlar güncellenemez' });
        return;
      }

      // Güncelleme alanları
      const updateFields: any = {};
      
      if (content !== undefined) updateFields.content = content;
      if (messageType !== undefined) updateFields.messageType = messageType;
      if (sendDate !== undefined) {
        const sendDateTime = new Date(sendDate);
        if (sendDateTime <= new Date()) {
          res.status(400).json({ error: 'Gönderim tarihi gelecekte olmalıdır' });
          return;
        }
        updateFields.sendDate = sendDateTime;
      }
      if (repeatType !== undefined) updateFields.repeatType = repeatType;
      if (repeatInterval !== undefined) updateFields.repeatInterval = repeatInterval;

      // Kuyruğa eklenmiş mesajları sıfırla
      if ((autoMessage as any).isQueued) {
        updateFields.isQueued = false;
        updateFields.queuedAt = null;
      }

      await AutoMessage.findByIdAndUpdate(autoMessageId, updateFields);

      res.json({
        success: true,
        message: 'Otomatik mesaj başarıyla güncellendi'
      });
    } catch (error) {
      res.status(500).json({ error: 'Otomatik mesaj güncelleme hatası', details: error });
    }
  }

        // Otomatik mesaj silme
      static async deleteAutoMessage(req: AuthRequest, res: Response): Promise<void> {
        try {
          const { autoMessageId } = req.params;
          const userId = req.user?.userId;

          if (!userId) {
            res.status(401).json({ error: 'Yetkilendirme gerekli' });
            return;
          }

          if (!mongoose.Types.ObjectId.isValid(autoMessageId || '')) {
            res.status(400).json({ error: 'Geçersiz otomatik mesaj ID formatı' });
            return;
          }

      // Otomatik mesajı bul
      const autoMessage = await AutoMessage.findOne({
        _id: autoMessageId,
        senderId: userId
      });

      if (!autoMessage) {
        res.status(404).json({ error: 'Otomatik mesaj bulunamadı' });
        return;
      }

      // Gönderilmiş mesajları silme
      if ((autoMessage as any).isSent) {
        res.status(400).json({ error: 'Gönderilmiş otomatik mesajlar silinemez' });
        return;
      }

      await AutoMessage.findByIdAndDelete(autoMessageId);

      res.json({
        success: true,
        message: 'Otomatik mesaj başarıyla silindi'
      });
    } catch (error) {
      res.status(500).json({ error: 'Otomatik mesaj silme hatası', details: error });
    }
  }

        // Manuel tetikleme (test için)
      static async triggerAutoMessage(req: AuthRequest, res: Response): Promise<void> {
        try {
          const { autoMessageId } = req.params;
          const userId = req.user?.userId;

          if (!userId) {
            res.status(401).json({ error: 'Yetkilendirme gerekli' });
            return;
          }

          if (!mongoose.Types.ObjectId.isValid(autoMessageId || '')) {
            res.status(400).json({ error: 'Geçersiz otomatik mesaj ID formatı' });
            return;
          }

      // Otomatik mesajı bul
      const autoMessage = await AutoMessage.findOne({
        _id: autoMessageId,
        senderId: userId
      });

      if (!autoMessage) {
        res.status(404).json({ error: 'Otomatik mesaj bulunamadı' });
        return;
      }

      // Gönderilmiş mesajları tekrar tetikleme
      if ((autoMessage as any).isSent) {
        res.status(400).json({ error: 'Gönderilmiş otomatik mesajlar tekrar tetiklenemez' });
        return;
      }

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
      await AutoMessage.findByIdAndUpdate(autoMessage._id, {
        isQueued: true,
        queuedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Otomatik mesaj manuel olarak tetiklendi'
      });
    } catch (error) {
      res.status(500).json({ error: 'Otomatik mesaj tetikleme hatası', details: error });
    }
  }

  // İstatistikler
  static async getAutoMessageStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      const now = new Date();
      
      const stats = await AutoMessage.aggregate([
        { $match: { senderId: new mongoose.Types.ObjectId(userId) } },
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

      const result = stats[0] || {
        total: 0,
        pending: 0,
        queued: 0,
        sent: 0,
        failed: 0
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({ error: 'İstatistik alma hatası', details: error });
    }
  }
} 