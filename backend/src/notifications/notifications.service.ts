import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

interface Notification {
  id: string;
  userId: string;
  type: 'stream_live' | 'new_follower' | 'donation' | 'gift' | 'comment' | 'like' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: NotificationChannel[];
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

interface NotificationChannel {
  type: 'push' | 'email' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sentAt?: Date;
  error?: string;
}

interface NotificationPreferences {
  userId: string;
  streamLive: NotificationSettings;
  newFollower: NotificationSettings;
  donations: NotificationSettings;
  comments: NotificationSettings;
  systemUpdates: NotificationSettings;
  promotions: NotificationSettings;
}

interface NotificationSettings {
  enabled: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  frequency?: 'instant' | 'hourly' | 'daily' | 'weekly';
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Listen to platform events and create notifications
    this.eventEmitter.on('stream.started', (data) => this.handleStreamStarted(data));
    this.eventEmitter.on('user.followed', (data) => this.handleNewFollower(data));
    this.eventEmitter.on('donation.completed', (data) => this.handleDonation(data));
    this.eventEmitter.on('gift.sent', (data) => this.handleGiftSent(data));
    this.eventEmitter.on('comment.added', (data) => this.handleCommentAdded(data));
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    options?: {
      data?: any;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      channels?: string[];
      scheduledAt?: Date;
      expiresAt?: Date;
    },
  ): Promise<Notification> {
    try {
      // Get user notification preferences
      const preferences = await this.getUserPreferences(userId);
      const typeSettings = this.getTypeSettings(preferences, type);

      if (!typeSettings.enabled) {
        this.logger.log(`Notification skipped - disabled for user ${userId}, type ${type}`);
        return null;
      }

      // Determine channels based on preferences and options
      const channels = this.determineChannels(typeSettings, options?.channels);

      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: type as any,
        title,
        message,
        data: options?.data,
        isRead: false,
        priority: options?.priority || 'medium',
        channels: channels.map(channel => ({
          type: channel as any,
          status: 'pending',
        })),
        scheduledAt: options?.scheduledAt,
        createdAt: new Date(),
        expiresAt: options?.expiresAt,
      };

      // Save to database
      await this.prisma.notification.create({
        data: notification,
      });

      // Send immediately if not scheduled
      if (!options?.scheduledAt || options.scheduledAt <= new Date()) {
        await this.sendNotification(notification);
      }

      this.logger.log(`Notification created: ${notification.id} for user ${userId}`);

      return notification;
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    try {
      // Get user's push tokens
      const pushTokens = await this.prisma.pushToken.findMany({
        where: { userId, isActive: true },
      });

      if (pushTokens.length === 0) {
        this.logger.log(`No push tokens found for user ${userId}`);
        return false;
      }

      // Send to each device
      const results = await Promise.allSettled(
        pushTokens.map(token => this.sendPushToDevice(token.token, payload))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      this.logger.log(`Push notification sent to ${successCount}/${pushTokens.length} devices for user ${userId}`);

      return successCount > 0;
    } catch (error) {
      this.logger.error('Error sending push notification:', error);
      return false;
    }
  }

  async sendEmailNotification(
    userId: string,
    subject: string,
    template: string,
    data: any,
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user?.email) {
        this.logger.log(`No email found for user ${userId}`);
        return false;
      }

      // Send email using your email service (SendGrid, AWS SES, etc.)
      const emailSent = await this.sendEmail({
        to: user.email,
        subject,
        template,
        data: {
          ...data,
          userName: user.name,
        },
      });

      this.logger.log(`Email notification sent to ${user.email}: ${emailSent}`);

      return emailSent;
    } catch (error) {
      this.logger.error('Error sending email notification:', error);
      return false;
    }
  }

  async getUserNotifications(
    userId: string,
    filters?: {
      type?: string;
      isRead?: boolean;
      priority?: string;
    },
    pagination?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    try {
      const { limit = 20, offset = 0 } = pagination || {};
      
      let whereClause: any = { userId };

      if (filters?.type) {
        whereClause.type = filters.type;
      }

      if (filters?.isRead !== undefined) {
        whereClause.isRead = filters.isRead;
      }

      if (filters?.priority) {
        whereClause.priority = filters.priority;
      }

      // Don't show expired notifications
      whereClause.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];

      const [notifications, total, unreadCount] = await Promise.all([
        this.prisma.notification.findMany({
          where: whereClause,
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' },
          ],
          skip: offset,
          take: limit,
        }),
        this.prisma.notification.count({ where: whereClause }),
        this.prisma.notification.count({
          where: {
            userId,
            isRead: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        }),
      ]);

      return {
        notifications: notifications as any,
        total,
        unreadCount,
      };
    } catch (error) {
      this.logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
        },
      });

      this.logger.log(`Notification marked as read: ${notificationId}`);
    } catch (error) {
      this.logger.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      this.logger.log(`All notifications marked as read for user ${userId}`);
    } catch (error) {
      this.logger.error('Error marking all notifications as read:', error);
    }
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    try {
      const updatedPreferences = await this.prisma.notificationPreferences.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...this.getDefaultPreferences(),
          ...preferences,
        },
      });

      this.logger.log(`Notification preferences updated for user ${userId}`);

      return updatedPreferences as any;
    } catch (error) {
      this.logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  async registerPushToken(
    userId: string,
    token: string,
    deviceInfo: {
      platform: 'ios' | 'android' | 'web';
      deviceId: string;
      userAgent?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.pushToken.upsert({
        where: {
          userId_deviceId: {
            userId,
            deviceId: deviceInfo.deviceId,
          },
        },
        update: {
          token,
          platform: deviceInfo.platform,
          userAgent: deviceInfo.userAgent,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          token,
          platform: deviceInfo.platform,
          deviceId: deviceInfo.deviceId,
          userAgent: deviceInfo.userAgent,
          isActive: true,
        },
      });

      this.logger.log(`Push token registered for user ${userId}, device ${deviceInfo.deviceId}`);
    } catch (error) {
      this.logger.error('Error registering push token:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      
      const scheduledNotifications = await this.prisma.notification.findMany({
        where: {
          scheduledAt: {
            lte: now,
          },
          sentAt: null,
        },
        take: 100, // Process in batches
      });

      for (const notification of scheduledNotifications) {
        await this.sendNotification(notification as any);
      }

      if (scheduledNotifications.length > 0) {
        this.logger.log(`Processed ${scheduledNotifications.length} scheduled notifications`);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled notifications:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const result = await this.prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired notifications`);
    } catch (error) {
      this.logger.error('Error cleaning up expired notifications:', error);
    }
  }

  // Event handlers
  private async handleStreamStarted(data: any): Promise<void> {
    try {
      // Notify all followers when a stream starts
      const followers = await this.prisma.follow.findMany({
        where: { followingId: data.streamerId },
        select: { followerId: true },
      });

      const streamer = await this.prisma.user.findUnique({
        where: { id: data.streamerId },
        select: { name: true },
      });

      for (const follower of followers) {
        await this.createNotification(
          follower.followerId,
          'stream_live',
          `${streamer?.name} is now live!`,
          `${streamer?.name} started streaming: ${data.title}`,
          {
            data: {
              streamId: data.id,
              streamerId: data.streamerId,
              streamerName: streamer?.name,
            },
            priority: 'high',
          },
        );
      }
    } catch (error) {
      this.logger.error('Error handling stream started event:', error);
    }
  }

  private async handleNewFollower(data: any): Promise<void> {
    try {
      const follower = await this.prisma.user.findUnique({
        where: { id: data.followerId },
        select: { name: true },
      });

      await this.createNotification(
        data.followingId,
        'new_follower',
        'New Follower!',
        `${follower?.name} started following you`,
        {
          data: {
            followerId: data.followerId,
            followerName: follower?.name,
          },
          priority: 'medium',
        },
      );
    } catch (error) {
      this.logger.error('Error handling new follower event:', error);
    }
  }

  private async handleDonation(data: any): Promise<void> {
    try {
      const donor = await this.prisma.user.findUnique({
        where: { id: data.donorId },
        select: { name: true },
      });

      await this.createNotification(
        data.streamerId,
        'donation',
        'New Donation!',
        `${donor?.name} donated $${data.amount}${data.message ? `: "${data.message}"` : ''}`,
        {
          data: {
            donorId: data.donorId,
            donorName: donor?.name,
            amount: data.amount,
            message: data.message,
          },
          priority: 'high',
        },
      );
    } catch (error) {
      this.logger.error('Error handling donation event:', error);
    }
  }

  private async handleGiftSent(data: any): Promise<void> {
    try {
      const sender = await this.prisma.user.findUnique({
        where: { id: data.senderId },
        select: { name: true },
      });

      await this.createNotification(
        data.receiverId,
        'gift',
        'New Gift!',
        `${sender?.name} sent you ${data.quantity}x ${data.giftName}`,
        {
          data: {
            senderId: data.senderId,
            senderName: sender?.name,
            giftName: data.giftName,
            quantity: data.quantity,
          },
          priority: 'medium',
        },
      );
    } catch (error) {
      this.logger.error('Error handling gift sent event:', error);
    }
  }

  private async handleCommentAdded(data: any): Promise<void> {
    try {
      // Notify content owner about new comments
      if (data.contentOwnerId && data.contentOwnerId !== data.commenterId) {
        const commenter = await this.prisma.user.findUnique({
          where: { id: data.commenterId },
          select: { name: true },
        });

        await this.createNotification(
          data.contentOwnerId,
          'comment',
          'New Comment',
          `${commenter?.name} commented on your content`,
          {
            data: {
              commenterId: data.commenterId,
              commenterName: commenter?.name,
              contentId: data.contentId,
              comment: data.comment,
            },
            priority: 'low',
          },
        );
      }
    } catch (error) {
      this.logger.error('Error handling comment added event:', error);
    }
  }

  // Helper methods
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      let preferences = await this.prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        preferences = await this.prisma.notificationPreferences.create({
          data: {
            userId,
            ...this.getDefaultPreferences(),
          },
        });
      }

      return preferences as any;
    } catch (error) {
      this.logger.error('Error getting user preferences:', error);
      return {
        userId,
        ...this.getDefaultPreferences(),
      };
    }
  }

  private getDefaultPreferences(): Omit<NotificationPreferences, 'userId'> {
    const defaultSettings: NotificationSettings = {
      enabled: true,
      push: true,
      email: true,
      sms: false,
      inApp: true,
      frequency: 'instant',
    };

    return {
      streamLive: defaultSettings,
      newFollower: defaultSettings,
      donations: defaultSettings,
      comments: { ...defaultSettings, frequency: 'hourly' },
      systemUpdates: defaultSettings,
      promotions: { ...defaultSettings, enabled: false },
    };
  }

  private getTypeSettings(preferences: NotificationPreferences, type: string): NotificationSettings {
    switch (type) {
      case 'stream_live': return preferences.streamLive;
      case 'new_follower': return preferences.newFollower;
      case 'donation': return preferences.donations;
      case 'gift': return preferences.donations;
      case 'comment': return preferences.comments;
      case 'like': return preferences.comments;
      case 'system': return preferences.systemUpdates;
      case 'promotion': return preferences.promotions;
      default: return preferences.systemUpdates;
    }
  }

  private determineChannels(settings: NotificationSettings, requestedChannels?: string[]): string[] {
    const channels: string[] = [];

    if (settings.inApp) channels.push('in_app');
    if (settings.push) channels.push('push');
    if (settings.email) channels.push('email');
    if (settings.sms) channels.push('sms');

    // Filter by requested channels if specified
    if (requestedChannels) {
      return channels.filter(channel => requestedChannels.includes(channel));
    }

    return channels;
  }

  private async sendNotification(notification: Notification): Promise<void> {
    try {
      const results: Array<{ channel: string; success: boolean; error?: string }> = [];

      for (const channel of notification.channels) {
        let success = false;
        let error: string | undefined;

        try {
          switch (channel.type) {
            case 'push':
              success = await this.sendPushNotification(notification.userId, {
                title: notification.title,
                body: notification.message,
                data: notification.data,
              });
              break;
            case 'email':
              success = await this.sendEmailNotification(
                notification.userId,
                notification.title,
                'notification',
                {
                  title: notification.title,
                  message: notification.message,
                  data: notification.data,
                },
              );
              break;
            case 'sms':
              success = await this.sendSMSNotification(
                notification.userId,
                notification.message,
              );
              break;
            case 'in_app':
              success = true; // In-app notifications are stored in database
              break;
          }
        } catch (channelError) {
          error = channelError.message;
        }

        results.push({ channel: channel.type, success, error });

        // Update channel status
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            channels: {
              updateMany: {
                where: { type: channel.type },
                data: {
                  status: success ? 'sent' : 'failed',
                  sentAt: success ? new Date() : undefined,
                  error,
                },
              },
            },
          },
        });
      }

      // Mark notification as sent
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });

      this.logger.log(`Notification sent: ${notification.id}, results: ${JSON.stringify(results)}`);
    } catch (error) {
      this.logger.error('Error sending notification:', error);
    }
  }

  private async sendPushToDevice(token: string, payload: PushNotificationPayload): Promise<boolean> {
    try {
      // Implement Firebase Cloud Messaging or similar
      // This is a placeholder implementation
      this.logger.log(`Sending push to device: ${token.substring(0, 10)}...`);
      return true;
    } catch (error) {
      this.logger.error('Error sending push to device:', error);
      return false;
    }
  }

  private async sendEmail(emailData: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<boolean> {
    try {
      // Implement SendGrid, AWS SES, or similar
      // This is a placeholder implementation
      this.logger.log(`Sending email to: ${emailData.to}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending email:', error);
      return false;
    }
  }

  private async sendSMSNotification(userId: string, message: string): Promise<boolean> {
    try {
      // Implement Twilio or similar SMS service
      // This is a placeholder implementation
      this.logger.log(`Sending SMS to user: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending SMS:', error);
      return false;
    }
  }
}
