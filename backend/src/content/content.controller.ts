import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('isTrending') isTrending?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.contentService.findAll({
      type,
      genreId: categoryId,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      isTrending: isTrending !== undefined ? isTrending === 'true' : undefined,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('featured')
  async getFeatured() {
    return this.contentService.getFeatured();
  }

  @Get('trending')
  async getTrending() {
    return this.contentService.getTrending();
  }

  @Get('categories')
  async getCategories() {
    return this.contentService.getGenres();
  }

  @Get('genres')
  async getGenres() {
    return this.contentService.getGenres();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/watch-history')
  async recordWatchHistory(
    @Param('id') contentId: string,
    @CurrentUser() user: any,
    @Body('progress') progress: number,
  ) {
    return this.contentService.recordWatchHistory(
      user.id,
      contentId,
      Number(progress) || 0,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/favorite')
  async toggleFavorite(
    @Param('id') contentId: string,
    @CurrentUser() user: any,
  ) {
    return this.contentService.toggleFavorite(user.id, contentId);
  }
}
