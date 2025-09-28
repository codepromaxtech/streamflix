import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

interface AdminReport {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalStreamers: number;
    activeStreamers: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalContent: number;
    totalViews: number;
  };
  userMetrics: {
    newRegistrations: number;
    userGrowthRate: number;
    churnRate: number;
    averageSessionTime: number;
    topCountries: Array<{ country: string; users: number }>;
  };
  contentMetrics: {
    uploadsThisMonth: number;
    totalWatchTime: number;
    topCategories: Array<{ category: string; views: number }>;
    contentEngagement: number;
  };
  revenueMetrics: {
    subscriptionRevenue: number;
    donationRevenue: number;
    adRevenue: number;
    revenueByCountry: Array<{ country: string; revenue: number }>;
  };
  systemMetrics: {
    serverUptime: number;
    averageLoadTime: number;
    errorRate: number;
    bandwidthUsage: number;
  };
}

interface StreamerReport {
  earnings: {
    totalEarnings: number;
    monthlyEarnings: number;
    donationsReceived: number;
    giftsReceived: number;
    privateSessionEarnings: number;
    pendingPayouts: number;
  };
  audience: {
    totalFollowers: number;
    averageViewers: number;
    peakViewers: number;
    viewerGrowth: number;
    topCountries: Array<{ country: string; viewers: number }>;
  };
  content: {
    totalStreams: number;
    totalStreamTime: number;
    averageStreamDuration: number;
    mostPopularContent: Array<{ title: string; views: number }>;
  };
  engagement: {
    chatMessages: number;
    likes: number;
    shares: number;
    averageEngagement: number;
  };
}

interface UserReport {
  activity: {
    totalWatchTime: number;
    sessionsCount: number;
    averageSessionTime: number;
    favoriteGenres: Array<{ genre: string; watchTime: number }>;
  };
  spending: {
    totalSpent: number;
    donationsGiven: number;
    giftsGiven: number;
    subscriptionCost: number;
    privateSessionsCost: number;
  };
  achievements: {
    level: number;
    totalXP: number;
    unlockedAvatars: number;
    completedAchievements: number;
  };
  social: {
    followingCount: number;
    followersCount: number;
    commentsPosted: number;
    likesGiven: number;
  };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async generateAdminReport(
    tenantId?: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<AdminReport> {
    const whereClause = {
      ...(tenantId && { tenantId }),
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    // Overview metrics
    const totalUsers = await this.prisma.user.count({
      where: tenantId ? { tenantId } : {},
    });

    const activeUsers = await this.prisma.user.count({
      where: {
        ...(tenantId && { tenantId }),
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const totalStreamers = await this.prisma.user.count({
      where: {
        ...(tenantId && { tenantId }),
        isStreamer: true,
      },
    });

    const activeStreamers = await this.prisma.user.count({
      where: {
        ...(tenantId && { tenantId }),
        isStreamer: true,
        lastLoginAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Revenue metrics
    const revenueData = await this.prisma.payment.aggregate({
      where: {
        ...whereClause,
        status: 'completed',
      },
      _sum: { amount: true },
    });

    const monthlyRevenueData = await this.prisma.payment.aggregate({
      where: {
        ...(tenantId && { tenantId }),
        status: 'completed',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
    });

    // Content metrics
    const totalContent = await this.prisma.content.count({
      where: tenantId ? { tenantId } : {},
    });

    const totalViews = await this.prisma.watchHistory.count({
      where: whereClause,
    });

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalStreamers,
        activeStreamers,
        totalRevenue: revenueData._sum.amount || 0,
        monthlyRevenue: monthlyRevenueData._sum.amount || 0,
        totalContent,
        totalViews,
      },
      userMetrics: await this.getUserMetrics(tenantId, dateRange),
      contentMetrics: await this.getContentMetrics(tenantId, dateRange),
      revenueMetrics: await this.getRevenueMetrics(tenantId, dateRange),
      systemMetrics: await this.getSystemMetrics(tenantId, dateRange),
    };
  }

  async generateStreamerReport(
    streamerId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<StreamerReport> {
    const whereClause = {
      streamerId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    // Earnings
    const donations = await this.prisma.donation.aggregate({
      where: { ...whereClause, status: 'completed' },
      _sum: { amount: true },
    });

    const gifts = await this.prisma.giftTransaction.aggregate({
      where: { receiverId: streamerId, status: 'sent' },
      _sum: { totalAmount: true },
    });

    const privateSessions = await this.prisma.privateSession.aggregate({
      where: { ...whereClause, status: 'completed' },
      _sum: { totalCost: true },
    });

    // Audience metrics
    const followers = await this.prisma.follow.count({
      where: { followingId: streamerId },
    });

    const streams = await this.prisma.liveStream.findMany({
      where: whereClause,
      include: { _count: { select: { viewers: true } } },
    });

    return {
      earnings: {
        totalEarnings: (donations._sum.amount || 0) + 
                      ((gifts._sum.totalAmount || 0) * 0.7) + 
                      ((privateSessions._sum.totalCost || 0) * 0.7),
        monthlyEarnings: 0, // Calculate monthly
        donationsReceived: donations._sum.amount || 0,
        giftsReceived: (gifts._sum.totalAmount || 0) * 0.7,
        privateSessionEarnings: (privateSessions._sum.totalCost || 0) * 0.7,
        pendingPayouts: 0,
      },
      audience: {
        totalFollowers: followers,
        averageViewers: streams.length > 0 
          ? streams.reduce((sum, s) => sum + s._count.viewers, 0) / streams.length 
          : 0,
        peakViewers: Math.max(...streams.map(s => s.peakViewerCount || 0), 0),
        viewerGrowth: 0,
        topCountries: [],
      },
      content: {
        totalStreams: streams.length,
        totalStreamTime: 0,
        averageStreamDuration: 0,
        mostPopularContent: [],
      },
      engagement: {
        chatMessages: 0,
        likes: 0,
        shares: 0,
        averageEngagement: 0,
      },
    };
  }

  async generateUserReport(
    userId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<UserReport> {
    const whereClause = {
      userId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    // Watch history
    const watchHistory = await this.prisma.watchHistory.findMany({
      where: whereClause,
      include: { content: true },
    });

    const totalWatchTime = watchHistory.reduce(
      (sum, watch) => sum + (watch.watchDuration || 0), 
      0
    );

    // Spending
    const donations = await this.prisma.donation.aggregate({
      where: { donorId: userId, status: 'completed' },
      _sum: { amount: true },
    });

    const gifts = await this.prisma.giftTransaction.aggregate({
      where: { senderId: userId, status: 'sent' },
      _sum: { totalAmount: true },
    });

    // User stats
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    const achievements = await this.prisma.userAchievement.count({
      where: { userId },
    });

    const avatars = await this.prisma.userReward.count({
      where: { userId, rewardType: 'avatar' },
    });

    return {
      activity: {
        totalWatchTime: Math.floor(totalWatchTime / 3600), // Convert to hours
        sessionsCount: watchHistory.length,
        averageSessionTime: watchHistory.length > 0 
          ? totalWatchTime / watchHistory.length / 60 // Convert to minutes
          : 0,
        favoriteGenres: [],
      },
      spending: {
        totalSpent: (donations._sum.amount || 0) + (gifts._sum.totalAmount || 0),
        donationsGiven: donations._sum.amount || 0,
        giftsGiven: gifts._sum.totalAmount || 0,
        subscriptionCost: 0,
        privateSessionsCost: 0,
      },
      achievements: {
        level: userStats?.currentLevel || 1,
        totalXP: userStats?.totalXP || 0,
        unlockedAvatars: avatars,
        completedAchievements: achievements,
      },
      social: {
        followingCount: 0,
        followersCount: 0,
        commentsPosted: 0,
        likesGiven: 0,
      },
    };
  }

  private async getUserMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }) {
    // Implementation for user metrics
    return {
      newRegistrations: 0,
      userGrowthRate: 0,
      churnRate: 0,
      averageSessionTime: 0,
      topCountries: [],
    };
  }

  private async getContentMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }) {
    // Implementation for content metrics
    return {
      uploadsThisMonth: 0,
      totalWatchTime: 0,
      topCategories: [],
      contentEngagement: 0,
    };
  }

  private async getRevenueMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }) {
    // Implementation for revenue metrics
    return {
      subscriptionRevenue: 0,
      donationRevenue: 0,
      adRevenue: 0,
      revenueByCountry: [],
    };
  }

  private async getSystemMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }) {
    // Implementation for system metrics
    return {
      serverUptime: 99.9,
      averageLoadTime: 1.2,
      errorRate: 0.01,
      bandwidthUsage: 1024 * 1024 * 1024,
    };
  }
}
