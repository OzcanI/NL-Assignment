import { Request, Response } from 'express';
import { User } from '../models';

export class UserController {
  // Sistemdeki kullanıcıları listeleme
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, role, isActive, search } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      
      // Filtre oluştur
      const filter: any = {};
      
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive;
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await User.countDocuments(filter);

      res.json({
        success: true,
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Kullanıcı listesi alma hatası', details: error });
    }
  }
} 