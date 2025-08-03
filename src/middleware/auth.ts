import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redisService } from '../services/redis';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token gerekli' });
      return;
    }

    const token = authHeader.substring(7); // "Bearer " kısmını çıkar

    // Check Blacklist
    const isBlacklisted = await redisService.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({ error: 'Token blacklisted' });
      return;
    }

    // Token'ı doğrula
    const decoded = jwt.verify(
      token,
      process.env['JWT_SECRET'] || 'your-secret-key'
    ) as any;

    // Request'e user bilgilerini ekle
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Geçersiz token' });
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Yetkilendirme gerekli' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      return;
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole(['admin']);

// Admin or moderator middleware
export const requireAdminOrModerator = requireRole(['admin', 'moderator']); 