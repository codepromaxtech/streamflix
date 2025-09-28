import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface TwoFactorVerification {
  isValid: boolean;
  backupCodeUsed?: boolean;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async setupTwoFactor(userId: string): Promise<TwoFactorSetup> {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `StreamFlix (${user.email})`,
        issuer: 'StreamFlix',
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store in database (not enabled yet)
      await this.prisma.twoFactorAuth.upsert({
        where: { userId },
        update: {
          secret: this.encrypt(secret.base32),
          backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
          isEnabled: false,
          createdAt: new Date(),
        },
        create: {
          userId,
          secret: this.encrypt(secret.base32),
          backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
          isEnabled: false,
        },
      });

      this.logger.log(`2FA setup initiated for user ${userId}`);

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32,
      };
    } catch (error) {
      this.logger.error('Error setting up 2FA:', error);
      throw error;
    }
  }

  async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    try {
      const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (!twoFactorAuth) {
        throw new BadRequestException('2FA not set up');
      }

      // Verify the token
      const secret = this.decrypt(twoFactorAuth.secret);
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps before/after
      });

      if (!isValid) {
        throw new BadRequestException('Invalid verification code');
      }

      // Enable 2FA
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          isEnabled: true,
          enabledAt: new Date(),
        },
      });

      this.logger.log(`2FA enabled for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  async disableTwoFactor(userId: string, token: string): Promise<boolean> {
    try {
      const verification = await this.verifyTwoFactor(userId, token);
      
      if (!verification.isValid) {
        throw new BadRequestException('Invalid verification code');
      }

      // Disable 2FA
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          isEnabled: false,
          disabledAt: new Date(),
        },
      });

      this.logger.log(`2FA disabled for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  async verifyTwoFactor(userId: string, token: string): Promise<TwoFactorVerification> {
    try {
      const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
        return { isValid: false };
      }

      // First try TOTP verification
      const secret = this.decrypt(twoFactorAuth.secret);
      const isValidTOTP = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (isValidTOTP) {
        return { isValid: true };
      }

      // If TOTP fails, try backup codes
      const hashedToken = this.hashBackupCode(token);
      const backupCodeIndex = twoFactorAuth.backupCodes.findIndex(
        code => code === hashedToken
      );

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        const updatedBackupCodes = [...twoFactorAuth.backupCodes];
        updatedBackupCodes.splice(backupCodeIndex, 1);

        await this.prisma.twoFactorAuth.update({
          where: { userId },
          data: {
            backupCodes: updatedBackupCodes,
            lastUsedAt: new Date(),
          },
        });

        this.logger.log(`Backup code used for user ${userId}`);
        return { isValid: true, backupCodeUsed: true };
      }

      return { isValid: false };
    } catch (error) {
      this.logger.error('Error verifying 2FA:', error);
      return { isValid: false };
    }
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      return twoFactorAuth?.isEnabled || false;
    } catch (error) {
      this.logger.error('Error checking 2FA status:', error);
      return false;
    }
  }

  async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    try {
      const verification = await this.verifyTwoFactor(userId, token);
      
      if (!verification.isValid) {
        throw new BadRequestException('Invalid verification code');
      }

      const newBackupCodes = this.generateBackupCodes();

      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes: newBackupCodes.map(code => this.hashBackupCode(code)),
        },
      });

      this.logger.log(`Backup codes regenerated for user ${userId}`);
      return newBackupCodes;
    } catch (error) {
      this.logger.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  async getTwoFactorStatus(userId: string): Promise<{
    isEnabled: boolean;
    backupCodesCount: number;
    lastUsedAt?: Date;
    enabledAt?: Date;
  }> {
    try {
      const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (!twoFactorAuth) {
        return {
          isEnabled: false,
          backupCodesCount: 0,
        };
      }

      return {
        isEnabled: twoFactorAuth.isEnabled,
        backupCodesCount: twoFactorAuth.backupCodes.length,
        lastUsedAt: twoFactorAuth.lastUsedAt,
        enabledAt: twoFactorAuth.enabledAt,
      };
    } catch (error) {
      this.logger.error('Error getting 2FA status:', error);
      return {
        isEnabled: false,
        backupCodesCount: 0,
      };
    }
  }

  // Recovery methods for when user loses access
  async initiateRecovery(userId: string, email: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, email },
      });

      if (!user) {
        throw new BadRequestException('User not found or email mismatch');
      }

      // Generate recovery token
      const recoveryToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.prisma.twoFactorRecovery.create({
        data: {
          userId,
          token: this.hashRecoveryToken(recoveryToken),
          expiresAt,
        },
      });

      this.logger.log(`2FA recovery initiated for user ${userId}`);
      return recoveryToken;
    } catch (error) {
      this.logger.error('Error initiating 2FA recovery:', error);
      throw error;
    }
  }

  async completeRecovery(recoveryToken: string, newPassword: string): Promise<boolean> {
    try {
      const hashedToken = this.hashRecoveryToken(recoveryToken);
      
      const recovery = await this.prisma.twoFactorRecovery.findFirst({
        where: {
          token: hashedToken,
          expiresAt: {
            gt: new Date(),
          },
          isUsed: false,
        },
      });

      if (!recovery) {
        throw new BadRequestException('Invalid or expired recovery token');
      }

      // Disable 2FA and update password
      await this.prisma.$transaction([
        this.prisma.twoFactorAuth.update({
          where: { userId: recovery.userId },
          data: {
            isEnabled: false,
            disabledAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: recovery.userId },
          data: {
            password: newPassword, // Should be hashed before calling this method
          },
        }),
        this.prisma.twoFactorRecovery.update({
          where: { id: recovery.id },
          data: {
            isUsed: true,
            usedAt: new Date(),
          },
        }),
      ]);

      this.logger.log(`2FA recovery completed for user ${recovery.userId}`);
      return true;
    } catch (error) {
      this.logger.error('Error completing 2FA recovery:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-digit codes
      const code = Math.random().toString().substr(2, 8);
      codes.push(code);
    }
    return codes;
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey = this.configService.get('TWO_FACTOR_SECRET_KEY') || 'default-secret-key-change-in-production';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey = this.configService.get('TWO_FACTOR_SECRET_KEY') || 'default-secret-key-change-in-production';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private hashRecoveryToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
