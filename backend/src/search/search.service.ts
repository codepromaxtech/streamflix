import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { PrismaService } from '../prisma/prisma.service';
import { Content } from '@prisma/client';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: string;
  genre: string[];
  rating: number;
  releaseDate: string;
  thumbnail: string;
  score: number;
}

export interface SearchFilters {
  type?: string[];
  genre?: string[];
  rating?: { min?: number; max?: number };
  releaseYear?: { min?: number; max?: number };
  duration?: { min?: number; max?: number };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'streaming_content';

  constructor(
    private readonly elasticsearch: ElasticsearchService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initializeIndex();
  }

  private async initializeIndex(): Promise<void> {
    try {
      const indexExists = await this.elasticsearch.indices.exists({
        index: this.indexName,
      });

      if (!indexExists) {
        await this.createIndex();
        await this.indexAllContent();
      }
    } catch (error) {
      this.logger.error('Failed to initialize search index:', error);
    }
  }

  private async createIndex(): Promise<void> {
    const mapping = {
      properties: {
        title: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' },
            suggest: {
              type: 'completion',
              analyzer: 'simple',
            },
          },
        },
        description: {
          type: 'text',
          analyzer: 'standard',
        },
        type: {
          type: 'keyword',
        },
        genre: {
          type: 'keyword',
        },
        cast: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        director: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        rating: {
          type: 'float',
        },
        releaseDate: {
          type: 'date',
        },
        duration: {
          type: 'integer',
        },
        language: {
          type: 'keyword',
        },
        isExclusive: {
          type: 'boolean',
        },
        isPremium: {
          type: 'boolean',
        },
        tags: {
          type: 'keyword',
        },
        createdAt: {
          type: 'date',
        },
        updatedAt: {
          type: 'date',
        },
      },
    };

    await this.elasticsearch.indices.create({
      index: this.indexName,
      body: {
        settings: {
          analysis: {
            analyzer: {
              content_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'stemmer'],
              },
            },
          },
        },
        mappings: mapping,
      },
    });

    this.logger.log('Search index created successfully');
  }

  async indexContent(content: Content & { genres?: any[]; cast?: any[]; crew?: any[] }): Promise<void> {
    try {
      const document = {
        title: content.title,
        description: content.description,
        type: content.type,
        genre: content.genres?.map(g => g.genre.name) || [],
        cast: content.cast?.map(c => c.person.name) || [],
        director: content.crew?.filter(c => c.role === 'director').map(c => c.person.name) || [],
        rating: content.rating,
        releaseDate: content.releaseDate,
        duration: content.duration,
        language: content.language,
        isExclusive: content.isExclusive,
        isPremium: content.isPremium,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
      };

      await this.elasticsearch.index({
        index: this.indexName,
        id: content.id,
        body: document,
      });

      this.logger.log(`Content indexed: ${content.title}`);
    } catch (error) {
      this.logger.error(`Failed to index content ${content.id}:`, error);
    }
  }

  async indexAllContent(): Promise<void> {
    try {
      const content = await this.prisma.content.findMany({
        where: { isPublished: true },
        include: {
          genres: {
            include: { genre: true },
          },
          cast: {
            include: { person: true },
          },
          crew: {
            include: { person: true },
          },
        },
      });

      for (const item of content) {
        await this.indexContent(item);
      }

      this.logger.log(`Indexed ${content.length} content items`);
    } catch (error) {
      this.logger.error('Failed to index all content:', error);
    }
  }

  async search(
    query: string,
    filters: SearchFilters = {},
    limit = 20,
    offset = 0,
  ): Promise<{ results: SearchResult[]; total: number }> {
    try {
      const mustClauses: any[] = [];
      const filterClauses: any[] = [];

      // Text search
      if (query) {
        mustClauses.push({
          multi_match: {
            query,
            fields: [
              'title^3',
              'description^2',
              'cast^2',
              'director^2',
              'genre',
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      } else {
        mustClauses.push({ match_all: {} });
      }

      // Type filter
      if (filters.type && filters.type.length > 0) {
        filterClauses.push({
          terms: { type: filters.type },
        });
      }

      // Genre filter
      if (filters.genre && filters.genre.length > 0) {
        filterClauses.push({
          terms: { genre: filters.genre },
        });
      }

      // Rating filter
      if (filters.rating) {
        const ratingRange: any = {};
        if (filters.rating.min !== undefined) ratingRange.gte = filters.rating.min;
        if (filters.rating.max !== undefined) ratingRange.lte = filters.rating.max;
        
        if (Object.keys(ratingRange).length > 0) {
          filterClauses.push({
            range: { rating: ratingRange },
          });
        }
      }

      // Release year filter
      if (filters.releaseYear) {
        const yearRange: any = {};
        if (filters.releaseYear.min !== undefined) {
          yearRange.gte = `${filters.releaseYear.min}-01-01`;
        }
        if (filters.releaseYear.max !== undefined) {
          yearRange.lte = `${filters.releaseYear.max}-12-31`;
        }
        
        if (Object.keys(yearRange).length > 0) {
          filterClauses.push({
            range: { releaseDate: yearRange },
          });
        }
      }

      // Duration filter
      if (filters.duration) {
        const durationRange: any = {};
        if (filters.duration.min !== undefined) durationRange.gte = filters.duration.min;
        if (filters.duration.max !== undefined) durationRange.lte = filters.duration.max;
        
        if (Object.keys(durationRange).length > 0) {
          filterClauses.push({
            range: { duration: durationRange },
          });
        }
      }

      const searchBody = {
        query: {
          bool: {
            must: mustClauses,
            filter: filterClauses,
          },
        },
        sort: [
          { _score: { order: 'desc' } },
          { rating: { order: 'desc' } },
          { releaseDate: { order: 'desc' } },
        ],
        from: offset,
        size: limit,
        highlight: {
          fields: {
            title: {},
            description: {},
          },
        },
      };

      const response = await this.elasticsearch.search({
        index: this.indexName,
        body: searchBody,
      });

      const results: SearchResult[] = response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        title: hit._source.title,
        description: hit._source.description,
        type: hit._source.type,
        genre: hit._source.genre,
        rating: hit._source.rating,
        releaseDate: hit._source.releaseDate,
        thumbnail: `/images/${hit._id}-thumb.jpg`, // Construct thumbnail URL
        score: hit._score,
      }));

      return {
        results,
        total: response.body.hits.total.value,
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      return { results: [], total: 0 };
    }
  }

  async getSuggestions(query: string, limit = 10): Promise<string[]> {
    try {
      const response = await this.elasticsearch.search({
        index: this.indexName,
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size: limit,
              },
            },
          },
        },
      });

      return response.body.suggest.title_suggest[0].options.map(
        (option: any) => option.text,
      );
    } catch (error) {
      this.logger.error('Suggestions failed:', error);
      return [];
    }
  }

  async getPopularSearches(limit = 10): Promise<string[]> {
    // This would typically be stored in Redis with search counts
    // For now, return static popular searches
    return [
      'action movies',
      'comedy series',
      'documentary',
      'thriller',
      'romance',
      'sci-fi',
      'horror',
      'drama',
      'adventure',
      'fantasy',
    ].slice(0, limit);
  }

  async deleteContent(contentId: string): Promise<void> {
    try {
      await this.elasticsearch.delete({
        index: this.indexName,
        id: contentId,
      });

      this.logger.log(`Content removed from index: ${contentId}`);
    } catch (error) {
      this.logger.error(`Failed to remove content from index: ${contentId}`, error);
    }
  }

  async updateContent(content: Content & { genres?: any[]; cast?: any[]; crew?: any[] }): Promise<void> {
    await this.indexContent(content);
  }

  async getAggregations(): Promise<any> {
    try {
      const response = await this.elasticsearch.search({
        index: this.indexName,
        body: {
          size: 0,
          aggs: {
            types: {
              terms: { field: 'type' },
            },
            genres: {
              terms: { field: 'genre', size: 20 },
            },
            languages: {
              terms: { field: 'language' },
            },
            release_years: {
              date_histogram: {
                field: 'releaseDate',
                calendar_interval: 'year',
              },
            },
            rating_ranges: {
              histogram: {
                field: 'rating',
                interval: 1,
              },
            },
          },
        },
      });

      return response.body.aggregations;
    } catch (error) {
      this.logger.error('Failed to get aggregations:', error);
      return {};
    }
  }
}
