import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common';
import { VideoProcessorService } from './video-processor.service';
import { SecureAuthService } from '../auth/secure-auth.service';

@Controller('video')
export class VideoController {
  constructor(
    private readonly videoProcessorService: VideoProcessorService,
    private readonly authService: SecureAuthService,
  ) {}

  @Post('process')
  async processVideo(
    @Body('contentId') contentId: string,
    @Body('inputPath') inputPath: string,
  ) {
    if (!contentId || !inputPath) {
      throw new BadRequestException('contentId and inputPath are required');
    }
    await this.videoProcessorService.queueVideoProcessing(contentId, inputPath);
    return {
      message: 'Video processing queued successfully',
      contentId,
    };
  }

  @Get('qualities')
  getQualities() {
    return this.videoProcessorService.getQualityPresets();
  }

  @Post('token')
  async generateToken(
    @Body('videoId') videoId: string,
    @Body('userId') userId: string,
    @Body('isPremium') isPremium?: boolean,
  ) {
    if (!videoId || !userId) {
      throw new BadRequestException('videoId and userId are required');
    }
    const token = await this.authService.generateVideoToken(videoId, userId, !!isPremium);
    return { token };
  }
}
