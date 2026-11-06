import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { IptvService } from './iptv.service';

@Controller('iptv')
export class IptvController {
  constructor(private readonly iptvService: IptvService) {}

  @Get('channels')
  getChannels(
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('peering') peering?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('all') all?: string,
  ) {
    return this.iptvService.getChannels({
      country,
      category,
      peering,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 100,
      all,
    });
  }

  @Get('categories')
  getCategories() {
    return this.iptvService.getCategories();
  }

  @Get('countries')
  getCountries() {
    return this.iptvService.getCountries();
  }

  @Get('peering-nodes')
  getPeeringNodes(@Query('all') all?: string) {
    return this.iptvService.getPeeringNodes(all === 'true');
  }

  @Post('peering-nodes')
  createPeeringNode(@Body() data: any) {
    if (!data.name || !data.region) {
      throw new BadRequestException('Name and region are required for peering node');
    }
    return this.iptvService.createPeeringNode(data);
  }

  @Put('peering-nodes/:id')
  updatePeeringNode(@Param('id') id: string, @Body() data: any) {
    return this.iptvService.updatePeeringNode(id, data);
  }

  @Delete('peering-nodes/:id')
  deletePeeringNode(@Param('id') id: string) {
    return this.iptvService.deletePeeringNode(id);
  }

  @Get('channels/:id')
  getChannelById(@Param('id') id: string) {
    return this.iptvService.getChannelById(id);
  }

  @Post('channels')
  createChannel(@Body() data: any) {
    if (!data.name || !data.streamUrl) {
      throw new BadRequestException('Name and streamUrl are required to create an IPTV channel');
    }
    return this.iptvService.createChannel(data);
  }

  @Put('channels/:id')
  updateChannel(@Param('id') id: string, @Body() data: any) {
    return this.iptvService.updateChannel(id, data);
  }

  @Delete('channels/:id')
  deleteChannel(@Param('id') id: string) {
    return this.iptvService.deleteChannel(id);
  }

  @Post('m3u/import')
  importM3u(@Body() body: { url?: string; content?: string }) {
    if (!body.url && !body.content) {
      throw new BadRequestException('Either "url" or "content" is required in request body');
    }
    return this.iptvService.importM3u(body);
  }

  @Post('m3u/parse')
  parseM3uPreview(@Body() body: { content: string }) {
    if (!body.content) {
      throw new BadRequestException('Content is required for M3U preview');
    }
    const channels = this.iptvService.parseM3u(body.content);
    return { channels, total: channels.length };
  }
}
