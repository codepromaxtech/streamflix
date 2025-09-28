import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

interface DRMConfig {
  widevine: {
    keySystemId: string;
    licenseServerUrl: string;
    contentId: string;
    keyId: string;
    key: string;
  };
  fairplay: {
    certificateUrl: string;
    licenseServerUrl: string;
    contentId: string;
    keyId: string;
    key: string;
  };
  playready: {
    licenseServerUrl: string;
    contentId: string;
    keyId: string;
    key: string;
  };
}

interface LicenseRequest {
  userId: string;
  contentId: string;
  deviceId: string;
  drmSystem: 'widevine' | 'fairplay' | 'playready';
  challenge?: string;
  sessionId?: string;
}

interface LicenseResponse {
  license: string;
  licenseType: string;
  expirationTime?: number;
  renewalUrl?: string;
}

@Injectable()
export class DRMService {
  private readonly logger = new Logger(DRMService.name);
  private readonly drmConfigs: Map<string, DRMConfig> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeDRMConfigs();
  }

  private initializeDRMConfigs(): void {
    // Initialize DRM configurations for different content
    // In production, these would be loaded from a secure configuration service
    this.logger.log('Initializing DRM configurations...');
  }

  async generateWidevineManifest(contentId: string, userId: string): Promise<any> {
    try {
      const drmConfig = await this.getDRMConfig(contentId);
      
      const manifest = {
        version: '1.0',
        contentId,
        drmSystems: {
          'com.widevine.alpha': {
            licenseServerUrl: drmConfig.widevine.licenseServerUrl,
            httpRequestHeaders: {
              'X-User-Id': userId,
              'X-Content-Id': contentId,
              'Authorization': await this.generateDRMToken(userId, contentId),
            },
            distinctiveIdentifierRequired: false,
            persistentStateRequired: false,
            videoRobustness: 'SW_SECURE_CRYPTO',
            audioRobustness: 'SW_SECURE_CRYPTO',
          },
        },
        tracks: await this.getContentTracks(contentId),
      };

      return manifest;
    } catch (error) {
      this.logger.error(`Error generating Widevine manifest for content ${contentId}:`, error);
      throw new BadRequestException('Failed to generate DRM manifest');
    }
  }

  async generateFairPlayManifest(contentId: string, userId: string): Promise<any> {
    try {
      const drmConfig = await this.getDRMConfig(contentId);
      
      const manifest = {
        version: '1.0',
        contentId,
        drmSystems: {
          'com.apple.fps.1_0': {
            certificateUrl: drmConfig.fairplay.certificateUrl,
            licenseServerUrl: drmConfig.fairplay.licenseServerUrl,
            httpRequestHeaders: {
              'X-User-Id': userId,
              'X-Content-Id': contentId,
              'Authorization': await this.generateDRMToken(userId, contentId),
            },
          },
        },
        tracks: await this.getContentTracks(contentId),
      };

      return manifest;
    } catch (error) {
      this.logger.error(`Error generating FairPlay manifest for content ${contentId}:`, error);
      throw new BadRequestException('Failed to generate DRM manifest');
    }
  }

  async generatePlayReadyManifest(contentId: string, userId: string): Promise<any> {
    try {
      const drmConfig = await this.getDRMConfig(contentId);
      
      const manifest = {
        version: '1.0',
        contentId,
        drmSystems: {
          'com.microsoft.playready': {
            licenseServerUrl: drmConfig.playready.licenseServerUrl,
            httpRequestHeaders: {
              'X-User-Id': userId,
              'X-Content-Id': contentId,
              'Authorization': await this.generateDRMToken(userId, contentId),
            },
            distinctiveIdentifierRequired: false,
            persistentStateRequired: false,
          },
        },
        tracks: await this.getContentTracks(contentId),
      };

      return manifest;
    } catch (error) {
      this.logger.error(`Error generating PlayReady manifest for content ${contentId}:`, error);
      throw new BadRequestException('Failed to generate DRM manifest');
    }
  }

  async processLicenseRequest(request: LicenseRequest): Promise<LicenseResponse> {
    try {
      // Validate user access to content
      await this.validateUserAccess(request.userId, request.contentId);
      
      // Validate device
      await this.validateDevice(request.deviceId, request.userId);
      
      switch (request.drmSystem) {
        case 'widevine':
          return await this.processWidevineLicense(request);
        case 'fairplay':
          return await this.processFairPlayLicense(request);
        case 'playready':
          return await this.processPlayReadyLicense(request);
        default:
          throw new BadRequestException('Unsupported DRM system');
      }
    } catch (error) {
      this.logger.error('Error processing license request:', error);
      throw new BadRequestException('Failed to process license request');
    }
  }

  private async processWidevineLicense(request: LicenseRequest): Promise<LicenseResponse> {
    try {
      const drmConfig = await this.getDRMConfig(request.contentId);
      
      // Decrypt the license challenge
      const challenge = this.decryptChallenge(request.challenge, drmConfig.widevine.key);
      
      // Generate content keys
      const contentKeys = await this.generateContentKeys(request.contentId, drmConfig.widevine);
      
      // Create license response
      const licenseData = {
        contentId: request.contentId,
        keys: contentKeys,
        policy: await this.getLicensePolicy(request.userId, request.contentId),
        expirationTime: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
      
      // Encrypt license response
      const encryptedLicense = this.encryptLicense(licenseData, drmConfig.widevine.key);
      
      return {
        license: encryptedLicense,
        licenseType: 'widevine',
        expirationTime: licenseData.expirationTime,
        renewalUrl: `${drmConfig.widevine.licenseServerUrl}/renew`,
      };
    } catch (error) {
      this.logger.error('Error processing Widevine license:', error);
      throw new BadRequestException('Failed to process Widevine license');
    }
  }

  private async processFairPlayLicense(request: LicenseRequest): Promise<LicenseResponse> {
    try {
      const drmConfig = await this.getDRMConfig(request.contentId);
      
      // Process FairPlay Streaming (FPS) license request
      const spcData = Buffer.from(request.challenge, 'base64');
      
      // Generate content key context (CKC)
      const contentKeys = await this.generateContentKeys(request.contentId, drmConfig.fairplay);
      const policy = await this.getLicensePolicy(request.userId, request.contentId);
      
      // Create CKC response
      const ckcData = this.createFairPlayCKC(spcData, contentKeys, policy);
      
      return {
        license: ckcData.toString('base64'),
        licenseType: 'fairplay',
        expirationTime: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
    } catch (error) {
      this.logger.error('Error processing FairPlay license:', error);
      throw new BadRequestException('Failed to process FairPlay license');
    }
  }

  private async processPlayReadyLicense(request: LicenseRequest): Promise<LicenseResponse> {
    try {
      const drmConfig = await this.getDRMConfig(request.contentId);
      
      // Parse PlayReady challenge
      const challenge = this.parsePlayReadyChallenge(request.challenge);
      
      // Generate content keys
      const contentKeys = await this.generateContentKeys(request.contentId, drmConfig.playready);
      
      // Create PlayReady license
      const licenseData = {
        contentId: request.contentId,
        keys: contentKeys,
        policy: await this.getLicensePolicy(request.userId, request.contentId),
        playEnablers: ['786627D8-C2A6-44BE-8F88-08AE255B01A7'], // PLAY enabler
      };
      
      // Generate PlayReady license response
      const playreadyLicense = this.generatePlayReadyLicense(licenseData);
      
      return {
        license: playreadyLicense,
        licenseType: 'playready',
        expirationTime: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
    } catch (error) {
      this.logger.error('Error processing PlayReady license:', error);
      throw new BadRequestException('Failed to process PlayReady license');
    }
  }

  private async getDRMConfig(contentId: string): Promise<DRMConfig> {
    // In production, this would fetch DRM configuration from database
    // For now, return a default configuration
    return {
      widevine: {
        keySystemId: 'com.widevine.alpha',
        licenseServerUrl: this.configService.get('WIDEVINE_LICENSE_SERVER_URL'),
        contentId,
        keyId: this.generateKeyId(contentId),
        key: this.generateContentKey(contentId),
      },
      fairplay: {
        certificateUrl: this.configService.get('FAIRPLAY_CERTIFICATE_URL'),
        licenseServerUrl: this.configService.get('FAIRPLAY_LICENSE_SERVER_URL'),
        contentId,
        keyId: this.generateKeyId(contentId),
        key: this.generateContentKey(contentId),
      },
      playready: {
        licenseServerUrl: this.configService.get('PLAYREADY_LICENSE_SERVER_URL'),
        contentId,
        keyId: this.generateKeyId(contentId),
        key: this.generateContentKey(contentId),
      },
    };
  }

  private async getContentTracks(contentId: string): Promise<any[]> {
    // In production, this would fetch track information from database
    return [
      {
        id: 1,
        type: 'video',
        codecs: 'avc1.64001e',
        bandwidth: 1000000,
        width: 1280,
        height: 720,
        encrypted: true,
      },
      {
        id: 2,
        type: 'audio',
        codecs: 'mp4a.40.2',
        bandwidth: 128000,
        language: 'en',
        encrypted: true,
      },
    ];
  }

  private async validateUserAccess(userId: string, contentId: string): Promise<boolean> {
    // Implement user access validation logic
    // Check subscription status, content availability, geo-restrictions, etc.
    
    try {
      // This would typically involve database queries to check:
      // 1. User subscription status
      // 2. Content availability in user's region
      // 3. Parental controls
      // 4. Content licensing restrictions
      
      return true; // Simplified for example
    } catch (error) {
      this.logger.error('Error validating user access:', error);
      throw new BadRequestException('Access denied');
    }
  }

  private async validateDevice(deviceId: string, userId: string): Promise<boolean> {
    // Implement device validation logic
    // Check device registration, concurrent stream limits, etc.
    
    try {
      // This would typically check:
      // 1. Device is registered to user
      // 2. Concurrent stream limits
      // 3. Device security status
      
      return true; // Simplified for example
    } catch (error) {
      this.logger.error('Error validating device:', error);
      throw new BadRequestException('Device validation failed');
    }
  }

  private async generateContentKeys(contentId: string, drmConfig: any): Promise<any[]> {
    // Generate content encryption keys
    const keyId = drmConfig.keyId;
    const key = drmConfig.key;
    
    return [
      {
        keyId: Buffer.from(keyId, 'hex'),
        key: Buffer.from(key, 'hex'),
        type: 'content',
      },
    ];
  }

  private async getLicensePolicy(userId: string, contentId: string): Promise<any> {
    // Generate license policy based on user subscription and content settings
    return {
      canPlay: true,
      canPersist: false,
      canRenew: true,
      rentalDuration: 24 * 60 * 60, // 24 hours in seconds
      playbackDuration: 48 * 60 * 60, // 48 hours in seconds
      licenseStartTime: Date.now(),
      licenseEndTime: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      hdcpRequired: true,
      maxResolution: '1080p',
      outputProtection: {
        digital: true,
        analog: false,
      },
    };
  }

  private generateKeyId(contentId: string): string {
    // Generate a deterministic key ID based on content ID
    const hash = crypto.createHash('sha256').update(contentId).digest('hex');
    return hash.substring(0, 32);
  }

  private generateContentKey(contentId: string): string {
    // Generate a deterministic content key based on content ID and secret
    const secret = this.configService.get('DRM_SECRET_KEY');
    const hash = crypto.createHmac('sha256', secret).update(contentId).digest('hex');
    return hash.substring(0, 32);
  }

  private async generateDRMToken(userId: string, contentId: string): Promise<string> {
    const payload = {
      userId,
      contentId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
    };
    
    const secret = this.configService.get('DRM_TOKEN_SECRET');
    return jwt.sign(payload, secret);
  }

  private decryptChallenge(challenge: string, key: string): any {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(challenge, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Error decrypting challenge:', error);
      throw new BadRequestException('Invalid challenge');
    }
  }

  private encryptLicense(licenseData: any, key: string): string {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', key);
      let encrypted = cipher.update(JSON.stringify(licenseData), 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    } catch (error) {
      this.logger.error('Error encrypting license:', error);
      throw new BadRequestException('License encryption failed');
    }
  }

  private createFairPlayCKC(spcData: Buffer, contentKeys: any[], policy: any): Buffer {
    // Simplified FairPlay CKC creation
    // In production, this would use Apple's FairPlay SDK
    
    const ckcData = {
      contentKeys,
      policy,
      timestamp: Date.now(),
    };
    
    return Buffer.from(JSON.stringify(ckcData));
  }

  private parsePlayReadyChallenge(challenge: string): any {
    // Parse PlayReady challenge XML
    // This is a simplified implementation
    
    try {
      const challengeData = Buffer.from(challenge, 'base64').toString('utf8');
      // In production, this would properly parse PlayReady XML challenge
      return {
        contentId: 'parsed-content-id',
        keyIds: ['parsed-key-ids'],
      };
    } catch (error) {
      this.logger.error('Error parsing PlayReady challenge:', error);
      throw new BadRequestException('Invalid PlayReady challenge');
    }
  }

  private generatePlayReadyLicense(licenseData: any): string {
    // Generate PlayReady license XML
    // This is a simplified implementation
    
    const licenseXml = `
      <?xml version="1.0" encoding="utf-8"?>
      <PlayReadyLicense>
        <ContentId>${licenseData.contentId}</ContentId>
        <Keys>
          ${licenseData.keys.map(key => `<Key KeyId="${key.keyId.toString('hex')}" Value="${key.key.toString('hex')}" />`).join('')}
        </Keys>
        <Policy>
          <PlayEnablers>
            ${licenseData.playEnablers.map(pe => `<PlayEnabler>${pe}</PlayEnabler>`).join('')}
          </PlayEnablers>
        </Policy>
      </PlayReadyLicense>
    `;
    
    return Buffer.from(licenseXml).toString('base64');
  }

  async revokeLicense(userId: string, contentId: string, deviceId?: string): Promise<void> {
    try {
      // Implement license revocation logic
      // This would typically involve:
      // 1. Adding license to revocation list
      // 2. Notifying CDN/license servers
      // 3. Updating device-specific revocation lists
      
      this.logger.log(`License revoked for user ${userId}, content ${contentId}, device ${deviceId}`);
    } catch (error) {
      this.logger.error('Error revoking license:', error);
      throw new BadRequestException('License revocation failed');
    }
  }

  async getLicenseStatus(userId: string, contentId: string): Promise<any> {
    try {
      // Return license status information
      return {
        userId,
        contentId,
        status: 'active',
        expirationTime: Date.now() + (24 * 60 * 60 * 1000),
        devicesUsed: 1,
        maxDevices: 5,
      };
    } catch (error) {
      this.logger.error('Error getting license status:', error);
      throw new BadRequestException('Failed to get license status');
    }
  }
}
