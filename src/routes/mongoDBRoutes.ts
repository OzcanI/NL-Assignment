import { Router } from 'express';
import { MongoDBController } from '../controllers/mongoDBController';

const router = Router();

// MongoDB durum kontrolü
router.get('/status', MongoDBController.getStatus);

// Veritabanı işlemleri
router.get('/collections', MongoDBController.getCollections);
router.get('/stats', MongoDBController.getDatabaseStats);
router.get('/collection/:collectionName/stats', MongoDBController.getCollectionStats);

// User işlemleri
router.post('/users', MongoDBController.createUser);
router.get('/users', MongoDBController.getUsers);

// Conversation işlemleri
router.post('/conversations', MongoDBController.createConversation);
router.get('/conversations', MongoDBController.getConversations);

// Message işlemleri
router.post('/messages', MongoDBController.createMessage);
router.get('/conversations/:conversationId/messages', MongoDBController.getMessages);

// AutoMessage işlemleri
router.post('/auto-messages', MongoDBController.createAutoMessage);
router.get('/auto-messages', MongoDBController.getAutoMessages);

export default router; 