import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getUsers(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
      search,
    );
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.adminService.updateUserRole(id, role);
  }

  @Patch('users/:id/status')
  async toggleUserStatus(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }

  @Get('content')
  async getContent(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getContent(
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
      search,
    );
  }

  @Post('content')
  async createContent(@Body() data: any) {
    return this.adminService.createContent(data);
  }

  @Patch('content/:id/status')
  async toggleContentPublish(@Param('id') id: string) {
    return this.adminService.toggleContentPublish(id);
  }

  @Delete('content/:id')
  async deleteContent(@Param('id') id: string) {
    return this.adminService.deleteContent(id);
  }

  @Put('content/:id')
  async updateContent(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.adminService.updateContent(id, data);
  }

  @Patch('content/:id')
  async patchContent(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.adminService.updateContent(id, data);
  }

  // --- Scraper / Ingestion Management Endpoints ---

  @Get('scraper/status')
  getScraperStatus() {
    return this.adminService.getScraperStatus();
  }

  @Get('scraper/sources')
  getScraperSources() {
    return this.adminService.getScraperSources();
  }

  @Post('scraper/sources/:id/toggle')
  toggleScraperSource(@Param('id') id: string) {
    return this.adminService.toggleScraperSource(id);
  }

  @Get('scraper/jobs')
  getScraperJobs() {
    return this.adminService.getScraperJobs();
  }

  @Get('scraper/autorun')
  getAutoRunStatus() {
    return this.adminService.getAutoRunStatus();
  }

  @Post('scraper/autorun/toggle')
  toggleAutoRun() {
    return this.adminService.toggleAutoRun();
  }

  @Post('scraper/batch-crawl')
  async batchCrawl() {
    return this.adminService.batchCrawlAllSources();
  }

  @Post('scraper/trigger')
  async triggerScrape(
    @Body('query') query?: string,
    @Body('sourceId') sourceId?: string,
  ) {
    return this.adminService.triggerScrape(query, sourceId);
  }
}


