import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async search(
    @Body('query') query: string,
    @Body('filters') filters?: any,
    @Body('limit') limit?: number,
    @Body('offset') offset?: number,
  ) {
    return this.searchService.search(
      query || '',
      filters,
      limit || 20,
      offset || 0,
    );
  }

  @Get()
  async searchGet(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.search(
      query || '',
      {},
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
    );
  }

  @Get('suggestions')
  async suggestions(@Query('q') query: string) {
    if (!query) return [];
    return this.searchService.getSuggestions(query, 5);
  }
}
