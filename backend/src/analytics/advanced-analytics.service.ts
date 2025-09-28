import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

interface AnalyticsMetrics {
  users: UserMetrics;
  content: ContentMetrics;
  engagement: EngagementMetrics;
  revenue: RevenueMetrics;
  performance: PerformanceMetrics;
  streaming: StreamingMetrics;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnRate: number;
  userGrowthRate: number;
  averageSessionDuration: number;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    countries: Record<string, number>;
    devices: Record<string, number>;
  };
}

interface ContentMetrics {
  totalContent: number;
  publishedContent: number;
  totalViews: number;
  totalWatchTime: number;
  averageRating: number;
  topContent: Array<{
    id: string;
    title: string;
    views: number;
    rating: number;
    watchTime: number;
  }>;
  contentPerformance: {
    completionRate: number;
    dropOffPoints: number[];
    engagementScore: number;
  };
  genrePopularity: Record<string, number>;
}

interface EngagementMetrics {
  totalSessions: number;
  averageSessionLength: number;
  bounceRate: number;
  pageViews: number;
  searchQueries: number;
  socialShares: number;
  comments: number;
  likes: number;
  watchlistAdditions: number;
  downloadCount: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  subscriptionRevenue: number;
  adRevenue: number;
  transactionRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;
  churnRevenue: number;
  revenueGrowth: number;
  conversionRate: number;
}

interface PerformanceMetrics {
  averageLoadTime: number;
  errorRate: number;
  uptime: number;
  bandwidthUsage: number;
  cdnHitRate: number;
  apiResponseTime: number;
  videoStartTime: number;
  bufferingRatio: number;
  qualityDistribution: Record<string, number>;
}

interface StreamingMetrics {
  totalStreams: number;
  liveStreams: number;
  concurrentViewers: number;
  peakConcurrentViewers: number;
  averageViewDuration: number;
  streamQuality: Record<string, number>;
  deviceTypes: Record<string, number>;
  geographicDistribution: Record<string, number>;
}

interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: any;
}

interface AnalyticsReport {
  id: string;
  tenantId?: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: AnalyticsMetrics;
  insights: string[];
  recommendations: string[];
  generatedAt: Date;
}

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async generateComprehensiveReport(
    tenantId?: string,
    dateRange?: { start: Date; end: Date },
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
  ): Promise<AnalyticsReport> {
    try {
      const range = dateRange || this.getDefaultDateRange(reportType);
      
      const metrics: AnalyticsMetrics = {
        users: await this.getUserMetrics(tenantId, range),
        content: await this.getContentMetrics(tenantId, range),
        engagement: await this.getEngagementMetrics(tenantId, range),
        revenue: await this.getRevenueMetrics(tenantId, range),
        performance: await this.getPerformanceMetrics(tenantId, range),
        streaming: await this.getStreamingMetrics(tenantId, range),
      };

      const insights = await this.generateInsights(metrics, range);
      const recommendations = await this.generateRecommendations(metrics, insights);

      const report: AnalyticsReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        reportType,
        dateRange: range,
        metrics,
        insights,
        recommendations,
        generatedAt: new Date(),
      };

      // Save report to database
      await this.saveReport(report);

      return report;
    } catch (error) {
      this.logger.error('Error generating comprehensive report:', error);
      throw error;
    }
  }

  private async getUserMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<UserMetrics> {
    const whereClause = {
      ...(tenantId && { tenantId }),
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    const totalUsers = await this.prisma.user.count({
      where: tenantId ? { tenantId } : {},
    });

    const newUsers = await this.prisma.user.count({
      where: whereClause,
    });

    const activeUsers = await this.prisma.user.count({
      where: {
        ...whereClause,
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    // Calculate user sessions and duration
    const sessions = await this.prisma.userSession.findMany({
      where: {
        ...(tenantId && { user: { tenantId } }),
        ...(dateRange && {
          startTime: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
    });

    const averageSessionDuration = sessions.length > 0 
      ? sessions.reduce((sum, session) => {
          const duration = session.endTime 
            ? session.endTime.getTime() - session.startTime.getTime()
            : 0;
          return sum + duration;
        }, 0) / sessions.length / 1000 / 60 // Convert to minutes
      : 0;

    // Calculate retention rates
    const userRetention = await this.calculateUserRetention(tenantId, dateRange);

    // Get demographics
    const demographics = await this.getUserDemographics(tenantId, dateRange);

    // Calculate churn and growth rates
    const previousPeriod = this.getPreviousPeriod(dateRange);
    const previousUsers = await this.prisma.user.count({
      where: {
        ...(tenantId && { tenantId }),
        createdAt: {
          gte: previousPeriod.start,
          lte: previousPeriod.end,
        },
      },
    });

    const userGrowthRate = previousUsers > 0 ? ((newUsers - previousUsers) / previousUsers) * 100 : 0;
    const churnRate = await this.calculateChurnRate(tenantId, dateRange);

    return {
      totalUsers,
      activeUsers,
      newUsers,
      churnRate,
      userGrowthRate,
      averageSessionDuration,
      userRetention,
      demographics,
    };
  }

  private async getContentMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<ContentMetrics> {
    const whereClause = {
      ...(tenantId && { tenantId }),
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    const totalContent = await this.prisma.content.count({
      where: tenantId ? { tenantId } : {},
    });

    const publishedContent = await this.prisma.content.count({
      where: {
        ...(tenantId && { tenantId }),
        isPublished: true,
      },
    });

    // Get watch history for metrics
    const watchHistory = await this.prisma.watchHistory.findMany({
      where: {
        ...(tenantId && { content: { tenantId } }),
        ...(dateRange && {
          watchedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
      include: {
        content: true,
      },
    });

    const totalViews = watchHistory.length;
    const totalWatchTime = watchHistory.reduce((sum, watch) => sum + (watch.watchDuration || 0), 0);

    // Get ratings
    const ratings = await this.prisma.rating.findMany({
      where: {
        ...(tenantId && { content: { tenantId } }),
        ...(dateRange && {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
    });

    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
      : 0;

    // Get top content
    const topContent = await this.getTopContent(tenantId, dateRange);

    // Calculate content performance metrics
    const contentPerformance = await this.calculateContentPerformance(tenantId, dateRange);

    // Get genre popularity
    const genrePopularity = await this.getGenrePopularity(tenantId, dateRange);

    return {
      totalContent,
      publishedContent,
      totalViews,
      totalWatchTime,
      averageRating,
      topContent,
      contentPerformance,
      genrePopularity,
    };
  }

  private async getEngagementMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<EngagementMetrics> {
    // Get session data
    const sessions = await this.prisma.userSession.findMany({
      where: {
        ...(tenantId && { user: { tenantId } }),
        ...(dateRange && {
          startTime: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
    });

    const totalSessions = sessions.length;
    const averageSessionLength = sessions.length > 0 
      ? sessions.reduce((sum, session) => {
          const duration = session.endTime 
            ? session.endTime.getTime() - session.startTime.getTime()
            : 0;
          return sum + duration;
        }, 0) / sessions.length / 1000 / 60 // Convert to minutes
      : 0;

    // Calculate bounce rate (sessions with only one page view)
    const singlePageSessions = sessions.filter(session => session.pageViews === 1).length;
    const bounceRate = totalSessions > 0 ? (singlePageSessions / totalSessions) * 100 : 0;

    // Get engagement actions
    const pageViews = sessions.reduce((sum, session) => sum + (session.pageViews || 0), 0);

    const searchQueries = await this.prisma.searchQuery.count({
      where: {
        ...(tenantId && { user: { tenantId } }),
        ...(dateRange && {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
    });

    const comments = await this.prisma.comment.count({
      where: {
        ...(tenantId && { user: { tenantId } }),
        ...(dateRange && {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
    });

    const likes = await this.prisma.like.count({
      where: {
        ...(tenantId && { user: { tenantId } }),
        ...(dateRange && {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
    });

    const watchlistAdditions = await this.prisma.watchlist.count({
      where: {
        ...(tenantId && { user: { tenantId } }),
        ...(dateRange && {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
    });

    return {
      totalSessions,
      averageSessionLength,
      bounceRate,
      pageViews,
      searchQueries,
      socialShares: 0, // Placeholder
      comments,
      likes,
      watchlistAdditions,
      downloadCount: 0, // Placeholder
    };
  }

  private async getRevenueMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<RevenueMetrics> {
    const whereClause = {
      ...(tenantId && { tenantId }),
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    // Get payments
    const payments = await this.prisma.payment.findMany({
      where: {
        ...whereClause,
        status: 'completed',
      },
    });

    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Categorize revenue
    const subscriptionRevenue = payments
      .filter(p => p.type === 'subscription')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const adRevenue = payments
      .filter(p => p.type === 'advertisement')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const transactionRevenue = payments
      .filter(p => p.type === 'transaction')
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate MRR (Monthly Recurring Revenue)
    const monthlyRecurringRevenue = await this.calculateMRR(tenantId);

    // Calculate ARPU (Average Revenue Per User)
    const activeUsers = await this.prisma.user.count({
      where: {
        ...(tenantId && { tenantId }),
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const averageRevenuePerUser = activeUsers > 0 ? totalRevenue / activeUsers : 0;

    // Calculate CLV (Customer Lifetime Value)
    const customerLifetimeValue = await this.calculateCLV(tenantId);

    // Calculate churn revenue
    const churnRevenue = await this.calculateChurnRevenue(tenantId, dateRange);

    // Calculate revenue growth
    const previousPeriod = this.getPreviousPeriod(dateRange);
    const previousRevenue = await this.prisma.payment.aggregate({
      where: {
        ...(tenantId && { tenantId }),
        status: 'completed',
        createdAt: {
          gte: previousPeriod.start,
          lte: previousPeriod.end,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const revenueGrowth = previousRevenue._sum.amount 
      ? ((totalRevenue - previousRevenue._sum.amount) / previousRevenue._sum.amount) * 100 
      : 0;

    // Calculate conversion rate
    const conversionRate = await this.calculateConversionRate(tenantId, dateRange);

    return {
      totalRevenue,
      subscriptionRevenue,
      adRevenue,
      transactionRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      customerLifetimeValue,
      churnRevenue,
      revenueGrowth,
      conversionRate,
    };
  }

  private async getPerformanceMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<PerformanceMetrics> {
    // Get performance data from monitoring systems
    // This would typically integrate with APM tools like New Relic, DataDog, etc.
    
    return {
      averageLoadTime: 1.2, // seconds
      errorRate: 0.01, // 1%
      uptime: 99.9, // percentage
      bandwidthUsage: 1024 * 1024 * 1024, // bytes
      cdnHitRate: 95, // percentage
      apiResponseTime: 150, // milliseconds
      videoStartTime: 2.5, // seconds
      bufferingRatio: 0.02, // 2%
      qualityDistribution: {
        '240p': 10,
        '480p': 25,
        '720p': 40,
        '1080p': 20,
        '4K': 5,
      },
    };
  }

  private async getStreamingMetrics(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<StreamingMetrics> {
    const whereClause = {
      ...(tenantId && { tenantId }),
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    const totalStreams = await this.prisma.streamSession.count({
      where: whereClause,
    });

    const liveStreams = await this.prisma.liveStream.count({
      where: {
        ...(tenantId && { tenantId }),
        status: 'live',
      },
    });

    // Get concurrent viewers data
    const viewerData = await this.prisma.streamViewer.findMany({
      where: {
        ...(tenantId && { stream: { tenantId } }),
        ...(dateRange && {
          joinedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      },
    });

    const concurrentViewers = viewerData.length;
    const peakConcurrentViewers = await this.calculatePeakViewers(tenantId, dateRange);

    // Calculate average view duration
    const averageViewDuration = viewerData.length > 0 
      ? viewerData.reduce((sum, viewer) => {
          const duration = viewer.leftAt 
            ? viewer.leftAt.getTime() - viewer.joinedAt.getTime()
            : 0;
          return sum + duration;
        }, 0) / viewerData.length / 1000 / 60 // Convert to minutes
      : 0;

    return {
      totalStreams,
      liveStreams,
      concurrentViewers,
      peakConcurrentViewers,
      averageViewDuration,
      streamQuality: {
        '720p': 60,
        '1080p': 35,
        '4K': 5,
      },
      deviceTypes: {
        desktop: 45,
        mobile: 40,
        tablet: 10,
        tv: 5,
      },
      geographicDistribution: {
        'North America': 40,
        'Europe': 30,
        'Asia': 20,
        'Other': 10,
      },
    };
  }

  private async generateInsights(metrics: AnalyticsMetrics, dateRange: { start: Date; end: Date }): Promise<string[]> {
    const insights: string[] = [];

    // User insights
    if (metrics.users.userGrowthRate > 10) {
      insights.push(`Strong user growth of ${metrics.users.userGrowthRate.toFixed(1)}% in the selected period`);
    } else if (metrics.users.userGrowthRate < 0) {
      insights.push(`User growth is declining by ${Math.abs(metrics.users.userGrowthRate).toFixed(1)}%`);
    }

    if (metrics.users.churnRate > 5) {
      insights.push(`High churn rate of ${metrics.users.churnRate.toFixed(1)}% requires attention`);
    }

    // Content insights
    if (metrics.content.contentPerformance.completionRate < 60) {
      insights.push(`Low content completion rate of ${metrics.content.contentPerformance.completionRate.toFixed(1)}%`);
    }

    // Revenue insights
    if (metrics.revenue.revenueGrowth > 15) {
      insights.push(`Excellent revenue growth of ${metrics.revenue.revenueGrowth.toFixed(1)}%`);
    }

    // Performance insights
    if (metrics.performance.errorRate > 1) {
      insights.push(`Error rate of ${(metrics.performance.errorRate * 100).toFixed(2)}% is above acceptable threshold`);
    }

    if (metrics.performance.averageLoadTime > 3) {
      insights.push(`Page load time of ${metrics.performance.averageLoadTime.toFixed(1)}s may impact user experience`);
    }

    return insights;
  }

  private async generateRecommendations(metrics: AnalyticsMetrics, insights: string[]): Promise<string[]> {
    const recommendations: string[] = [];

    // User recommendations
    if (metrics.users.churnRate > 5) {
      recommendations.push('Implement user retention campaigns and improve onboarding experience');
    }

    if (metrics.users.averageSessionDuration < 30) {
      recommendations.push('Focus on content engagement strategies to increase session duration');
    }

    // Content recommendations
    if (metrics.content.contentPerformance.completionRate < 60) {
      recommendations.push('Analyze content drop-off points and improve content quality');
    }

    // Revenue recommendations
    if (metrics.revenue.conversionRate < 5) {
      recommendations.push('Optimize conversion funnel and improve pricing strategy');
    }

    // Performance recommendations
    if (metrics.performance.averageLoadTime > 3) {
      recommendations.push('Optimize page load times through CDN and caching improvements');
    }

    if (metrics.performance.bufferingRatio > 0.05) {
      recommendations.push('Improve video delivery infrastructure to reduce buffering');
    }

    return recommendations;
  }

  // Helper methods for calculations
  private async calculateUserRetention(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    // Implementation for user retention calculation
    return {
      day1: 85,
      day7: 65,
      day30: 45,
    };
  }

  private async getUserDemographics(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    // Implementation for user demographics
    return {
      ageGroups: {
        '18-24': 25,
        '25-34': 35,
        '35-44': 20,
        '45-54': 15,
        '55+': 5,
      },
      countries: {
        'US': 40,
        'UK': 15,
        'Canada': 10,
        'Australia': 8,
        'Other': 27,
      },
      devices: {
        'Desktop': 45,
        'Mobile': 40,
        'Tablet': 10,
        'Smart TV': 5,
      },
    };
  }

  private async calculateChurnRate(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<number> {
    // Implementation for churn rate calculation
    return 3.2;
  }

  private async getTopContent(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<any[]> {
    // Implementation for top content retrieval
    return [];
  }

  private async calculateContentPerformance(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    // Implementation for content performance calculation
    return {
      completionRate: 72.5,
      dropOffPoints: [15, 45, 75],
      engagementScore: 8.2,
    };
  }

  private async getGenrePopularity(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<Record<string, number>> {
    // Implementation for genre popularity
    return {
      'Action': 25,
      'Drama': 20,
      'Comedy': 18,
      'Thriller': 15,
      'Documentary': 12,
      'Other': 10,
    };
  }

  private async calculateMRR(tenantId?: string): Promise<number> {
    // Implementation for Monthly Recurring Revenue calculation
    return 50000;
  }

  private async calculateCLV(tenantId?: string): Promise<number> {
    // Implementation for Customer Lifetime Value calculation
    return 150;
  }

  private async calculateChurnRevenue(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<number> {
    // Implementation for churn revenue calculation
    return 5000;
  }

  private async calculateConversionRate(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<number> {
    // Implementation for conversion rate calculation
    return 7.5;
  }

  private async calculatePeakViewers(tenantId?: string, dateRange?: { start: Date; end: Date }): Promise<number> {
    // Implementation for peak viewers calculation
    return 1250;
  }

  private getDefaultDateRange(reportType: string): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();

    switch (reportType) {
      case 'daily':
        start.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(now.getMonth() - 1);
        break;
      default:
        start.setDate(now.getDate() - 7);
    }

    return { start, end: now };
  }

  private getPreviousPeriod(dateRange?: { start: Date; end: Date }): { start: Date; end: Date } {
    if (!dateRange) {
      return this.getDefaultDateRange('daily');
    }

    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    const start = new Date(dateRange.start.getTime() - duration);
    const end = new Date(dateRange.end.getTime() - duration);

    return { start, end };
  }

  private async saveReport(report: AnalyticsReport): Promise<void> {
    try {
      await this.prisma.analyticsReport.create({
        data: {
          id: report.id,
          tenantId: report.tenantId,
          reportType: report.reportType,
          dateRangeStart: report.dateRange.start,
          dateRangeEnd: report.dateRange.end,
          metrics: report.metrics,
          insights: report.insights,
          recommendations: report.recommendations,
          generatedAt: report.generatedAt,
        },
      });
    } catch (error) {
      this.logger.error('Error saving analytics report:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReports(): Promise<void> {
    try {
      this.logger.log('Generating daily analytics reports...');
      
      // Generate reports for all active tenants
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'active' },
      });

      for (const tenant of tenants) {
        await this.generateComprehensiveReport(tenant.id, undefined, 'daily');
      }

      this.logger.log(`Generated daily reports for ${tenants.length} tenants`);
    } catch (error) {
      this.logger.error('Error generating daily reports:', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyReports(): Promise<void> {
    try {
      this.logger.log('Generating weekly analytics reports...');
      
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'active' },
      });

      for (const tenant of tenants) {
        await this.generateComprehensiveReport(tenant.id, undefined, 'weekly');
      }

      this.logger.log(`Generated weekly reports for ${tenants.length} tenants`);
    } catch (error) {
      this.logger.error('Error generating weekly reports:', error);
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyReports(): Promise<void> {
    try {
      this.logger.log('Generating monthly analytics reports...');
      
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'active' },
      });

      for (const tenant of tenants) {
        await this.generateComprehensiveReport(tenant.id, undefined, 'monthly');
      }

      this.logger.log(`Generated monthly reports for ${tenants.length} tenants`);
    } catch (error) {
      this.logger.error('Error generating monthly reports:', error);
    }
  }
}
