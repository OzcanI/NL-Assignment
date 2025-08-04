import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, Message, Conversation } from '../models';

interface AuthenticatedSocket {
  userId: string;
  username: string;
  role: string;
}

interface MessageData {
  conversationId: string;
  content: string;
  messageType?: string;
  attachments?: any[];
  replyTo?: string;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private userRooms: Map<string, Set<string>> = new Map(); // userId -> Set of roomIds

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env['CLIENT_URL'] || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('✅ Socket.IO servisi başlatıldı');
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.headers['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token || typeof token !== 'string') {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'your-secret-key') as any;
        
        // Kullanıcıyı veritabanından kontrol et
        const user = await User.findById(decoded.userId).select('username role isActive');
        
        if (!user || !user.isActive) {
          return next(new Error('Invalid or inactive user'));
        }

        // Socket'e kullanıcı bilgilerini ekle
        (socket as any).user = {
          userId: decoded.userId,
          username: user.username,
          role: user.role
        };

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const user = (socket as any).user as AuthenticatedSocket;
      
      // Kullanıcıyı bağlı kullanıcılar listesine ekle
      console.log(`🔌 Kullanıcı bağlandı: ${user.username} (${user.userId})`);
      this.connectedUsers.set(user.userId, user);
      this.userRooms.set(user.userId, new Set());

      // Kullanıcının online olduğunu diğer kullanıcılara bildir
      socket.broadcast.emit('user_online', {
        userId: user.userId,
        username: user.username,
        timestamp: new Date().toISOString()
      });

      // Connection event'i
      socket.emit('connection', {
        success: true,
        message: 'Başarıyla bağlandınız',
        user: {
          userId: user.userId,
          username: user.username,
          role: user.role
        }
      });

      // Join room event'i
      socket.on('join_room', async (conversationId: string) => {
        try {
          // conversationId'nin geçerli bir ObjectId olup olmadığını kontrol et
          if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            socket.emit('error', {
              message: 'Geçersiz konuşma ID formatı'
            });
            return;
          }
          
          // Konuşmanın var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
          const conversation = await Conversation.findById(conversationId);
          if (!conversation) {
            socket.emit('error', {
              message: 'Konuşma bulunamadı'
            });
            return;
          }
          
          if (!conversation.participants.includes(user.userId as any)) {
            socket.emit('error', {
              message: 'Bu konuşmaya katılma yetkiniz yok'
            });
            return;
          }
          
          socket.join(conversationId);
          
          // Kullanıcının odalar listesine ekle
          const userRooms = this.userRooms.get(user.userId) || new Set();
          userRooms.add(conversationId);
          this.userRooms.set(user.userId, userRooms);

          console.log(`👥 ${user.username} odaya katıldı: ${conversationId}`);
          
          // Odadaki diğer kullanıcılara bildir
          socket.to(conversationId).emit('user_joined_room', {
            userId: user.userId,
            username: user.username,
            conversationId,
            timestamp: new Date().toISOString()
          });

          socket.emit('room_joined', {
            success: true,
            conversationId,
            message: 'Odaya başarıyla katıldınız'
          });

        } catch (error) {
          socket.emit('error', {
            message: 'Odaya katılma hatası',
            error: error
          });
        }
      });

      // Send message event'i
      socket.on('send_message', async (data: MessageData) => {
        try {
          const { conversationId, content, messageType = 'text', attachments, replyTo } = data;
          
          // conversationId'nin geçerli bir ObjectId olup olmadığını kontrol et
          if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            socket.emit('error', {
              message: 'Geçersiz konuşma ID formatı'
            });
            return;
          }
          
          // Konuşmanın var olduğunu ve kullanıcının katılımcı olduğunu kontrol et
          const conversation = await Conversation.findById(conversationId);
          if (!conversation) {
            socket.emit('error', {
              message: 'Konuşma bulunamadı'
            });
            return;
          }
          
          if (!conversation.participants.includes(user.userId as any)) {
            socket.emit('error', {
              message: 'Bu konuşmaya mesaj gönderme yetkiniz yok'
            });
            return;
          }
          // Mesajı veritabanına kaydet
          const newMessage = new Message({
            conversationId,
            senderId: user.userId,
            content,
            messageType,
            attachments: attachments || [],
            replyTo,
            status: 'sent',
            metadata: {
              sentAt: new Date(),
              clientInfo: 'Socket.IO',
              ipAddress: socket.handshake.address
            }
          });

          await newMessage.save();
          // Konuşmanın son mesaj bilgilerini güncelle
          (conversation as any).lastMessage = {
            content: content.length > 100 ? content.substring(0, 100) + '...' : content,
            sender: user.userId,
            timestamp: new Date()
          };
          conversation.updatedAt = new Date();
          await conversation.save();

          // Gönderen bilgilerini al
          const sender = await User.findById(user.userId).select('username firstName lastName profile');

          const messageData = {
            id: newMessage._id,
            conversationId,
            senderId: user.userId,
            senderName: user.username,
            sender: {
              id: sender?._id,
              username: sender?.username,
              firstName: sender?.firstName,
              lastName: sender?.lastName,
              displayName: sender?.profile?.displayName
            },
            content,
            messageType,
            attachments,
            replyTo,
            status: 'sent',
            timestamp: new Date().toISOString(),
            createdAt: newMessage.createdAt
          };

          // Odadaki tüm kullanıcılara mesajı gönder
          this.io!.to(conversationId).emit('new_message', messageData);

          // Gönderen kullanıcıya onay gönder
          socket.emit('message_sent', {
            success: true,
            messageId: messageData.id,
            timestamp: messageData.timestamp
          });

          console.log(`💬 ${user.username} mesaj gönderdi: ${conversationId}`);

        } catch (error) {
          console.log(error)
          socket.emit('error', {
            message: 'Mesaj gönderme hatası',
            error: error
          });
        }
      });

                // Message received event'i
          socket.on('message_received', async (data: { messageId: string; conversationId: string }) => {
            try {
              const { messageId, conversationId } = data;
              
              // Mesajı veritabanında bul ve durumunu güncelle
              const message = await Message.findById(messageId);
              if (message) {
                message.status = 'read';
                message.readAt = new Date();
                (message as any).readBy = user.userId;
                await message.save();
              }
              
              // Mesajın alındığını odadaki diğer kullanıcılara bildir
              socket.to(conversationId).emit('message_received', {
                messageId,
                userId: user.userId,
                username: user.username,
                timestamp: new Date().toISOString()
              });

              console.log(`✅ ${user.username} mesajı aldı: ${messageId}`);

            } catch (error) {
              socket.emit('error', {
                message: 'Mesaj alma onayı hatası',
                error: error
              });
            }
          });

      // Leave room event'i
      socket.on('leave_room', (data: { conversationId: string }) => {
        try {
          const { conversationId } = data;
          
          socket.leave(conversationId);
          
          // Kullanıcının odalar listesinden çıkar
          const userRooms = this.userRooms.get(user.userId);
          if (userRooms) {
            userRooms.delete(conversationId);
          }

          // Odadaki diğer kullanıcılara bildir
          socket.to(conversationId).emit('user_left_room', {
            userId: user.userId,
            username: user.username,
            conversationId,
            timestamp: new Date().toISOString()
          });

          console.log(`👋 ${user.username} odadan ayrıldı: ${conversationId}`);

        } catch (error) {
          socket.emit('error', {
            message: 'Odadan ayrılma hatası',
            error: error
          });
        }
      });

      // Disconnect event'i
      socket.on('disconnect', () => {
        console.log(`🔌 Kullanıcı ayrıldı: ${user.username} (${user.userId})`);
        
        // Kullanıcıyı bağlı kullanıcılar listesinden çıkar
        this.connectedUsers.delete(user.userId);
        this.userRooms.delete(user.userId);

        // Diğer kullanıcılara offline olduğunu bildir
        socket.broadcast.emit('user_offline', {
          userId: user.userId,
          username: user.username,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  // Servis metodları
  getConnectedUsers(): AuthenticatedSocket[] {
    return Array.from(this.connectedUsers.values());
  }

  getUserRooms(userId: string): string[] {
    const rooms = this.userRooms.get(userId);
    return rooms ? Array.from(rooms) : [];
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Belirli bir odaya mesaj gönderme (server-side)
  sendToRoom(roomId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(roomId).emit(event, data);
    }
  }

  // Belirli bir kullanıcıya mesaj gönderme (server-side)
  sendToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(userId).emit(event, data);
    }
  }

  // Tüm bağlı kullanıcılara mesaj gönderme (server-side)
  broadcastToAll(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

export const socketService = new SocketService(); 