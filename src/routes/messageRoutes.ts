import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { ConversationController } from '../controllers/conversationController';
import { authMiddleware } from '../middleware/auth';
import { validateDto, validateQuery } from '../middleware/validation';
import { 
  SendMessageDto, 
  UpdateMessageDto, 
  UpdateMessageStatusDto, 
  SearchMessagesQueryDto, 
  GetMessagesQueryDto 
} from '../dto/message.dto';
import { 
  CreateConversationDto, 
  UpdateConversationDto, 
  AddParticipantsDto, 
  RemoveParticipantsDto, 
  GetConversationsQueryDto 
} from '../dto/conversation.dto';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Mesaj yönetimi endpoints
router.post('/send', validateDto(SendMessageDto), MessageController.sendMessage);
router.get('/conversation/:conversationId', validateQuery(GetMessagesQueryDto), MessageController.getMessages);
router.put('/:messageId', validateDto(UpdateMessageDto), MessageController.updateMessage);
router.delete('/:messageId', MessageController.deleteMessage);
router.patch('/:messageId/status', validateDto(UpdateMessageStatusDto), MessageController.updateMessageStatus);
router.get('/search', validateQuery(SearchMessagesQueryDto), MessageController.searchMessages);

// Konuşma yönetimi endpoints
router.post('/conversations', validateDto(CreateConversationDto), ConversationController.createConversation);
router.get('/conversations', validateQuery(GetConversationsQueryDto), ConversationController.getConversations);
router.get('/conversations/:conversationId', ConversationController.getConversation);
router.put('/conversations/:conversationId', validateDto(UpdateConversationDto), ConversationController.updateConversation);
router.post('/conversations/:conversationId/participants', validateDto(AddParticipantsDto), ConversationController.addParticipants);
router.delete('/conversations/:conversationId/participants', validateDto(RemoveParticipantsDto), ConversationController.removeParticipants);
router.delete('/conversations/:conversationId', ConversationController.deleteConversation);

export default router; 