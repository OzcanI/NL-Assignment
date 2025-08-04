import { Router } from 'express';
import { SocketController } from '../controllers/socketController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { validateDto } from '../middleware/validation';
import { BroadcastMessageDto, GetUserRoomsDto, SendPrivateMessageDto, SendSystemMessageDto } from '../dto/socket.dto';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Socket.IO yönetimi endpoints
router.get('/status', SocketController.getSocketStatus);
router.get('/connected-users', requireAdmin, SocketController.getConnectedUsers);
router.get('/user/:userId/rooms', validateDto(GetUserRoomsDto), SocketController.getUserRooms);
router.get('/user/:userId/online', SocketController.checkUserOnline);

// Mesaj gönderme endpoints (admin/moderator yetkisi gerekli)
router.post('/system-message', requireAdmin, validateDto(SendSystemMessageDto), SocketController.sendSystemMessage);
router.post('/private-message', requireAdmin, validateDto(SendPrivateMessageDto), SocketController.sendPrivateMessage);
router.post('/broadcast', requireAdmin, validateDto(BroadcastMessageDto), SocketController.broadcastMessage);

export default router; 