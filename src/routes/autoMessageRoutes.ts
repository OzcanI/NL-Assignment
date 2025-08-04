import { Router } from 'express';
import { AutoMessageController } from '../controllers/autoMessageController';
import { authMiddleware } from '../middleware/auth';
import { validateDto } from '../middleware/validation';
import { CreateAutoMessageDto, UpdateAutoMessageDto } from '../dto/autoMessage.dto';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Otomatik mesaj yönetimi
router.post('/', validateDto(CreateAutoMessageDto), AutoMessageController.createAutoMessage);
router.get('/', AutoMessageController.getAutoMessages);
router.get('/stats', AutoMessageController.getAutoMessageStats);
router.get('/:autoMessageId', AutoMessageController.getAutoMessage);
router.put('/:autoMessageId', validateDto(UpdateAutoMessageDto), AutoMessageController.updateAutoMessage);
router.delete('/:autoMessageId', AutoMessageController.deleteAutoMessage);

// Manuel tetikleme (test için)
router.post('/:autoMessageId/trigger', AutoMessageController.triggerAutoMessage);

export default router; 