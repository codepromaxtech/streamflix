import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomBytes } from 'crypto';

interface TenantConfig {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  plan: 'starter' | 'professional' | 'enterprise' | 'custom';
  features: TenantFeatures;
  branding: TenantBranding;
  limits: TenantLimits;
  billing: TenantBilling;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantFeatures {
  liveStreaming: boolean;
  drm: boolean;
  analytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  sso: boolean;
  multiLanguage: boolean;
  mobileApps: boolean;
  advancedSecurity: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
  customDomain: boolean;
}

interface TenantBranding {
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCSS?: string;
  loginBackground?: string;
  appName: string;
  tagline?: string;
}

interface TenantLimits {
  maxUsers: number;
  maxContent: number;
  maxStorage: number; // in GB
  maxBandwidth: number; // in GB per month
  maxConcurrentStreams: number;
  maxLiveStreams: number;
  maxAdmins: number;
  apiRateLimit: number; // requests per minute
}

interface TenantBilling {
  plan: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  nextBillingDate: Date;
  paymentMethod?: string;
  billingAddress?: any;
  invoiceEmail: string;
}

interface TenantSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
  emailNotifications: boolean;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  socialLogin: boolean;
  contentModeration: boolean;
  chatModeration: boolean;
  geoRestrictions?: string[];
  allowedCountries?: string[];
  blockedCountries?: string[];
}

interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  role: 'owner' | 'admin' | 'moderator' | 'user';
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private tenantCache: Map<string, TenantConfig> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeTenantCache();
  }

  private async initializeTenantCache(): Promise<void> {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'active' },
      });

      tenants.forEach(tenant => {
        this.tenantCache.set(tenant.domain, tenant as any);
        this.tenantCache.set(tenant.subdomain, tenant as any);
      });

      this.logger.log(`Initialized tenant cache with ${tenants.length} active tenants`);
    } catch (error) {
      this.logger.error('Error initializing tenant cache:', error);
    }
  }

  async createTenant(
    name: string,
    domain: string,
    ownerEmail: string,
    plan: string = 'starter',
    options?: {
      subdomain?: string;
      customBranding?: Partial<TenantBranding>;
      features?: Partial<TenantFeatures>;
    },
  ): Promise<TenantConfig> {
    try {
      // Validate domain availability
      await this.validateDomainAvailability(domain, options?.subdomain);

      const tenantId = this.generateTenantId();
      const subdomain = options?.subdomain || this.generateSubdomain(name);

      // Get plan configuration
      const planConfig = this.getPlanConfiguration(plan);

      const tenant: TenantConfig = {
        id: tenantId,
        name,
        domain,
        subdomain,
        status: plan === 'trial' ? 'trial' : 'active',
        plan: plan as any,
        features: { ...planConfig.features, ...options?.features },
        branding: {
          ...this.getDefaultBranding(),
          appName: name,
          ...options?.customBranding,
        },
        limits: planConfig.limits,
        billing: {
          plan,
          billingCycle: 'monthly',
          amount: planConfig.pricing.monthly,
          currency: 'USD',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          invoiceEmail: ownerEmail,
        },
        settings: this.getDefaultSettings(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create tenant in database
      await this.prisma.tenant.create({
        data: {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          subdomain: tenant.subdomain,
          status: tenant.status,
          plan: tenant.plan,
          features: tenant.features,
          branding: tenant.branding,
          limits: tenant.limits,
          billing: tenant.billing,
          settings: tenant.settings,
        },
      });

      // Create tenant owner
      await this.createTenantUser(tenantId, ownerEmail, 'owner');

      // Initialize tenant database schema
      await this.initializeTenantSchema(tenantId);

      // Setup tenant infrastructure
      await this.setupTenantInfrastructure(tenant);

      // Add to cache
      this.tenantCache.set(domain, tenant);
      this.tenantCache.set(subdomain, tenant);

      this.logger.log(`Tenant created: ${tenantId} (${name})`);
      
      // Emit event
      this.eventEmitter.emit('tenant.created', tenant);

      return tenant;
    } catch (error) {
      this.logger.error('Error creating tenant:', error);
      throw new BadRequestException('Failed to create tenant');
    }
  }

  async getTenantByDomain(domain: string): Promise<TenantConfig | null> {
    try {
      // Check cache first
      let tenant = this.tenantCache.get(domain);
      if (tenant) {
        return tenant;
      }

      // Query database
      const tenantData = await this.prisma.tenant.findFirst({
        where: {
          OR: [
            { domain },
            { subdomain: domain },
          ],
        },
      });

      if (tenantData) {
        tenant = tenantData as TenantConfig;
        this.tenantCache.set(domain, tenant);
        return tenant;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting tenant by domain:', error);
      return null;
    }
  }

  async getTenantById(tenantId: string): Promise<TenantConfig | null> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      return tenant as any;
    } catch (error) {
      this.logger.error('Error getting tenant by ID:', error);
      return null;
    }
  }

  async updateTenant(
    tenantId: string,
    updates: Partial<TenantConfig>,
  ): Promise<TenantConfig> {
    try {
      const tenant = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      // Update cache
      if (tenant.domain) {
        this.tenantCache.set(tenant.domain, tenant as any);
      }
      if (tenant.subdomain) {
        this.tenantCache.set(tenant.subdomain, tenant as any);
      }

      this.logger.log(`Tenant updated: ${tenantId}`);
      
      // Emit event
      this.eventEmitter.emit('tenant.updated', tenant);

      return tenant as any;
    } catch (error) {
      this.logger.error('Error updating tenant:', error);
      throw new BadRequestException('Failed to update tenant');
    }
  }

  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    try {
      await this.updateTenant(tenantId, {
        status: 'suspended',
      });

      // Disable tenant services
      await this.disableTenantServices(tenantId);

      this.logger.log(`Tenant suspended: ${tenantId} - ${reason}`);
      
      // Emit event
      this.eventEmitter.emit('tenant.suspended', { tenantId, reason });
    } catch (error) {
      this.logger.error('Error suspending tenant:', error);
      throw new BadRequestException('Failed to suspend tenant');
    }
  }

  async deleteTenant(tenantId: string): Promise<void> {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      // Backup tenant data
      await this.backupTenantData(tenantId);

      // Delete tenant infrastructure
      await this.deleteTenantInfrastructure(tenantId);

      // Delete from database
      await this.prisma.tenant.delete({
        where: { id: tenantId },
      });

      // Remove from cache
      this.tenantCache.delete(tenant.domain);
      this.tenantCache.delete(tenant.subdomain);

      this.logger.log(`Tenant deleted: ${tenantId}`);
      
      // Emit event
      this.eventEmitter.emit('tenant.deleted', { tenantId });
    } catch (error) {
      this.logger.error('Error deleting tenant:', error);
      throw new BadRequestException('Failed to delete tenant');
    }
  }

  async createTenantUser(
    tenantId: string,
    email: string,
    role: 'owner' | 'admin' | 'moderator' | 'user',
    permissions?: string[],
  ): Promise<TenantUser> {
    try {
      const userId = this.generateUserId();
      const defaultPermissions = this.getDefaultPermissions(role);

      const tenantUser: TenantUser = {
        id: userId,
        tenantId,
        email,
        role,
        permissions: permissions || defaultPermissions,
        isActive: true,
        createdAt: new Date(),
      };

      await this.prisma.tenantUser.create({
        data: tenantUser,
      });

      this.logger.log(`Tenant user created: ${userId} (${email}) for tenant ${tenantId}`);

      return tenantUser;
    } catch (error) {
      this.logger.error('Error creating tenant user:', error);
      throw new BadRequestException('Failed to create tenant user');
    }
  }

  async validateTenantAccess(
    tenantId: string,
    userId: string,
    requiredPermission?: string,
  ): Promise<boolean> {
    try {
      const tenantUser = await this.prisma.tenantUser.findFirst({
        where: {
          tenantId,
          userId,
          isActive: true,
        },
      });

      if (!tenantUser) {
        return false;
      }

      if (requiredPermission) {
        return tenantUser.permissions.includes(requiredPermission) || 
               tenantUser.role === 'owner';
      }

      return true;
    } catch (error) {
      this.logger.error('Error validating tenant access:', error);
      return false;
    }
  }

  async getTenantUsage(tenantId: string): Promise<any> {
    try {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      // Get current usage statistics
      const usage = {
        users: await this.getTenantUserCount(tenantId),
        content: await this.getTenantContentCount(tenantId),
        storage: await this.getTenantStorageUsage(tenantId),
        bandwidth: await this.getTenantBandwidthUsage(tenantId),
        concurrentStreams: await this.getTenantConcurrentStreams(tenantId),
        liveStreams: await this.getTenantLiveStreamCount(tenantId),
        apiRequests: await this.getTenantApiUsage(tenantId),
      };

      // Calculate usage percentages
      const usagePercentages = {
        users: (usage.users / tenant.limits.maxUsers) * 100,
        content: (usage.content / tenant.limits.maxContent) * 100,
        storage: (usage.storage / (tenant.limits.maxStorage * 1024 * 1024 * 1024)) * 100,
        bandwidth: (usage.bandwidth / (tenant.limits.maxBandwidth * 1024 * 1024 * 1024)) * 100,
        concurrentStreams: (usage.concurrentStreams / tenant.limits.maxConcurrentStreams) * 100,
        liveStreams: (usage.liveStreams / tenant.limits.maxLiveStreams) * 100,
      };

      return {
        usage,
        limits: tenant.limits,
        percentages: usagePercentages,
        warnings: this.generateUsageWarnings(usagePercentages),
      };
    } catch (error) {
      this.logger.error('Error getting tenant usage:', error);
      throw new BadRequestException('Failed to get tenant usage');
    }
  }

  private async validateDomainAvailability(domain: string, subdomain?: string): Promise<void> {
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { domain },
          { subdomain: subdomain || domain },
        ],
      },
    });

    if (existingTenant) {
      throw new BadRequestException('Domain or subdomain already exists');
    }
  }

  private generateTenantId(): string {
    return `tenant_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateSubdomain(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private getPlanConfiguration(plan: string): any {
    const plans = {
      starter: {
        features: {
          liveStreaming: false,
          drm: false,
          analytics: true,
          customBranding: false,
          apiAccess: true,
          sso: false,
          multiLanguage: false,
          mobileApps: false,
          advancedSecurity: false,
          prioritySupport: false,
          whiteLabel: false,
          customDomain: false,
        },
        limits: {
          maxUsers: 1000,
          maxContent: 100,
          maxStorage: 50, // GB
          maxBandwidth: 500, // GB per month
          maxConcurrentStreams: 50,
          maxLiveStreams: 0,
          maxAdmins: 2,
          apiRateLimit: 100,
        },
        pricing: {
          monthly: 99,
          yearly: 990,
        },
      },
      professional: {
        features: {
          liveStreaming: true,
          drm: true,
          analytics: true,
          customBranding: true,
          apiAccess: true,
          sso: false,
          multiLanguage: true,
          mobileApps: true,
          advancedSecurity: true,
          prioritySupport: false,
          whiteLabel: false,
          customDomain: true,
        },
        limits: {
          maxUsers: 10000,
          maxContent: 1000,
          maxStorage: 500, // GB
          maxBandwidth: 5000, // GB per month
          maxConcurrentStreams: 500,
          maxLiveStreams: 10,
          maxAdmins: 5,
          apiRateLimit: 500,
        },
        pricing: {
          monthly: 299,
          yearly: 2990,
        },
      },
      enterprise: {
        features: {
          liveStreaming: true,
          drm: true,
          analytics: true,
          customBranding: true,
          apiAccess: true,
          sso: true,
          multiLanguage: true,
          mobileApps: true,
          advancedSecurity: true,
          prioritySupport: true,
          whiteLabel: true,
          customDomain: true,
        },
        limits: {
          maxUsers: 100000,
          maxContent: 10000,
          maxStorage: 5000, // GB
          maxBandwidth: 50000, // GB per month
          maxConcurrentStreams: 5000,
          maxLiveStreams: 100,
          maxAdmins: 20,
          apiRateLimit: 2000,
        },
        pricing: {
          monthly: 999,
          yearly: 9990,
        },
      },
    };

    return plans[plan] || plans.starter;
  }

  private getDefaultBranding(): TenantBranding {
    return {
      logo: '/default-logo.png',
      favicon: '/default-favicon.ico',
      primaryColor: '#e50914',
      secondaryColor: '#221f1f',
      accentColor: '#f5f5f1',
      fontFamily: 'Netflix Sans, Arial, sans-serif',
      appName: 'StreamFlix',
    };
  }

  private getDefaultSettings(): TenantSettings {
    return {
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD',
      emailNotifications: true,
      maintenanceMode: false,
      registrationEnabled: true,
      socialLogin: false,
      contentModeration: true,
      chatModeration: true,
    };
  }

  private getDefaultPermissions(role: string): string[] {
    const permissions = {
      owner: ['*'], // All permissions
      admin: [
        'content.read', 'content.write', 'content.delete',
        'users.read', 'users.write', 'users.delete',
        'analytics.read', 'settings.read', 'settings.write',
      ],
      moderator: [
        'content.read', 'content.write',
        'users.read', 'users.moderate',
        'chat.moderate',
      ],
      user: [
        'content.read',
        'profile.read', 'profile.write',
      ],
    };

    return permissions[role] || permissions.user;
  }

  private async initializeTenantSchema(tenantId: string): Promise<void> {
    // Initialize tenant-specific database schema
    // This could involve creating tenant-specific tables or schemas
    this.logger.log(`Initializing schema for tenant ${tenantId}`);
  }

  private async setupTenantInfrastructure(tenant: TenantConfig): Promise<void> {
    // Setup tenant-specific infrastructure (CDN, storage, etc.)
    this.logger.log(`Setting up infrastructure for tenant ${tenant.id}`);
  }

  private async disableTenantServices(tenantId: string): Promise<void> {
    // Disable tenant services (streaming, API access, etc.)
    this.logger.log(`Disabling services for tenant ${tenantId}`);
  }

  private async backupTenantData(tenantId: string): Promise<void> {
    // Backup tenant data before deletion
    this.logger.log(`Backing up data for tenant ${tenantId}`);
  }

  private async deleteTenantInfrastructure(tenantId: string): Promise<void> {
    // Delete tenant infrastructure
    this.logger.log(`Deleting infrastructure for tenant ${tenantId}`);
  }

  private async getTenantUserCount(tenantId: string): Promise<number> {
    return this.prisma.tenantUser.count({
      where: { tenantId, isActive: true },
    });
  }

  private async getTenantContentCount(tenantId: string): Promise<number> {
    return this.prisma.content.count({
      where: { tenantId },
    });
  }

  private async getTenantStorageUsage(tenantId: string): Promise<number> {
    // Calculate storage usage in bytes
    return 0; // Placeholder
  }

  private async getTenantBandwidthUsage(tenantId: string): Promise<number> {
    // Calculate bandwidth usage in bytes for current month
    return 0; // Placeholder
  }

  private async getTenantConcurrentStreams(tenantId: string): Promise<number> {
    // Get current concurrent streams
    return 0; // Placeholder
  }

  private async getTenantLiveStreamCount(tenantId: string): Promise<number> {
    return this.prisma.liveStream.count({
      where: { tenantId, status: 'live' },
    });
  }

  private async getTenantApiUsage(tenantId: string): Promise<number> {
    // Get API usage for current period
    return 0; // Placeholder
  }

  private generateUsageWarnings(percentages: any): string[] {
    const warnings: string[] = [];

    Object.entries(percentages).forEach(([key, value]) => {
      if (typeof value === 'number') {
        if (value >= 90) {
          warnings.push(`${key} usage is at ${value.toFixed(1)}% of limit`);
        } else if (value >= 80) {
          warnings.push(`${key} usage is approaching limit (${value.toFixed(1)}%)`);
        }
      }
    });

    return warnings;
  }
}
