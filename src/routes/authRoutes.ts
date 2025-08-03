import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { validateDto } from '../middleware/validation';
import { 
  RegisterDto, 
  LoginDto, 
  RefreshTokenDto, 
  LogoutDto
} from '../dto/auth.dto';

const router = Router();

// Public routes
router.post('/register', validateDto(RegisterDto), AuthController.register);
router.post('/login', validateDto(LoginDto), AuthController.login);
router.post('/refresh', validateDto(RefreshTokenDto), AuthController.refresh);
router.post('/logout', validateDto(LogoutDto), AuthController.logout);

// Protected routes
router.get('/me', authMiddleware, AuthController.getProfile);

export default router; 