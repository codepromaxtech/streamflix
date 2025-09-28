import { Injectable, UnauthorizedException, TooManyRequestsException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response } from 'express';

interface LoginAttempt {
  email: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
}

@Injectable()
export class SecureAuthService {
  private readonly logger = new Logger(SecureAuthService.name);
  
  // Rate limiters
  private loginRateLimiter = new RateLimiterMemory({
    keyPrefix: 'login_fail',
    points: 5, // Number of attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
  });

  private ipRateLimiter = new RateLimiterMemory({
    keyPrefix: 'login_ip',
    points: 20, // Number of attempts per IP
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour
  });

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(email: string, password: string, req: Request, res: Response) {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Check rate limiting
      await Promise.all([
        this.loginRateLimiter.consume(email),
        this.ipRateLimiter.consume(ip),
      ]);

      // Log login attempt
      await this.logLoginAttempt({
        email,
        ip,
        userAgent,
        timestamp: new Date(),
        success: false, // Will update if successful
      });

      // Validate user credentials
      const user = await this.validateUser(email, password);
      if (!user) {
        this.logger.warn(`Failed login attempt for ${email} from ${ip}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if account is locked
      if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
        this.logger.warn(`Login attempt for locked account ${email} from ${ip}`);
        throw new UnauthorizedException('Account is temporarily locked');
      }

      // Generate secure tokens
      const tokens = await this.generateTokens(user);
      
      // Set secure cookies
      this.setSecureCookies(res, tokens);

      // Reset failed attempts and unlock account if needed
      await this.resetFailedAttempts(user.id);

      // Update login attempt as successful
      await this.logLoginAttempt({
        email,
        ip,
        userAgent,
        timestamp: new Date(),
        success: true,
      });

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          lastLoginIP: ip,
        },
      });

      this.logger.log(`Successful login for ${email} from ${ip}`);

      return {
        user: this.sanitizeUser(user),
        message: 'Login successful',
      };

    } catch (rateLimiterRes) {
      if (rateLimiterRes instanceof Error) {
        throw rateLimiterRes;
      }
      
      this.logger.warn(`Rate limit exceeded for ${email} from ${ip}`);
      throw new TooManyRequestsException('Too many login attempts. Please try again later.');
    }
  }

  async register(email: string, password: string, name: string, req: Request) {
    const ip = this.getClientIP(req);

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Hash password with Argon2
    const hashedPassword = await this.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerificationToken,
        registrationIP: ip,
        isEmailVerified: false,
      },
    });

    this.logger.log(`New user registered: ${email} from ${ip}`);

    // Send verification email (implement email service)
    // await this.emailService.sendVerificationEmail(email, emailVerificationToken);

    return {
      message: 'Registration successful. Please check your email for verification.',
      userId: user.id,
    };
  }

  async refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);
      this.setSecureCookies(res, tokens);

      return {
        user: this.sanitizeUser(user),
        message: 'Token refreshed successfully',
      };

    } catch (error) {
      this.logger.warn(`Invalid refresh token attempt from ${this.getClientIP(req)}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(req: Request, res: Response) {
    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // Optionally invalidate refresh token by incrementing tokenVersion
    const userId = req.user?.id;
    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });
    }

    return { message: 'Logout successful' };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      // Prevent timing attacks by still hashing
      await argon2.hash('dummy-password');
      return null;
    }

    const isPasswordValid = await argon2.verify(user.password, password);
    
    if (!isPasswordValid) {
      // Increment failed attempts
      await this.incrementFailedAttempts(user.id);
      return null;
    }

    return user;
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '15m',
      issuer: 'streamflix',
      audience: 'streamflix-users',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
      issuer: 'streamflix',
      audience: 'streamflix-users',
    });

    return { accessToken, refreshToken };
  }

  private setSecureCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
      saltLength: 32,
    });
  }

  private async incrementFailedAttempts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true },
    });

    const failedAttempts = (user?.failedLoginAttempts || 0) + 1;
    const shouldLock = failedAttempts >= 5;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: failedAttempts,
        isLocked: shouldLock,
        lockedUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null, // 30 minutes
      },
    });

    if (shouldLock) {
      this.logger.warn(`Account locked due to failed attempts: ${userId}`);
    }
  }

  private async resetFailedAttempts(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
    });
  }

  private async logLoginAttempt(attempt: LoginAttempt) {
    try {
      await this.prisma.loginAttempt.create({
        data: attempt,
      });
    } catch (error) {
      this.logger.error('Failed to log login attempt:', error);
    }
  }

  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  private sanitizeUser(user: any) {
    const { password, emailVerificationToken, tokenVersion, ...sanitized } = user;
    return sanitized;
  }

  async validateVideoToken(token: string, videoId: string, userId?: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('VIDEO_TOKEN_SECRET'),
      });

      // Check if token is for the specific video
      if (payload.videoId !== videoId) {
        return false;
      }

      // Check if user has access to the video
      if (userId && payload.userId !== userId) {
        return false;
      }

      // Additional checks for premium content
      if (payload.isPremium) {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.userId },
          include: { subscription: true },
        });

        if (!user?.subscription || user.subscription.status !== 'ACTIVE') {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.warn(`Invalid video token: ${error.message}`);
      return false;
    }
  }

  async generateVideoToken(videoId: string, userId: string, isPremium: boolean): Promise<string> {
    const payload = {
      videoId,
      userId,
      isPremium,
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('VIDEO_TOKEN_SECRET'),
      expiresIn: '2h', // Video tokens expire in 2 hours
    });
  }
}
