import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';

interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  pagination?: {
    page: number;
    limit: number;
  };
  userId?: string;
}

interface SearchFilters {
  contentType?: 'video' | 'stream' | 'short' | 'blog' | 'user';
  category?: string[];
  duration?: {
    min?: number;
    max?: number;
  };
  quality?: string[];
  language?: string[];
  uploadDate?: {
    from?: Date;
    to?: Date;
  };
  rating?: {
    min?: number;
    max?: number;
  };
  verified?: boolean;
  free?: boolean;
  tags?: string[];
}

interface SearchSort {
  field: 'relevance' | 'date' | 'views' | 'rating' | 'duration';
  order: 'asc' | 'desc';
}

interface SearchResult {
  id: string;
  type: 'video' | 'stream' | 'short' | 'blog' | 'user';
  title: string;
  description?: string;
  thumbnailUrl?: string;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  metadata: {
    duration?: number;
    views?: number;
    rating?: number;
    uploadDate?: Date;
    category?: string;
    tags?: string[];
  };
  relevanceScore: number;
  highlights?: string[];
}

interface SearchSuggestion {
  text: string;
  type: 'query' | 'creator' | 'category' | 'tag';
  count?: number;
}

interface SearchAnalytics {
  query: string;
  userId?: string;
  resultsCount: number;
  clickedResults: string[];
  timestamp: Date;
  filters?: SearchFilters;
}

@Injectable()
export class AdvancedSearchService {
  private readonly logger = new Logger(AdvancedSearchService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private elasticsearchService: ElasticsearchService,
  ) {
    this.initializeSearchIndex();
  }

  private async initializeSearchIndex(): Promise<void> {
    try {
      // Create search indices if they don't exist
      const indices = ['content', 'users', 'blogs'];
      
      for (const index of indices) {
        const exists = await this.elasticsearchService.indices.exists({ index });
        if (!exists) {
          await this.createSearchIndex(index);
        }
      }

      this.logger.log('Search indices initialized');
    } catch (error) {
      this.logger.error('Error initializing search indices:', error);
    }
  }

  async search(searchQuery: SearchQuery): Promise<{
    results: SearchResult[];
    total: number;
    suggestions?: SearchSuggestion[];
    facets?: any;
  }> {
    try {
      const { query, filters, sort, pagination, userId } = searchQuery;
      const { page = 1, limit = 20 } = pagination || {};

      // Build Elasticsearch query
      const esQuery = this.buildElasticsearchQuery(query, filters, sort);
      
      // Execute search
      const response = await this.elasticsearchService.search({
        index: this.getSearchIndices(filters?.contentType),
        body: {
          query: esQuery,
          highlight: {
            fields: {
              title: {},
              description: {},
              content: {},
            },
          },
          aggs: this.buildAggregations(),
          from: (page - 1) * limit,
          size: limit,
        },
      });

      // Process results
      const results = await this.processSearchResults(response.body.hits.hits);
      const suggestions = await this.generateSuggestions(query);
      
      // Log search analytics
      await this.logSearchAnalytics({
        query,
        userId,
        resultsCount: response.body.hits.total.value,
        clickedResults: [],
        timestamp: new Date(),
        filters,
      });

      return {
        results,
        total: response.body.hits.total.value,
        suggestions,
        facets: response.body.aggregations,
      };
    } catch (error) {
      this.logger.error('Error performing search:', error);
      return {
        results: [],
        total: 0,
      };
    }
  }

  async getAutocompleteSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      if (query.length < 2) return [];

      const suggestions: SearchSuggestion[] = [];

      // Get query suggestions from search history
      const queryHistory = await this.prisma.searchAnalytics.groupBy({
        by: ['query'],
        where: {
          query: {
            contains: query,
            mode: 'insensitive',
          },
        },
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: 5,
      });

      queryHistory.forEach(item => {
        suggestions.push({
          text: item.query,
          type: 'query',
          count: item._count.query,
        });
      });

      // Get creator suggestions
      const creators = await this.prisma.user.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
          isStreamer: true,
        },
        select: {
          name: true,
          followersCount: true,
        },
        orderBy: {
          followersCount: 'desc',
        },
        take: 3,
      });

      creators.forEach(creator => {
        suggestions.push({
          text: creator.name,
          type: 'creator',
          count: creator.followersCount,
        });
      });

      // Get category suggestions
      const categories = await this.prisma.content.groupBy({
        by: ['category'],
        where: {
          category: {
            contains: query,
            mode: 'insensitive',
          },
        },
        _count: {
          category: true,
        },
        orderBy: {
          _count: {
            category: 'desc',
          },
        },
        take: 2,
      });

      categories.forEach(cat => {
        suggestions.push({
          text: cat.category,
          type: 'category',
          count: cat._count.category,
        });
      });

      return suggestions.slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting autocomplete suggestions:', error);
      return [];
    }
  }

  async getTrendingSearches(limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const trending = await this.prisma.searchAnalytics.groupBy({
        by: ['query'],
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: limit,
      });

      return trending.map(item => ({
        text: item.query,
        type: 'query' as const,
        count: item._count.query,
      }));
    } catch (error) {
      this.logger.error('Error getting trending searches:', error);
      return [];
    }
  }

  async searchWithVoice(audioBlob: Buffer, userId?: string): Promise<{
    transcription: string;
    results: SearchResult[];
    total: number;
  }> {
    try {
      // Transcribe audio using speech-to-text service
      const transcription = await this.transcribeAudio(audioBlob);
      
      if (!transcription) {
        return {
          transcription: '',
          results: [],
          total: 0,
        };
      }

      // Perform search with transcribed text
      const searchResults = await this.search({
        query: transcription,
        userId,
      });

      return {
        transcription,
        results: searchResults.results,
        total: searchResults.total,
      };
    } catch (error) {
      this.logger.error('Error performing voice search:', error);
      return {
        transcription: '',
        results: [],
        total: 0,
      };
    }
  }

  async searchByImage(imageUrl: string, userId?: string): Promise<{
    detectedObjects: string[];
    results: SearchResult[];
    total: number;
  }> {
    try {
      // Analyze image to detect objects/content
      const detectedObjects = await this.analyzeImage(imageUrl);
      
      if (detectedObjects.length === 0) {
        return {
          detectedObjects: [],
          results: [],
          total: 0,
        };
      }

      // Search using detected objects as query
      const searchQuery = detectedObjects.join(' ');
      const searchResults = await this.search({
        query: searchQuery,
        userId,
      });

      return {
        detectedObjects,
        results: searchResults.results,
        total: searchResults.total,
      };
    } catch (error) {
      this.logger.error('Error performing image search:', error);
      return {
        detectedObjects: [],
        results: [],
        total: 0,
      };
    }
  }

  async getSearchAnalytics(
    dateRange: { from: Date; to: Date },
    userId?: string,
  ): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    topQueries: Array<{ query: string; count: number }>;
    noResultsQueries: Array<{ query: string; count: number }>;
    avgResultsPerSearch: number;
  }> {
    try {
      const whereClause = {
        timestamp: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
        ...(userId && { userId }),
      };

      const totalSearches = await this.prisma.searchAnalytics.count({
        where: whereClause,
      });

      const uniqueQueries = await this.prisma.searchAnalytics.groupBy({
        by: ['query'],
        where: whereClause,
      });

      const topQueries = await this.prisma.searchAnalytics.groupBy({
        by: ['query'],
        where: whereClause,
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: 10,
      });

      const noResultsQueries = await this.prisma.searchAnalytics.groupBy({
        by: ['query'],
        where: {
          ...whereClause,
          resultsCount: 0,
        },
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: 10,
      });

      const avgResults = await this.prisma.searchAnalytics.aggregate({
        where: whereClause,
        _avg: {
          resultsCount: true,
        },
      });

      return {
        totalSearches,
        uniqueQueries: uniqueQueries.length,
        topQueries: topQueries.map(q => ({
          query: q.query,
          count: q._count.query,
        })),
        noResultsQueries: noResultsQueries.map(q => ({
          query: q.query,
          count: q._count.query,
        })),
        avgResultsPerSearch: avgResults._avg.resultsCount || 0,
      };
    } catch (error) {
      this.logger.error('Error getting search analytics:', error);
      throw error;
    }
  }

  async indexContent(content: any): Promise<void> {
    try {
      const indexName = this.getContentIndexName(content.type);
      
      await this.elasticsearchService.index({
        index: indexName,
        id: content.id,
        body: {
          title: content.title,
          description: content.description,
          content: content.content,
          category: content.category,
          tags: content.tags,
          creator: {
            id: content.creatorId,
            name: content.creator?.name,
            isVerified: content.creator?.isVerified,
          },
          metadata: {
            duration: content.duration,
            views: content.views,
            rating: content.rating,
            uploadDate: content.createdAt,
            quality: content.quality,
            language: content.language,
          },
          searchableText: this.buildSearchableText(content),
        },
      });

      this.logger.log(`Content indexed: ${content.id}`);
    } catch (error) {
      this.logger.error('Error indexing content:', error);
    }
  }

  async removeFromIndex(contentId: string, contentType: string): Promise<void> {
    try {
      const indexName = this.getContentIndexName(contentType);
      
      await this.elasticsearchService.delete({
        index: indexName,
        id: contentId,
      });

      this.logger.log(`Content removed from index: ${contentId}`);
    } catch (error) {
      this.logger.error('Error removing content from index:', error);
    }
  }

  // Private helper methods
  private buildElasticsearchQuery(query: string, filters?: SearchFilters, sort?: SearchSort): any {
    const must: any[] = [];
    const filter: any[] = [];

    // Main search query
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'title^3',
            'description^2',
            'content',
            'tags^2',
            'creator.name^2',
            'searchableText',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    // Apply filters
    if (filters) {
      if (filters.category && filters.category.length > 0) {
        filter.push({
          terms: { category: filters.category },
        });
      }

      if (filters.duration) {
        const durationFilter: any = {};
        if (filters.duration.min) durationFilter.gte = filters.duration.min;
        if (filters.duration.max) durationFilter.lte = filters.duration.max;
        filter.push({
          range: { 'metadata.duration': durationFilter },
        });
      }

      if (filters.quality && filters.quality.length > 0) {
        filter.push({
          terms: { 'metadata.quality': filters.quality },
        });
      }

      if (filters.language && filters.language.length > 0) {
        filter.push({
          terms: { 'metadata.language': filters.language },
        });
      }

      if (filters.uploadDate) {
        const dateFilter: any = {};
        if (filters.uploadDate.from) dateFilter.gte = filters.uploadDate.from;
        if (filters.uploadDate.to) dateFilter.lte = filters.uploadDate.to;
        filter.push({
          range: { 'metadata.uploadDate': dateFilter },
        });
      }

      if (filters.rating) {
        const ratingFilter: any = {};
        if (filters.rating.min) ratingFilter.gte = filters.rating.min;
        if (filters.rating.max) ratingFilter.lte = filters.rating.max;
        filter.push({
          range: { 'metadata.rating': ratingFilter },
        });
      }

      if (filters.verified !== undefined) {
        filter.push({
          term: { 'creator.isVerified': filters.verified },
        });
      }

      if (filters.tags && filters.tags.length > 0) {
        filter.push({
          terms: { tags: filters.tags },
        });
      }
    }

    const esQuery: any = {
      bool: {
        must,
        filter,
      },
    };

    // Add sorting
    if (sort) {
      const sortField = this.mapSortField(sort.field);
      esQuery.sort = [{ [sortField]: { order: sort.order } }];
    } else {
      // Default sort by relevance, then by views
      esQuery.sort = [
        '_score',
        { 'metadata.views': { order: 'desc' } },
      ];
    }

    return esQuery;
  }

  private buildAggregations(): any {
    return {
      categories: {
        terms: { field: 'category', size: 20 },
      },
      languages: {
        terms: { field: 'metadata.language', size: 10 },
      },
      qualities: {
        terms: { field: 'metadata.quality', size: 5 },
      },
      duration_ranges: {
        range: {
          field: 'metadata.duration',
          ranges: [
            { to: 300 }, // < 5 minutes
            { from: 300, to: 1200 }, // 5-20 minutes
            { from: 1200, to: 3600 }, // 20-60 minutes
            { from: 3600 }, // > 1 hour
          ],
        },
      },
    };
  }

  private async processSearchResults(hits: any[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const hit of hits) {
      const source = hit._source;
      const highlights = hit.highlight || {};

      results.push({
        id: hit._id,
        type: source.type || 'video',
        title: source.title,
        description: source.description,
        thumbnailUrl: source.thumbnailUrl,
        creator: source.creator,
        metadata: source.metadata,
        relevanceScore: hit._score,
        highlights: Object.values(highlights).flat(),
      });
    }

    return results;
  }

  private async generateSuggestions(query: string): Promise<SearchSuggestion[]> {
    // Generate search suggestions based on query
    return this.getAutocompleteSuggestions(query, 5);
  }

  private getSearchIndices(contentType?: string): string {
    if (contentType) {
      return this.getContentIndexName(contentType);
    }
    return 'content,users,blogs';
  }

  private getContentIndexName(contentType: string): string {
    const indexMap = {
      video: 'content',
      stream: 'content',
      short: 'content',
      blog: 'blogs',
      user: 'users',
    };
    return indexMap[contentType] || 'content';
  }

  private mapSortField(field: string): string {
    const fieldMap = {
      relevance: '_score',
      date: 'metadata.uploadDate',
      views: 'metadata.views',
      rating: 'metadata.rating',
      duration: 'metadata.duration',
    };
    return fieldMap[field] || '_score';
  }

  private buildSearchableText(content: any): string {
    const parts = [
      content.title,
      content.description,
      content.category,
      ...(content.tags || []),
      content.creator?.name,
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async createSearchIndex(indexName: string): Promise<void> {
    const mappings = {
      content: {
        mappings: {
          properties: {
            title: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            content: { type: 'text', analyzer: 'standard' },
            category: { type: 'keyword' },
            tags: { type: 'keyword' },
            creator: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text', analyzer: 'standard' },
                isVerified: { type: 'boolean' },
              },
            },
            metadata: {
              properties: {
                duration: { type: 'integer' },
                views: { type: 'integer' },
                rating: { type: 'float' },
                uploadDate: { type: 'date' },
                quality: { type: 'keyword' },
                language: { type: 'keyword' },
              },
            },
            searchableText: { type: 'text', analyzer: 'standard' },
          },
        },
      },
    };

    await this.elasticsearchService.indices.create({
      index: indexName,
      body: mappings[indexName] || mappings.content,
    });
  }

  private async transcribeAudio(audioBlob: Buffer): Promise<string> {
    // Implement speech-to-text transcription
    // This would integrate with services like Google Speech-to-Text, AWS Transcribe, etc.
    return 'transcribed text placeholder';
  }

  private async analyzeImage(imageUrl: string): Promise<string[]> {
    // Implement image analysis to detect objects
    // This would integrate with computer vision services
    return ['object1', 'object2'];
  }

  private async logSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      await this.prisma.searchAnalytics.create({
        data: analytics,
      });
    } catch (error) {
      this.logger.error('Error logging search analytics:', error);
    }
  }
}
