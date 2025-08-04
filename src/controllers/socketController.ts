import { Request, Response } from 'express';
import { socketService } from '../services/socket';

export class SocketController {
  // Bağlı kullanıcıları listeleme
  static async getConnectedUsers(req: Request, res: Response): Promise<void> {
    try {
      const connectedUsers = socketService.getConnectedUsers();
      
      res.json({
        success: true,
        connectedUsers,
        total: connectedUsers.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Bağlı kullanıcıları alma hatası', details: error });
    }
  }

  // Kullanıcının hangi odalarda olduğunu getirme
static async getUserRooms(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID gerekli' });
        return;
      }

      const rooms = socketService.getUserRooms(userId);

      res.json({
        success: true,
        userId,
        rooms,
        total: rooms.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Kullanıcı odalarını alma hatası', details: error });
    }
  }

  // Kullanıcının online durumunu kontrol etme
  static async checkUserOnline(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID gerekli' });
        return;
      }

      const isOnline = socketService.isUserOnline(userId);
      
      res.json({
        success: true,
        userId,
        isOnline
      });
    } catch (error) {
      res.status(500).json({ error: 'Kullanıcı durumu kontrol hatası', details: error });
    }
  }

  // Belirli bir odaya sistem mesajı gönderme
  static async sendSystemMessage(req: Request, res: Response): Promise<void> {
    try {
      const { roomId, message, type = 'info' } = req.body;
      
      if (!roomId || !message) {
        res.status(400).json({ error: 'Room ID ve message gerekli' });
        return;
      }

      const systemMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: message,
        systemType: type,
        timestamp: new Date().toISOString()
      };

      socketService.sendToRoom(roomId, 'system_message', systemMessage);
      
      res.json({
        success: true,
        message: 'Sistem mesajı gönderildi',
        systemMessage
      });
    } catch (error) {
      res.status(500).json({ error: 'Sistem mesajı gönderme hatası', details: error });
    }
  }

  // Belirli bir kullanıcıya özel mesaj gönderme
  static async sendPrivateMessage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, message, type = 'notification' } = req.body;
      
      if (!userId || !message) {
        res.status(400).json({ error: 'User ID ve message gerekli' });
        return;
      }

      const privateMessage = {
        id: Date.now().toString(),
        type: 'private',
        content: message,
        messageType: type,
        timestamp: new Date().toISOString()
      };

      socketService.sendToUser(userId, 'private_message', privateMessage);
      
      res.json({
        success: true,
        message: 'Özel mesaj gönderildi',
        privateMessage
      });
    } catch (error) {
      res.status(500).json({ error: 'Özel mesaj gönderme hatası', details: error });
    }
  }

  // Tüm bağlı kullanıcılara broadcast mesajı gönderme
  static async broadcastMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, type = 'announcement' } = req.body;
      
      if (!message) {
        res.status(400).json({ error: 'Message gerekli' });
        return;
      }

      const broadcastMessage = {
        id: Date.now().toString(),
        type: 'broadcast',
        content: message,
        messageType: type,
        timestamp: new Date().toISOString()
      };

      socketService.broadcastToAll('broadcast_message', broadcastMessage);
      
      res.json({
        success: true,
        message: 'Broadcast mesajı gönderildi',
        broadcastMessage
      });
    } catch (error) {
      res.status(500).json({ error: 'Broadcast mesajı gönderme hatası', details: error });
    }
  }

  // Socket.IO durum bilgisi
  static async getSocketStatus(req: Request, res: Response): Promise<void> {
    try {
      const connectedUsers = socketService.getConnectedUsers();
      
      res.json({
        success: true,
        status: 'active',
        connectedUsers: connectedUsers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Socket durumu alma hatası', details: error });
    }
  }
} 