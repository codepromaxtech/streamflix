import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

interface ScheduledStream {
  id: string;
  streamerId: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  scheduledAt: Date;
  estimatedDuration: number; // in minutes
  thumbnailUrl?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  notificationSent: boolean;
  remindersSent: number;
  actualStartTime?: Date;
  actualEndTime?: Date;
  viewerCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number; // every X days/weeks/months
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  endDate?: Date;
  maxOccurrences?: number;
}

interface StreamReminder {
  id: string;
  userId: string;
  scheduledStreamId: string;
  reminderTime: Date;
  type: 'email' | 'push' | 'sms';
  sent: boolean;
  createdAt: Date;
}

interface ComingSoonStream {
  id: string;
  streamerId: string;
  title: string;
  description?: string;
  category: string;
  estimatedDate?: Date;
  isAnnounced: boolean;
  followerNotified: boolean;
  teaserUrl?: string;
  createdAt: Date;
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async scheduleStream(
    streamerId: string,
    streamData: {
      title: string;
      description?: string;
      category: string;
      tags?: string[];
      scheduledAt: Date;
      estimatedDuration: number;
      thumbnailUrl?: string;
      isRecurring?: boolean;
      recurringPattern?: RecurringPattern;
    },
  ): Promise<ScheduledStream> {
    try {
      // Validate scheduled time is in the future
      if (streamData.scheduledAt <= new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }

      // Check for conflicting streams
      const conflictingStream = await this.checkForConflicts(
        streamerId,
        streamData.scheduledAt,
        streamData.estimatedDuration,
      );

      if (conflictingStream) {
        throw new BadRequestException('You have another stream scheduled at this time');
      }

      const scheduledStream: ScheduledStream = {
        id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamerId,
        title: streamData.title,
        description: streamData.description,
        category: streamData.category,
        tags: streamData.tags || [],
        scheduledAt: streamData.scheduledAt,
        estimatedDuration: streamData.estimatedDuration,
        thumbnailUrl: streamData.thumbnailUrl,
        status: 'scheduled',
        isRecurring: streamData.isRecurring || false,
        recurringPattern: streamData.recurringPattern,
        notificationSent: false,
        remindersSent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await this.prisma.scheduledStream.create({
        data: scheduledStream,
      });

      // Create recurring instances if applicable
      if (scheduledStream.isRecurring && scheduledStream.recurringPattern) {
        await this.createRecurringInstances(scheduledStream);
      }

      // Schedule notifications
      await this.scheduleNotifications(scheduledStream);

      this.logger.log(`Stream scheduled: ${scheduledStream.id} by streamer ${streamerId}`);

      // Emit event
      this.eventEmitter.emit('stream.scheduled', scheduledStream);

      return scheduledStream;
    } catch (error) {
      this.logger.error('Error scheduling stream:', error);
      throw error;
    }
  }

  async getScheduledStreams(
    streamerId?: string,
    status?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ScheduledStream[]> {
    try {
      const streams = await this.prisma.scheduledStream.findMany({
        where: {
          ...(streamerId && { streamerId }),
          ...(status && { status }),
          scheduledAt: {
            gte: new Date(), // Only future streams
          },
        },
        include: {
          streamer: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              reminders: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: offset,
        take: limit,
      });

      return streams as any;
    } catch (error) {
      this.logger.error('Error fetching scheduled streams:', error);
      throw error;
    }
  }

  async getUpcomingStreams(
    userId?: string,
    followingOnly: boolean = false,
    limit: number = 20,
  ): Promise<ScheduledStream[]> {
    try {
      let whereClause: any = {
        status: 'scheduled',
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      };

      if (followingOnly && userId) {
        const following = await this.prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        });

        whereClause.streamerId = {
          in: following.map(f => f.followingId),
        };
      }

      const streams = await this.prisma.scheduledStream.findMany({
        where: whereClause,
        include: {
          streamer: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true,
              followersCount: true,
            },
          },
          _count: {
            select: {
              reminders: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: limit,
      });

      return streams as any;
    } catch (error) {
      this.logger.error('Error fetching upcoming streams:', error);
      throw error;
    }
  }

  async setReminder(
    userId: string,
    scheduledStreamId: string,
    reminderMinutes: number = 30,
    type: 'email' | 'push' | 'sms' = 'push',
  ): Promise<StreamReminder> {
    try {
      const scheduledStream = await this.prisma.scheduledStream.findUnique({
        where: { id: scheduledStreamId },
      });

      if (!scheduledStream) {
        throw new BadRequestException('Scheduled stream not found');
      }

      // Check if user already has a reminder for this stream
      const existingReminder = await this.prisma.streamReminder.findFirst({
        where: {
          userId,
          scheduledStreamId,
        },
      });

      if (existingReminder) {
        throw new BadRequestException('Reminder already set for this stream');
      }

      const reminderTime = new Date(
        scheduledStream.scheduledAt.getTime() - reminderMinutes * 60 * 1000,
      );

      const reminder: StreamReminder = {
        id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        scheduledStreamId,
        reminderTime,
        type,
        sent: false,
        createdAt: new Date(),
      };

      await this.prisma.streamReminder.create({
        data: reminder,
      });

      this.logger.log(`Reminder set: ${reminder.id} for stream ${scheduledStreamId}`);

      return reminder;
    } catch (error) {
      this.logger.error('Error setting reminder:', error);
      throw error;
    }
  }

  async startScheduledStream(
    scheduledStreamId: string,
    streamerId: string,
  ): Promise<{ streamUrl: string; streamKey: string }> {
    try {
      const scheduledStream = await this.prisma.scheduledStream.findUnique({
        where: { id: scheduledStreamId },
      });

      if (!scheduledStream || scheduledStream.streamerId !== streamerId) {
        throw new BadRequestException('Scheduled stream not found or unauthorized');
      }

      if (scheduledStream.status !== 'scheduled') {
        throw new BadRequestException('Stream is not in scheduled status');
      }

      // Update status to live
      await this.prisma.scheduledStream.update({
        where: { id: scheduledStreamId },
        data: {
          status: 'live',
          actualStartTime: new Date(),
        },
      });

      // Generate stream URL and key
      const streamUrl = `${this.configService.get('RTMP_SERVER_URL')}/live`;
      const streamKey = `${scheduledStreamId}_${Date.now()}`;

      // Notify followers
      await this.notifyFollowersStreamStarted(scheduledStream);

      this.logger.log(`Scheduled stream started: ${scheduledStreamId}`);

      // Emit event
      this.eventEmitter.emit('scheduled_stream.started', scheduledStream);

      return { streamUrl, streamKey };
    } catch (error) {
      this.logger.error('Error starting scheduled stream:', error);
      throw error;
    }
  }

  async createComingSoonAnnouncement(
    streamerId: string,
    announcementData: {
      title: string;
      description?: string;
      category: string;
      estimatedDate?: Date;
      teaserUrl?: string;
    },
  ): Promise<ComingSoonStream> {
    try {
      const comingSoon: ComingSoonStream = {
        id: `coming_soon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamerId,
        title: announcementData.title,
        description: announcementData.description,
        category: announcementData.category,
        estimatedDate: announcementData.estimatedDate,
        isAnnounced: true,
        followerNotified: false,
        teaserUrl: announcementData.teaserUrl,
        createdAt: new Date(),
      };

      await this.prisma.comingSoonStream.create({
        data: comingSoon,
      });

      // Notify followers about the announcement
      await this.notifyFollowersComingSoon(comingSoon);

      this.logger.log(`Coming soon announcement created: ${comingSoon.id}`);

      // Emit event
      this.eventEmitter.emit('coming_soon.announced', comingSoon);

      return comingSoon;
    } catch (error) {
      this.logger.error('Error creating coming soon announcement:', error);
      throw error;
    }
  }

  async getComingSoonStreams(
    userId?: string,
    followingOnly: boolean = false,
    limit: number = 20,
  ): Promise<ComingSoonStream[]> {
    try {
      let whereClause: any = {
        isAnnounced: true,
      };

      if (followingOnly && userId) {
        const following = await this.prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        });

        whereClause.streamerId = {
          in: following.map(f => f.followingId),
        };
      }

      const comingSoonStreams = await this.prisma.comingSoonStream.findMany({
        where: whereClause,
        include: {
          streamer: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true,
              followersCount: true,
            },
          },
        },
        orderBy: [
          { estimatedDate: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      return comingSoonStreams as any;
    } catch (error) {
      this.logger.error('Error fetching coming soon streams:', error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processReminders(): Promise<void> {
    try {
      const now = new Date();
      
      // Get due reminders
      const dueReminders = await this.prisma.streamReminder.findMany({
        where: {
          sent: false,
          reminderTime: {
            lte: now,
          },
        },
        include: {
          scheduledStream: {
            include: {
              streamer: {
                select: {
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      for (const reminder of dueReminders) {
        await this.sendReminder(reminder);
        
        // Mark as sent
        await this.prisma.streamReminder.update({
          where: { id: reminder.id },
          data: { sent: true },
        });
      }

      if (dueReminders.length > 0) {
        this.logger.log(`Processed ${dueReminders.length} stream reminders`);
      }
    } catch (error) {
      this.logger.error('Error processing reminders:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledStreams(): Promise<void> {
    try {
      const now = new Date();
      
      // Find streams that should have started but haven't
      const overdueStreams = await this.prisma.scheduledStream.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            lt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          },
        },
      });

      for (const stream of overdueStreams) {
        // Mark as missed/cancelled
        await this.prisma.scheduledStream.update({
          where: { id: stream.id },
          data: { status: 'cancelled' },
        });

        this.logger.log(`Marked overdue stream as cancelled: ${stream.id}`);
      }

      // Create next instances for recurring streams
      await this.createNextRecurringInstances();
    } catch (error) {
      this.logger.error('Error processing scheduled streams:', error);
    }
  }

  private async checkForConflicts(
    streamerId: string,
    scheduledAt: Date,
    duration: number,
  ): Promise<boolean> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    
    const conflictingStream = await this.prisma.scheduledStream.findFirst({
      where: {
        streamerId,
        status: 'scheduled',
        OR: [
          {
            scheduledAt: {
              gte: scheduledAt,
              lt: endTime,
            },
          },
          {
            AND: [
              { scheduledAt: { lte: scheduledAt } },
              {
                scheduledAt: {
                  gte: new Date(scheduledAt.getTime() - 180 * 60 * 1000), // 3 hours buffer
                },
              },
            ],
          },
        ],
      },
    });

    return !!conflictingStream;
  }

  private async createRecurringInstances(scheduledStream: ScheduledStream): Promise<void> {
    if (!scheduledStream.recurringPattern) return;

    const pattern = scheduledStream.recurringPattern;
    const instances: Date[] = [];
    let currentDate = new Date(scheduledStream.scheduledAt);
    const maxInstances = pattern.maxOccurrences || 52; // Default to 1 year worth

    for (let i = 0; i < maxInstances; i++) {
      switch (pattern.type) {
        case 'daily':
          currentDate = new Date(currentDate.getTime() + pattern.interval * 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          currentDate = new Date(currentDate.getTime() + pattern.interval * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          currentDate = new Date(currentDate);
          currentDate.setMonth(currentDate.getMonth() + pattern.interval);
          break;
      }

      if (pattern.endDate && currentDate > pattern.endDate) {
        break;
      }

      instances.push(new Date(currentDate));
    }

    // Create database records for future instances
    for (const instanceDate of instances) {
      await this.prisma.scheduledStream.create({
        data: {
          ...scheduledStream,
          id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          scheduledAt: instanceDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }

  private async scheduleNotifications(scheduledStream: ScheduledStream): Promise<void> {
    // Schedule notifications at different intervals
    const notificationTimes = [
      24 * 60, // 24 hours before
      60,      // 1 hour before
      15,      // 15 minutes before
    ];

    for (const minutes of notificationTimes) {
      const notificationTime = new Date(
        scheduledStream.scheduledAt.getTime() - minutes * 60 * 1000,
      );

      if (notificationTime > new Date()) {
        // Schedule notification (this would integrate with your notification system)
        this.logger.log(`Scheduled notification for stream ${scheduledStream.id} at ${notificationTime}`);
      }
    }
  }

  private async sendReminder(reminder: any): Promise<void> {
    try {
      const { scheduledStream, user } = reminder;
      
      switch (reminder.type) {
        case 'email':
          // Send email reminder
          break;
        case 'push':
          // Send push notification
          break;
        case 'sms':
          // Send SMS reminder
          break;
      }

      this.logger.log(`Sent ${reminder.type} reminder to user ${reminder.userId}`);
    } catch (error) {
      this.logger.error('Error sending reminder:', error);
    }
  }

  private async notifyFollowersStreamStarted(scheduledStream: ScheduledStream): Promise<void> {
    // Notify all followers that the stream has started
    this.logger.log(`Notifying followers about stream start: ${scheduledStream.id}`);
  }

  private async notifyFollowersComingSoon(comingSoon: ComingSoonStream): Promise<void> {
    // Notify followers about coming soon announcement
    this.logger.log(`Notifying followers about coming soon: ${comingSoon.id}`);
  }

  private async createNextRecurringInstances(): Promise<void> {
    // Create next instances for recurring streams that are running low
    this.logger.log('Creating next recurring stream instances');
  }
}
