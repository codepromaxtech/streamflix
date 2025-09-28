import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface ShortVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds, max 60
  creatorId: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isPublished: boolean;
  isApproved: boolean;
  isTrending: boolean;
  uploadedAt: Date;
  publishedAt?: Date;
  metadata?: any;
}

interface ShortVideoInteraction {
  id: string;
  userId: string;
  shortId: string;
  type: 'like' | 'dislike' | 'share' | 'comment' | 'report';
  createdAt: Date;
  metadata?: any;
}

interface ShortVideoComment {
  id: string;
  shortId: string;
  userId: string;
  content: string;
  parentId?: string; // For replies
  likes: number;
  replies: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TrendingShort {
  shortId: string;
  score: number;
  views24h: number;
  likes24h: number;
  comments24h: number;
  shares24h: number;
  engagementRate: number;
  calculatedAt: Date;
}

@Injectable()
export class ShortsService {
  private readonly logger = new Logger(ShortsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async uploadShort(
    creatorId: string,
    videoFile: any,
    metadata: {
      title: string;
      description?: string;
      category: string;
      tags?: string[];
      thumbnailFile?: any;
    },
  ): Promise<ShortVideo> {
    try {
      // Validate video duration (max 60 seconds)
      const videoDuration = await this.getVideoDuration(videoFile);
      if (videoDuration > 60) {
        throw new BadRequestException('Short videos must be 60 seconds or less');
      }

      // Process video (compress, optimize)
      const processedVideo = await this.processShortVideo(videoFile);
      
      // Generate thumbnail if not provided
      const thumbnailUrl = metadata.thumbnailFile 
        ? await this.uploadThumbnail(metadata.thumbnailFile)
        : await this.generateThumbnail(processedVideo.url);

      const shortVideo: ShortVideo = {
        id: `short_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: metadata.title,
        description: metadata.description,
        videoUrl: processedVideo.url,
        thumbnailUrl,
        duration: videoDuration,
        creatorId,
        category: metadata.category,
        tags: metadata.tags || [],
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        isPublished: false,
        isApproved: false,
        isTrending: false,
        uploadedAt: new Date(),
        metadata: {
          fileSize: processedVideo.fileSize,
          resolution: processedVideo.resolution,
          codec: processedVideo.codec,
        },
      };

      // Save to database
      await this.prisma.shortVideo.create({
        data: shortVideo,
      });

      // Queue for content moderation
      await this.queueForModeration(shortVideo.id);

      this.logger.log(`Short video uploaded: ${shortVideo.id} by creator ${creatorId}`);

      // Emit upload event
      this.eventEmitter.emit('short.uploaded', shortVideo);

      return shortVideo;
    } catch (error) {
      this.logger.error('Error uploading short video:', error);
      throw error;
    }
  }

  async getShorts(
    type: 'trending' | 'following' | 'category' | 'all' = 'all',
    userId?: string,
    category?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ShortVideo[]> {
    try {
      let whereClause: any = {
        isPublished: true,
        isApproved: true,
      };

      switch (type) {
        case 'trending':
          whereClause.isTrending = true;
          break;
        case 'category':
          if (category) {
            whereClause.category = category;
          }
          break;
        case 'following':
          if (userId) {
            const following = await this.prisma.follow.findMany({
              where: { followerId: userId },
              select: { followingId: true },
            });
            whereClause.creatorId = {
              in: following.map(f => f.followingId),
            };
          }
          break;
      }

      const shorts = await this.prisma.shortVideo.findMany({
        where: whereClause,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              interactions: {
                where: { type: 'like' },
              },
              comments: true,
            },
          },
        },
        orderBy: type === 'trending' 
          ? [{ isTrending: 'desc' }, { views: 'desc' }]
          : [{ publishedAt: 'desc' }],
        skip: offset,
        take: limit,
      });

      return shorts as any;
    } catch (error) {
      this.logger.error('Error fetching shorts:', error);
      throw error;
    }
  }

  async getShortById(shortId: string, userId?: string): Promise<ShortVideo | null> {
    try {
      const short = await this.prisma.shortVideo.findUnique({
        where: { id: shortId },
        include: {
          creator: {
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
              interactions: {
                where: { type: 'like' },
              },
              comments: true,
            },
          },
        },
      });

      if (!short) {
        return null;
      }

      // Check if user has interacted with this short
      let userInteraction = null;
      if (userId) {
        userInteraction = await this.prisma.shortVideoInteraction.findFirst({
          where: {
            userId,
            shortId,
            type: { in: ['like', 'dislike'] },
          },
        });
      }

      return {
        ...short,
        userInteraction: userInteraction?.type,
      } as any;
    } catch (error) {
      this.logger.error('Error fetching short by ID:', error);
      return null;
    }
  }

  async incrementView(shortId: string, userId?: string): Promise<void> {
    try {
      // Update view count
      await this.prisma.shortVideo.update({
        where: { id: shortId },
        data: {
          views: {
            increment: 1,
          },
        },
      });

      // Track user view if user is logged in
      if (userId) {
        await this.prisma.shortVideoInteraction.create({
          data: {
            userId,
            shortId,
            type: 'view',
            createdAt: new Date(),
          },
        });
      }

      // Update trending score
      await this.updateTrendingScore(shortId);
    } catch (error) {
      this.logger.error('Error incrementing view:', error);
    }
  }

  async likeShort(shortId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    try {
      // Check if user already liked/disliked
      const existingInteraction = await this.prisma.shortVideoInteraction.findFirst({
        where: {
          userId,
          shortId,
          type: { in: ['like', 'dislike'] },
        },
      });

      let liked = false;
      let likeCountChange = 0;

      if (existingInteraction) {
        if (existingInteraction.type === 'like') {
          // Unlike
          await this.prisma.shortVideoInteraction.delete({
            where: { id: existingInteraction.id },
          });
          likeCountChange = -1;
        } else {
          // Change from dislike to like
          await this.prisma.shortVideoInteraction.update({
            where: { id: existingInteraction.id },
            data: { type: 'like' },
          });
          likeCountChange = 1;
          liked = true;
        }
      } else {
        // New like
        await this.prisma.shortVideoInteraction.create({
          data: {
            userId,
            shortId,
            type: 'like',
          },
        });
        likeCountChange = 1;
        liked = true;
      }

      // Update like count
      const updatedShort = await this.prisma.shortVideo.update({
        where: { id: shortId },
        data: {
          likes: {
            increment: likeCountChange,
          },
        },
      });

      // Update trending score
      await this.updateTrendingScore(shortId);

      return {
        liked,
        likeCount: updatedShort.likes,
      };
    } catch (error) {
      this.logger.error('Error liking short:', error);
      throw error;
    }
  }

  async commentOnShort(
    shortId: string,
    userId: string,
    content: string,
    parentId?: string,
  ): Promise<ShortVideoComment> {
    try {
      const comment: ShortVideoComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        shortId,
        userId,
        content: content.trim(),
        parentId,
        likes: 0,
        replies: 0,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save comment
      await this.prisma.shortVideoComment.create({
        data: comment,
      });

      // Update comment count on short
      await this.prisma.shortVideo.update({
        where: { id: shortId },
        data: {
          comments: {
            increment: 1,
          },
        },
      });

      // Update reply count on parent comment if this is a reply
      if (parentId) {
        await this.prisma.shortVideoComment.update({
          where: { id: parentId },
          data: {
            replies: {
              increment: 1,
            },
          },
        });
      }

      // Update trending score
      await this.updateTrendingScore(shortId);

      this.logger.log(`Comment added to short ${shortId} by user ${userId}`);

      return comment;
    } catch (error) {
      this.logger.error('Error commenting on short:', error);
      throw error;
    }
  }

  async shareShort(shortId: string, userId?: string): Promise<{ shareCount: number }> {
    try {
      // Update share count
      const updatedShort = await this.prisma.shortVideo.update({
        where: { id: shortId },
        data: {
          shares: {
            increment: 1,
          },
        },
      });

      // Track user share if user is logged in
      if (userId) {
        await this.prisma.shortVideoInteraction.create({
          data: {
            userId,
            shortId,
            type: 'share',
          },
        });
      }

      // Update trending score
      await this.updateTrendingScore(shortId);

      return {
        shareCount: updatedShort.shares,
      };
    } catch (error) {
      this.logger.error('Error sharing short:', error);
      throw error;
    }
  }

  async getComments(
    shortId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ShortVideoComment[]> {
    try {
      const comments = await this.prisma.shortVideoComment.findMany({
        where: {
          shortId,
          parentId: null, // Only top-level comments
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          replies: {
            take: 3, // Show first 3 replies
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      return comments as any;
    } catch (error) {
      this.logger.error('Error fetching comments:', error);
      throw error;
    }
  }

  async updateTrendingShorts(): Promise<void> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get shorts with activity in the last 24 hours
      const recentShorts = await this.prisma.shortVideo.findMany({
        where: {
          isPublished: true,
          isApproved: true,
          publishedAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          interactions: {
            where: {
              createdAt: {
                gte: yesterday,
              },
            },
          },
        },
      });

      const trendingScores: TrendingShort[] = [];

      for (const short of recentShorts) {
        const views24h = short.interactions.filter(i => i.type === 'view').length;
        const likes24h = short.interactions.filter(i => i.type === 'like').length;
        const comments24h = short.interactions.filter(i => i.type === 'comment').length;
        const shares24h = short.interactions.filter(i => i.type === 'share').length;

        const totalInteractions = views24h + likes24h + comments24h + shares24h;
        const engagementRate = totalInteractions > 0 ? (likes24h + comments24h + shares24h) / views24h : 0;

        // Calculate trending score (weighted formula)
        const score = (
          views24h * 1 +
          likes24h * 3 +
          comments24h * 5 +
          shares24h * 7 +
          engagementRate * 100
        );

        trendingScores.push({
          shortId: short.id,
          score,
          views24h,
          likes24h,
          comments24h,
          shares24h,
          engagementRate,
          calculatedAt: now,
        });
      }

      // Sort by score and mark top shorts as trending
      trendingScores.sort((a, b) => b.score - a.score);
      const topTrendingIds = trendingScores.slice(0, 50).map(t => t.shortId);

      // Update trending status
      await this.prisma.shortVideo.updateMany({
        where: { isTrending: true },
        data: { isTrending: false },
      });

      await this.prisma.shortVideo.updateMany({
        where: { id: { in: topTrendingIds } },
        data: { isTrending: true },
      });

      this.logger.log(`Updated trending shorts: ${topTrendingIds.length} shorts marked as trending`);
    } catch (error) {
      this.logger.error('Error updating trending shorts:', error);
    }
  }

  private async updateTrendingScore(shortId: string): Promise<void> {
    // This would be called after each interaction to update trending scores
    // For performance, you might want to batch these updates
  }

  private async getVideoDuration(videoFile: any): Promise<number> {
    // Use FFmpeg or similar to get video duration
    // Placeholder implementation
    return 45; // seconds
  }

  private async processShortVideo(videoFile: any): Promise<any> {
    // Process video for shorts (compress, optimize for mobile)
    // Placeholder implementation
    return {
      url: '/videos/shorts/processed_video.mp4',
      fileSize: 5 * 1024 * 1024, // 5MB
      resolution: '1080x1920', // Vertical format
      codec: 'h264',
    };
  }

  private async uploadThumbnail(thumbnailFile: any): Promise<string> {
    // Upload thumbnail to storage
    return '/thumbnails/shorts/thumbnail.jpg';
  }

  private async generateThumbnail(videoUrl: string): Promise<string> {
    // Generate thumbnail from video using FFmpeg
    return '/thumbnails/shorts/auto_generated.jpg';
  }

  private async queueForModeration(shortId: string): Promise<void> {
    // Queue short video for content moderation
    this.logger.log(`Queued short ${shortId} for moderation`);
  }
}
