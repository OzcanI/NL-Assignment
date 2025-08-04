import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { redisService } from '../services/redis';

export class AuthController {
  // Yeni kullanıcı kaydı
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, firstName, lastName, role = 'user' } = req.body;
      
      // Kullanıcı var mı kontrol et
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        res.status(409).json({ error: 'Bu email veya username zaten kullanımda' });
        return;
      }

      // Password hash'le
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Yeni kullanıcı oluştur
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        isActive: true,
        profile: {
          displayName: `${firstName} ${lastName}`.trim(),
          avatar: null,
          bio: '',
          location: '',
          website: ''
        }
      });

      await newUser.save();

      // JWT token oluştur
      const token = jwt.sign(
        { 
          userId: newUser._id, 
          username: newUser.username,
          role: newUser.role 
        },
        process.env['JWT_SECRET'] || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Refresh token oluştur
      const refreshToken = jwt.sign(
        { userId: newUser._id },
        process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Kullanıcı başarıyla oluşturuldu',
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt
        },
        token,
        refreshToken
      });
    } catch (error) {
      res.status(500).json({ error: 'Kayıt işlemi hatası', details: error });
    }
  }

  // Kullanıcı giriş işlemi
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      // Kullanıcıyı bul
      const user = await User.findOne({
        $or: [{ username }, { email: username }]
      }).select('+password');

      if (!user) {
        res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        return;
      }

      // Kullanıcı aktif mi kontrol et
      if (!user.isActive) {
        res.status(401).json({ error: 'Hesabınız aktif değil' });
        return;
      }

      // Password kontrolü
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        return;
      }

      // Son giriş zamanını güncelle
      user.lastLoginAt = new Date();
      await user.save();

      // JWT token oluştur
      const token = jwt.sign(
        { 
          userId: user._id, 
          username: user.username,
          role: user.role 
        },
        process.env['JWT_SECRET'] || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Refresh token oluştur
      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Giriş başarılı',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        },
        token,
        refreshToken
      });
    } catch (error) {
      res.status(500).json({ error: 'Giriş işlemi hatası', details: error });
    }
  }

  // Access token yenileme
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Refresh token'ı doğrula
      const decoded = jwt.verify(
        refreshToken,
        process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-key'
      ) as any;

      // Kullanıcıyı bul
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        res.status(401).json({ error: 'Geçersiz refresh token' });
        return;
      }

      // Yeni access token oluştur
      const newToken = jwt.sign(
        { 
          userId: user._id, 
          username: user.username,
          role: user.role 
        },
        process.env['JWT_SECRET'] || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Token yenilendi',
        token: newToken
      });
    } catch (error) {
      res.status(401).json({ error: 'Geçersiz refresh token' });
    }
  }

  // Kullanıcı çıkış işlemi
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken;
      const accessToken = req.body.accessToken;

      await redisService.set(`blacklist:${refreshToken}`, 'true', 60 * 60 * 24 * 7 );
      await redisService.set(`blacklist:${accessToken}`, 'true', 60 * 60 * 24 * 7 );

      res.json({
        success: true,
        message: 'Çıkış başarılı'
      });
    } catch (error) {
      res.status(500).json({ error: 'Çıkış işlemi hatası', details: error });
    }
  }

  // Kullanıcı profil bilgilerini görüntüleme
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Yetkilendirme gerekli' });
        return;
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          profile: user.profile,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Profil bilgileri alma hatası', details: error });
    }
  }

} 