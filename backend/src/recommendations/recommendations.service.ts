import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as tf from '@tensorflow/tfjs-node';

interface UserPreferences {
  genres: string[];
  actors: string[];
  directors: string[];
  languages: string[];
  avgRating: number;
  preferredDuration: number;
  watchTime: string; // morning, afternoon, evening, night
}

interface ContentFeatures {
  id: string;
  title: string;
  genres: string[];
  actors: string[];
  directors: string[];
  language: string;
  rating: number;
  duration: number;
  releaseYear: number;
  popularity: number;
  viewCount: number;
}

interface RecommendationScore {
  contentId: string;
  score: number;
  reasons: string[];
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeModel();
  }

  private async initializeModel() {
    try {
      // Load pre-trained recommendation model or create a simple one
      await this.createSimpleModel();
      this.isModelLoaded = true;
      this.logger.log('Recommendation model initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize recommendation model:', error);
    }
  }

  private async createSimpleModel() {
    // Create a simple neural network for content recommendation
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    this.model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });
  }

  async getPersonalizedRecommendations(
    userId: string,
    limit = 20,
    excludeWatched = true,
  ): Promise<ContentFeatures[]> {
    try {
      // Get user preferences and watch history
      const userPreferences = await this.getUserPreferences(userId);
      const watchHistory = await this.getUserWatchHistory(userId);
      
      // Get all available content
      const allContent = await this.getAllContent();
      
      // Filter out already watched content if requested
      let candidateContent = allContent;
      if (excludeWatched) {
        const watchedIds = new Set(watchHistory.map(h => h.contentId));
        candidateContent = allContent.filter(c => !watchedIds.has(c.id));
      }
      
      // Calculate recommendation scores
      const recommendations = await this.calculateRecommendationScores(
        userPreferences,
        candidateContent,
        watchHistory,
      );
      
      // Sort by score and return top recommendations
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => candidateContent.find(c => c.id === r.contentId))
        .filter(Boolean) as ContentFeatures[];
        
    } catch (error) {
      this.logger.error('Error generating personalized recommendations:', error);
      return this.getFallbackRecommendations(limit);
    }
  }

  async getSimilarContent(contentId: string, limit = 10): Promise<ContentFeatures[]> {
    try {
      const targetContent = await this.getContentById(contentId);
      if (!targetContent) {
        return [];
      }
      
      const allContent = await this.getAllContent();
      const similarities = allContent
        .filter(c => c.id !== contentId)
        .map(content => ({
          content,
          similarity: this.calculateContentSimilarity(targetContent, content),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
      
      return similarities.map(s => s.content);
    } catch (error) {
      this.logger.error('Error finding similar content:', error);
      return [];
    }
  }

  async getTrendingRecommendations(limit = 20): Promise<ContentFeatures[]> {
    try {
      // Get trending content based on recent views, ratings, and engagement
      const trendingContent = await this.prisma.content.findMany({
        where: {
          isPublished: true,
        },
        include: {
          _count: {
            select: {
              watchHistory: {
                where: {
                  watchedAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                  },
                },
              },
              ratings: true,
            },
          },
        },
        orderBy: [
          { viewCount: 'desc' },
          { rating: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });
      
      return trendingContent.map(this.mapContentToFeatures);
    } catch (error) {
      this.logger.error('Error getting trending recommendations:', error);
      return [];
    }
  }

  async getGenreBasedRecommendations(
    userId: string,
    genre: string,
    limit = 20,
  ): Promise<ContentFeatures[]> {
    try {
      const userPreferences = await this.getUserPreferences(userId);
      
      const genreContent = await this.prisma.content.findMany({
        where: {
          isPublished: true,
          genre: {
            contains: genre,
          },
        },
        include: {
          _count: {
            select: {
              watchHistory: true,
              ratings: true,
            },
          },
        },
        orderBy: [
          { rating: 'desc' },
          { viewCount: 'desc' },
        ],
        take: limit * 2, // Get more to filter and rank
      });
      
      const contentFeatures = genreContent.map(this.mapContentToFeatures);
      
      // Rank based on user preferences
      const rankedContent = contentFeatures
        .map(content => ({
          content,
          score: this.calculateGenrePreferenceScore(content, userPreferences),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => r.content);
      
      return rankedContent;
    } catch (error) {
      this.logger.error('Error getting genre-based recommendations:', error);
      return [];
    }
  }

  async getContinueWatching(userId: string): Promise<ContentFeatures[]> {
    try {
      const continueWatching = await this.prisma.watchHistory.findMany({
        where: {
          userId,
          progress: {
            gt: 0.05, // More than 5% watched
            lt: 0.95, // Less than 95% watched
          },
        },
        include: {
          content: {
            include: {
              _count: {
                select: {
                  watchHistory: true,
                  ratings: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 10,
      });
      
      return continueWatching.map(w => this.mapContentToFeatures(w.content));
    } catch (error) {
      this.logger.error('Error getting continue watching:', error);
      return [];
    }
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Analyze user's watch history to determine preferences
    const watchHistory = await this.prisma.watchHistory.findMany({
      where: { userId },
      include: { content: true },
      orderBy: { watchedAt: 'desc' },
      take: 100,
    });
    
    const ratings = await this.prisma.rating.findMany({
      where: { userId },
      include: { content: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    // Extract preferences from watch history and ratings
    const genreCount: Record<string, number> = {};
    const actorCount: Record<string, number> = {};
    const directorCount: Record<string, number> = {};
    const languageCount: Record<string, number> = {};
    let totalRating = 0;
    let totalDuration = 0;
    let ratingCount = 0;
    
    // Analyze watch history
    watchHistory.forEach(watch => {
      const content = watch.content;
      
      // Count genres
      if (content.genre) {
        content.genre.split(',').forEach(genre => {
          genreCount[genre.trim()] = (genreCount[genre.trim()] || 0) + 1;
        });
      }
      
      // Count actors
      if (content.cast) {
        content.cast.split(',').slice(0, 3).forEach(actor => {
          actorCount[actor.trim()] = (actorCount[actor.trim()] || 0) + 1;
        });
      }
      
      // Count directors
      if (content.director) {
        directorCount[content.director] = (directorCount[content.director] || 0) + 1;
      }
      
      // Count languages
      if (content.language) {
        languageCount[content.language] = (languageCount[content.language] || 0) + 1;
      }
      
      totalDuration += content.duration || 0;
    });
    
    // Analyze ratings
    ratings.forEach(rating => {
      totalRating += rating.rating;
      ratingCount++;
    });
    
    // Determine watch time preference based on watch history timestamps
    const watchTimes = watchHistory.map(w => new Date(w.watchedAt).getHours());
    const timePreference = this.determineWatchTimePreference(watchTimes);
    
    return {
      genres: Object.entries(genreCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([genre]) => genre),
      actors: Object.entries(actorCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([actor]) => actor),
      directors: Object.entries(directorCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([director]) => director),
      languages: Object.entries(languageCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([language]) => language),
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 3.5,
      preferredDuration: watchHistory.length > 0 ? totalDuration / watchHistory.length : 90,
      watchTime: timePreference,
    };
  }

  private async getUserWatchHistory(userId: string) {
    return this.prisma.watchHistory.findMany({
      where: { userId },
      select: { contentId: true, progress: true, watchedAt: true },
      orderBy: { watchedAt: 'desc' },
      take: 200,
    });
  }

  private async getAllContent(): Promise<ContentFeatures[]> {
    const content = await this.prisma.content.findMany({
      where: { isPublished: true },
      include: {
        _count: {
          select: {
            watchHistory: true,
            ratings: true,
          },
        },
      },
    });
    
    return content.map(this.mapContentToFeatures);
  }

  private async getContentById(contentId: string): Promise<ContentFeatures | null> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        _count: {
          select: {
            watchHistory: true,
            ratings: true,
          },
        },
      },
    });
    
    return content ? this.mapContentToFeatures(content) : null;
  }

  private mapContentToFeatures(content: any): ContentFeatures {
    return {
      id: content.id,
      title: content.title,
      genres: content.genre ? content.genre.split(',').map((g: string) => g.trim()) : [],
      actors: content.cast ? content.cast.split(',').slice(0, 5).map((a: string) => a.trim()) : [],
      directors: content.director ? [content.director] : [],
      language: content.language || 'en',
      rating: content.rating || 0,
      duration: content.duration || 0,
      releaseYear: content.releaseYear || new Date().getFullYear(),
      popularity: content.viewCount || 0,
      viewCount: content._count?.watchHistory || 0,
    };
  }

  private async calculateRecommendationScores(
    userPreferences: UserPreferences,
    candidateContent: ContentFeatures[],
    watchHistory: any[],
  ): Promise<RecommendationScore[]> {
    return candidateContent.map(content => {
      let score = 0;
      const reasons: string[] = [];
      
      // Genre preference score (30% weight)
      const genreScore = this.calculateGenreScore(content.genres, userPreferences.genres);
      score += genreScore * 0.3;
      if (genreScore > 0.5) {
        reasons.push(`Matches your ${content.genres[0]} preference`);
      }
      
      // Actor preference score (20% weight)
      const actorScore = this.calculateActorScore(content.actors, userPreferences.actors);
      score += actorScore * 0.2;
      if (actorScore > 0.5) {
        const matchingActor = content.actors.find(a => userPreferences.actors.includes(a));
        if (matchingActor) {
          reasons.push(`Features ${matchingActor}`);
        }
      }
      
      // Director preference score (15% weight)
      const directorScore = this.calculateDirectorScore(content.directors, userPreferences.directors);
      score += directorScore * 0.15;
      if (directorScore > 0.5) {
        reasons.push(`Directed by ${content.directors[0]}`);
      }
      
      // Rating score (20% weight)
      const ratingScore = Math.min(content.rating / 5, 1);
      score += ratingScore * 0.2;
      if (content.rating >= 4) {
        reasons.push(`Highly rated (${content.rating}/5)`);
      }
      
      // Popularity score (10% weight)
      const popularityScore = Math.min(content.popularity / 10000, 1);
      score += popularityScore * 0.1;
      if (content.popularity > 5000) {
        reasons.push('Popular choice');
      }
      
      // Duration preference score (5% weight)
      const durationDiff = Math.abs(content.duration - userPreferences.preferredDuration);
      const durationScore = Math.max(0, 1 - durationDiff / 60);
      score += durationScore * 0.05;
      
      return {
        contentId: content.id,
        score: Math.min(score, 1),
        reasons,
      };
    });
  }

  private calculateContentSimilarity(content1: ContentFeatures, content2: ContentFeatures): number {
    let similarity = 0;
    
    // Genre similarity (40% weight)
    const genreSimilarity = this.calculateArraySimilarity(content1.genres, content2.genres);
    similarity += genreSimilarity * 0.4;
    
    // Actor similarity (30% weight)
    const actorSimilarity = this.calculateArraySimilarity(content1.actors, content2.actors);
    similarity += actorSimilarity * 0.3;
    
    // Director similarity (20% weight)
    const directorSimilarity = this.calculateArraySimilarity(content1.directors, content2.directors);
    similarity += directorSimilarity * 0.2;
    
    // Release year similarity (10% weight)
    const yearDiff = Math.abs(content1.releaseYear - content2.releaseYear);
    const yearSimilarity = Math.max(0, 1 - yearDiff / 20);
    similarity += yearSimilarity * 0.1;
    
    return similarity;
  }

  private calculateGenreScore(contentGenres: string[], userGenres: string[]): number {
    if (userGenres.length === 0) return 0.5;
    
    const matches = contentGenres.filter(genre => 
      userGenres.some(userGenre => 
        userGenre.toLowerCase().includes(genre.toLowerCase()) ||
        genre.toLowerCase().includes(userGenre.toLowerCase())
      )
    ).length;
    
    return matches / Math.max(contentGenres.length, userGenres.length);
  }

  private calculateActorScore(contentActors: string[], userActors: string[]): number {
    if (userActors.length === 0) return 0.5;
    
    const matches = contentActors.filter(actor => userActors.includes(actor)).length;
    return matches / Math.max(contentActors.length, 1);
  }

  private calculateDirectorScore(contentDirectors: string[], userDirectors: string[]): number {
    if (userDirectors.length === 0) return 0.5;
    
    const matches = contentDirectors.filter(director => userDirectors.includes(director)).length;
    return matches > 0 ? 1 : 0;
  }

  private calculateGenrePreferenceScore(content: ContentFeatures, preferences: UserPreferences): number {
    const genreScore = this.calculateGenreScore(content.genres, preferences.genres);
    const ratingScore = content.rating / 5;
    const popularityScore = Math.min(content.popularity / 1000, 1);
    
    return (genreScore * 0.6) + (ratingScore * 0.3) + (popularityScore * 0.1);
  }

  private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    
    const intersection = arr1.filter(item => arr2.includes(item));
    const union = [...new Set([...arr1, ...arr2])];
    
    return intersection.length / union.length;
  }

  private determineWatchTimePreference(watchTimes: number[]): string {
    if (watchTimes.length === 0) return 'evening';
    
    const timeRanges = {
      morning: watchTimes.filter(h => h >= 6 && h < 12).length,
      afternoon: watchTimes.filter(h => h >= 12 && h < 18).length,
      evening: watchTimes.filter(h => h >= 18 && h < 22).length,
      night: watchTimes.filter(h => h >= 22 || h < 6).length,
    };
    
    return Object.entries(timeRanges)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  private async getFallbackRecommendations(limit: number): Promise<ContentFeatures[]> {
    // Return popular content as fallback
    return this.getTrendingRecommendations(limit);
  }

  async updateUserInteraction(
    userId: string,
    contentId: string,
    interactionType: 'view' | 'like' | 'share' | 'complete',
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.userInteraction.create({
        data: {
          userId,
          contentId,
          interactionType,
          metadata,
        },
      });
      
      // Update recommendation model with new interaction data
      this.scheduleModelUpdate();
    } catch (error) {
      this.logger.error('Error updating user interaction:', error);
    }
  }

  private scheduleModelUpdate(): void {
    // Schedule model retraining with new interaction data
    // This would typically be done in a background job
    setTimeout(() => {
      this.retrainModel();
    }, 60000); // Retrain after 1 minute
  }

  private async retrainModel(): Promise<void> {
    try {
      // Implement model retraining logic here
      // This would involve collecting recent interaction data
      // and updating the model weights
      this.logger.log('Model retraining scheduled');
    } catch (error) {
      this.logger.error('Error retraining model:', error);
    }
  }
}
