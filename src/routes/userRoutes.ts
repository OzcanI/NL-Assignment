import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { GetUsersQueryDto } from '../dto/auth.dto';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Kullanıcı yönetimi endpoints
router.get('/list', validateQuery(GetUsersQueryDto), UserController.getUsers);

export default router; 