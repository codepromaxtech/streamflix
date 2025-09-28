import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as tf from '@tensorflow/tfjs-node';

interface ModerationResult {
  isApproved: boolean;
  confidence: number;
  flags: ModerationFlag[];
  category: 'safe' | 'questionable' | 'unsafe' | 'banned';
  reason?: string;
  suggestedAction: 'approve' | 'review' | 'reject' | 'ban';
}

interface ModerationFlag {
  type: 'profanity' | 'spam' | 'harassment' | 'violence' | 'adult_content' | 'copyright' | 'hate_speech' | 'misinformation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  details?: string;
}

interface ContentAnalysis {
  textAnalysis?: TextAnalysis;
  imageAnalysis?: ImageAnalysis;
  videoAnalysis?: VideoAnalysis;
  audioAnalysis?: AudioAnalysis;
}

interface TextAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  toxicity: number;
  profanity: string[];
  spam: boolean;
  language: string;
  topics: string[];
}

interface ImageAnalysis {
  nsfw: boolean;
  nsfwScore: number;
  faces: number;
  objects: string[];
  text?: string;
  violence: boolean;
}

interface VideoAnalysis {
  duration: number;
  frames: ImageAnalysis[];
  audioAnalysis: AudioAnalysis;
  thumbnailAnalysis: ImageAnalysis;
}

interface AudioAnalysis {
  transcription?: string;
  language?: string;
  profanity: string[];
  volume: number;
  music: boolean;
}

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);
  private textModel: tf.LayersModel | null = null;
  private imageModel: tf.LayersModel | null = null;
  private profanityList: Set<string> = new Set();
  private spamPatterns: RegExp[] = [];

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeModels();
    this.loadProfanityList();
    this.loadSpamPatterns();
  }

  private async initializeModels(): Promise<void> {
    try {
      // Initialize text moderation model
      // In production, load pre-trained models for toxicity detection
      this.logger.log('Initializing AI moderation models...');
      
      // Placeholder for actual model loading
      // this.textModel = await tf.loadLayersModel('path/to/text-model');
      // this.imageModel = await tf.loadLayersModel('path/to/image-model');
      
      this.logger.log('AI moderation models initialized');
    } catch (error) {
      this.logger.error('Error initializing AI models:', error);
    }
  }

  async moderateText(content: string, userId?: string): Promise<ModerationResult> {
    try {
      const analysis = await this.analyzeText(content);
      const flags: ModerationFlag[] = [];

      // Check for profanity
      if (analysis.profanity.length > 0) {
        flags.push({
          type: 'profanity',
          severity: analysis.profanity.length > 3 ? 'high' : 'medium',
          confidence: 0.9,
          details: `Found ${analysis.profanity.length} profane words`,
        });
      }

      // Check for spam
      if (analysis.spam) {
        flags.push({
          type: 'spam',
          severity: 'medium',
          confidence: 0.8,
          details: 'Content matches spam patterns',
        });
      }

      // Check toxicity
      if (analysis.toxicity > 0.7) {
        flags.push({
          type: 'harassment',
          severity: analysis.toxicity > 0.9 ? 'critical' : 'high',
          confidence: analysis.toxicity,
          details: `High toxicity score: ${analysis.toxicity.toFixed(2)}`,
        });
      }

      // Determine overall result
      const result = this.calculateModerationResult(flags);

      // Log moderation result
      await this.logModerationResult('text', content, result, userId);

      return result;
    } catch (error) {
      this.logger.error('Error moderating text:', error);
      return {
        isApproved: false,
        confidence: 0,
        flags: [],
        category: 'unsafe',
        suggestedAction: 'review',
        reason: 'Moderation error',
      };
    }
  }

  async moderateImage(imageUrl: string, userId?: string): Promise<ModerationResult> {
    try {
      const analysis = await this.analyzeImage(imageUrl);
      const flags: ModerationFlag[] = [];

      // Check for NSFW content
      if (analysis.nsfw && analysis.nsfwScore > 0.7) {
        flags.push({
          type: 'adult_content',
          severity: analysis.nsfwScore > 0.9 ? 'critical' : 'high',
          confidence: analysis.nsfwScore,
          details: `NSFW content detected with ${(analysis.nsfwScore * 100).toFixed(1)}% confidence`,
        });
      }

      // Check for violence
      if (analysis.violence) {
        flags.push({
          type: 'violence',
          severity: 'high',
          confidence: 0.8,
          details: 'Violent content detected',
        });
      }

      // Check text in image
      if (analysis.text) {
        const textResult = await this.moderateText(analysis.text, userId);
        flags.push(...textResult.flags);
      }

      const result = this.calculateModerationResult(flags);
      await this.logModerationResult('image', imageUrl, result, userId);

      return result;
    } catch (error) {
      this.logger.error('Error moderating image:', error);
      return {
        isApproved: false,
        confidence: 0,
        flags: [],
        category: 'unsafe',
        suggestedAction: 'review',
        reason: 'Moderation error',
      };
    }
  }

  async moderateVideo(videoUrl: string, userId?: string): Promise<ModerationResult> {
    try {
      const analysis = await this.analyzeVideo(videoUrl);
      const flags: ModerationFlag[] = [];

      // Analyze thumbnail
      const thumbnailResult = await this.moderateImage(analysis.thumbnailAnalysis.toString());
      flags.push(...thumbnailResult.flags);

      // Analyze audio transcription
      if (analysis.audioAnalysis.transcription) {
        const textResult = await this.moderateText(analysis.audioAnalysis.transcription, userId);
        flags.push(...textResult.flags);
      }

      // Check profanity in audio
      if (analysis.audioAnalysis.profanity.length > 0) {
        flags.push({
          type: 'profanity',
          severity: 'medium',
          confidence: 0.8,
          details: `Audio contains profanity: ${analysis.audioAnalysis.profanity.join(', ')}`,
        });
      }

      // Sample frame analysis
      for (const frame of analysis.frames.slice(0, 10)) { // Check first 10 frames
        if (frame.nsfw && frame.nsfwScore > 0.8) {
          flags.push({
            type: 'adult_content',
            severity: 'high',
            confidence: frame.nsfwScore,
            details: 'NSFW content detected in video frames',
          });
          break;
        }
      }

      const result = this.calculateModerationResult(flags);
      await this.logModerationResult('video', videoUrl, result, userId);

      return result;
    } catch (error) {
      this.logger.error('Error moderating video:', error);
      return {
        isApproved: false,
        confidence: 0,
        flags: [],
        category: 'unsafe',
        suggestedAction: 'review',
        reason: 'Moderation error',
      };
    }
  }

  async moderateUser(userId: string): Promise<{
    riskScore: number;
    flags: string[];
    recommendedAction: 'none' | 'warn' | 'restrict' | 'suspend' | 'ban';
  }> {
    try {
      // Analyze user's recent activity
      const recentContent = await this.prisma.content.findMany({
        where: {
          creatorId: userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        include: {
          moderationResults: true,
        },
      });

      const recentComments = await this.prisma.comment.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      let riskScore = 0;
      const flags: string[] = [];

      // Analyze content violations
      const violationCount = recentContent.filter(content => 
        content.moderationResults?.some(result => !result.isApproved)
      ).length;

      if (violationCount > 0) {
        riskScore += violationCount * 10;
        flags.push(`${violationCount} content violations in last 30 days`);
      }

      // Analyze comment behavior
      let toxicComments = 0;
      for (const comment of recentComments) {
        const result = await this.moderateText(comment.content);
        if (result.flags.some(flag => flag.type === 'harassment' || flag.type === 'hate_speech')) {
          toxicComments++;
        }
      }

      if (toxicComments > 0) {
        riskScore += toxicComments * 5;
        flags.push(`${toxicComments} toxic comments in last 7 days`);
      }

      // Check reports against user
      const reportCount = await this.prisma.userReport.count({
        where: {
          reportedUserId: userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      if (reportCount > 0) {
        riskScore += reportCount * 3;
        flags.push(`${reportCount} user reports in last 30 days`);
      }

      // Determine recommended action
      let recommendedAction: 'none' | 'warn' | 'restrict' | 'suspend' | 'ban' = 'none';
      if (riskScore >= 100) {
        recommendedAction = 'ban';
      } else if (riskScore >= 50) {
        recommendedAction = 'suspend';
      } else if (riskScore >= 25) {
        recommendedAction = 'restrict';
      } else if (riskScore >= 10) {
        recommendedAction = 'warn';
      }

      return {
        riskScore,
        flags,
        recommendedAction,
      };
    } catch (error) {
      this.logger.error('Error moderating user:', error);
      return {
        riskScore: 0,
        flags: [],
        recommendedAction: 'none',
      };
    }
  }

  async getContentModerationQueue(
    status: 'pending' | 'approved' | 'rejected' = 'pending',
    limit: number = 50,
  ): Promise<any[]> {
    try {
      return await this.prisma.moderationQueue.findMany({
        where: { status },
        include: {
          content: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          moderationResult: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: limit,
      });
    } catch (error) {
      this.logger.error('Error getting moderation queue:', error);
      return [];
    }
  }

  async reviewContent(
    contentId: string,
    moderatorId: string,
    decision: 'approve' | 'reject',
    reason?: string,
  ): Promise<void> {
    try {
      await this.prisma.moderationQueue.update({
        where: { contentId },
        data: {
          status: decision === 'approve' ? 'approved' : 'rejected',
          moderatorId,
          reviewedAt: new Date(),
          moderatorNotes: reason,
        },
      });

      // Update content status
      await this.prisma.content.update({
        where: { id: contentId },
        data: {
          isApproved: decision === 'approve',
          moderationStatus: decision === 'approve' ? 'approved' : 'rejected',
        },
      });

      this.logger.log(`Content ${contentId} ${decision}d by moderator ${moderatorId}`);

      // Emit event for notifications
      this.eventEmitter.emit('content.moderated', {
        contentId,
        decision,
        moderatorId,
        reason,
      });
    } catch (error) {
      this.logger.error('Error reviewing content:', error);
      throw error;
    }
  }

  // Private helper methods
  private async analyzeText(content: string): Promise<TextAnalysis> {
    // Implement text analysis
    const profanity = this.detectProfanity(content);
    const spam = this.detectSpam(content);
    const sentiment = this.analyzeSentiment(content);
    const toxicity = this.analyzeToxicity(content);

    return {
      sentiment: sentiment > 0.1 ? 'positive' : sentiment < -0.1 ? 'negative' : 'neutral',
      sentimentScore: sentiment,
      toxicity,
      profanity,
      spam,
      language: 'en', // Placeholder
      topics: [], // Placeholder
    };
  }

  private async analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    // Implement image analysis
    // This would use computer vision APIs or models
    return {
      nsfw: false,
      nsfwScore: 0.1,
      faces: 0,
      objects: [],
      violence: false,
    };
  }

  private async analyzeVideo(videoUrl: string): Promise<VideoAnalysis> {
    // Implement video analysis
    return {
      duration: 0,
      frames: [],
      audioAnalysis: {
        profanity: [],
        volume: 0.5,
        music: false,
      },
      thumbnailAnalysis: {
        nsfw: false,
        nsfwScore: 0.1,
        faces: 0,
        objects: [],
        violence: false,
      },
    };
  }

  private detectProfanity(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => this.profanityList.has(word));
  }

  private detectSpam(text: string): boolean {
    return this.spamPatterns.some(pattern => pattern.test(text));
  }

  private analyzeSentiment(text: string): number {
    // Simple sentiment analysis - in production use proper NLP
    const positiveWords = ['good', 'great', 'awesome', 'love', 'excellent'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private analyzeToxicity(text: string): number {
    // Simple toxicity detection - in production use ML models
    const toxicPatterns = [
      /\b(kill|die|death)\b/i,
      /\b(stupid|idiot|moron)\b/i,
      /\b(hate|loathe)\b/i,
    ];
    
    let toxicity = 0;
    toxicPatterns.forEach(pattern => {
      if (pattern.test(text)) toxicity += 0.3;
    });
    
    return Math.min(1, toxicity);
  }

  private calculateModerationResult(flags: ModerationFlag[]): ModerationResult {
    if (flags.length === 0) {
      return {
        isApproved: true,
        confidence: 0.95,
        flags: [],
        category: 'safe',
        suggestedAction: 'approve',
      };
    }

    const criticalFlags = flags.filter(f => f.severity === 'critical');
    const highFlags = flags.filter(f => f.severity === 'high');
    const mediumFlags = flags.filter(f => f.severity === 'medium');

    let category: 'safe' | 'questionable' | 'unsafe' | 'banned' = 'safe';
    let suggestedAction: 'approve' | 'review' | 'reject' | 'ban' = 'approve';
    let isApproved = true;

    if (criticalFlags.length > 0) {
      category = 'banned';
      suggestedAction = 'ban';
      isApproved = false;
    } else if (highFlags.length > 0) {
      category = 'unsafe';
      suggestedAction = 'reject';
      isApproved = false;
    } else if (mediumFlags.length > 1) {
      category = 'unsafe';
      suggestedAction = 'reject';
      isApproved = false;
    } else if (mediumFlags.length > 0) {
      category = 'questionable';
      suggestedAction = 'review';
      isApproved = false;
    }

    const avgConfidence = flags.reduce((sum, flag) => sum + flag.confidence, 0) / flags.length;

    return {
      isApproved,
      confidence: avgConfidence,
      flags,
      category,
      suggestedAction,
      reason: flags.map(f => f.details).join('; '),
    };
  }

  private async logModerationResult(
    contentType: string,
    content: string,
    result: ModerationResult,
    userId?: string,
  ): Promise<void> {
    try {
      await this.prisma.moderationLog.create({
        data: {
          contentType,
          content: content.substring(0, 1000), // Limit content length
          userId,
          result: result as any,
          flags: result.flags as any,
          confidence: result.confidence,
          category: result.category,
          suggestedAction: result.suggestedAction,
        },
      });
    } catch (error) {
      this.logger.error('Error logging moderation result:', error);
    }
  }

  private loadProfanityList(): void {
    // Load profanity words - in production, load from database or file
    const profanityWords = [
      // Add profanity words here
      'badword1', 'badword2', // Placeholder
    ];
    
    this.profanityList = new Set(profanityWords);
  }

  private loadSpamPatterns(): void {
    // Load spam detection patterns
    this.spamPatterns = [
      /\b(buy now|click here|free money)\b/i,
      /\b(viagra|casino|lottery)\b/i,
      /https?:\/\/[^\s]+/g, // Multiple URLs
    ];
  }
}
