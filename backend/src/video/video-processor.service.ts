import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';

export interface VideoProcessingJob {
  contentId: string;
  inputPath: string;
  outputDir: string;
  qualities: VideoQuality[];
}

export interface VideoQuality {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  audioBitrate: string;
}

@Injectable()
export class VideoProcessorService {
  private readonly logger = new Logger(VideoProcessorService.name);
  private readonly ffmpegPath: string;

  // Standard quality presets
  private readonly qualityPresets: VideoQuality[] = [
    { name: '240p', width: 426, height: 240, bitrate: '400k', audioBitrate: '64k' },
    { name: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' },
    { name: '480p', width: 854, height: 480, bitrate: '1200k', audioBitrate: '128k' },
    { name: '720p', width: 1280, height: 720, bitrate: '2500k', audioBitrate: '192k' },
    { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '256k' },
    { name: '1440p', width: 2560, height: 1440, bitrate: '10000k', audioBitrate: '320k' },
    { name: '4K', width: 3840, height: 2160, bitrate: '20000k', audioBitrate: '320k' },
  ];

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @InjectQueue('video-processing') private videoQueue: Queue,
  ) {
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH') || 'ffmpeg';
    ffmpeg.setFfmpegPath(this.ffmpegPath);
  }

  async processVideo(job: VideoProcessingJob): Promise<void> {
    this.logger.log(`Starting video processing for content: ${job.contentId}`);

    try {
      // Update content status to processing
      await this.prisma.content.update({
        where: { id: job.contentId },
        data: { isPublished: false },
      });

      // Create output directory
      if (!fs.existsSync(job.outputDir)) {
        fs.mkdirSync(job.outputDir, { recursive: true });
      }

      // Get video metadata
      const metadata = await this.getVideoMetadata(job.inputPath);
      this.logger.log(`Video metadata: ${JSON.stringify(metadata)}`);

      // Generate thumbnail
      await this.generateThumbnail(job.inputPath, job.outputDir);

      // Process each quality
      const processedQualities = [];
      for (const quality of job.qualities) {
        try {
          const outputPath = await this.transcodeVideo(
            job.inputPath,
            job.outputDir,
            quality,
            metadata
          );
          processedQualities.push({
            quality: quality.name,
            resolution: `${quality.width}x${quality.height}`,
            bitrate: parseInt(quality.bitrate.replace('k', '')) * 1000,
            url: outputPath,
          });
        } catch (error) {
          this.logger.error(`Failed to process quality ${quality.name}:`, error);
        }
      }

      // Generate HLS playlist
      await this.generateHLSPlaylist(job.outputDir, processedQualities);

      // Generate DASH manifest
      await this.generateDASHManifest(job.outputDir, processedQualities);

      // Update database with processed video information
      await this.updateContentWithProcessedVideo(job.contentId, processedQualities, metadata);

      this.logger.log(`Video processing completed for content: ${job.contentId}`);
    } catch (error) {
      this.logger.error(`Video processing failed for content: ${job.contentId}`, error);
      throw error;
    }
  }

  private async getVideoMetadata(inputPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  private async generateThumbnail(inputPath: string, outputDir: string): Promise<string> {
    const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['10%', '25%', '50%', '75%'],
          filename: 'thumbnail-%i.jpg',
          folder: outputDir,
          size: '1280x720',
        })
        .on('end', () => {
          this.logger.log('Thumbnails generated successfully');
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          this.logger.error('Thumbnail generation failed:', err);
          reject(err);
        });
    });
  }

  private async transcodeVideo(
    inputPath: string,
    outputDir: string,
    quality: VideoQuality,
    metadata: any
  ): Promise<string> {
    const outputPath = path.join(outputDir, `${quality.name}.mp4`);

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(quality.bitrate)
        .audioBitrate(quality.audioBitrate)
        .size(`${quality.width}x${quality.height}`)
        .aspect('16:9')
        .autopad()
        .format('mp4')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-maxrate ' + quality.bitrate,
          '-bufsize ' + (parseInt(quality.bitrate.replace('k', '')) * 2) + 'k',
          '-movflags +faststart',
          '-profile:v baseline',
          '-level 3.0',
        ]);

      // Add subtitle burning if available
      if (metadata.streams?.some((stream: any) => stream.codec_type === 'subtitle')) {
        command = command.outputOptions(['-vf', 'subtitles=' + inputPath]);
      }

      command
        .output(outputPath)
        .on('start', (commandLine) => {
          this.logger.log(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          this.logger.log(`Processing ${quality.name}: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          this.logger.log(`Transcoding completed for ${quality.name}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          this.logger.error(`Transcoding failed for ${quality.name}:`, err);
          reject(err);
        })
        .run();
    });
  }

  private async generateHLSPlaylist(outputDir: string, qualities: any[]): Promise<void> {
    const playlistPath = path.join(outputDir, 'playlist.m3u8');
    
    // Generate master playlist
    let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    
    for (const quality of qualities) {
      const segmentDir = path.join(outputDir, `${quality.quality}_segments`);
      if (!fs.existsSync(segmentDir)) {
        fs.mkdirSync(segmentDir, { recursive: true });
      }

      // Generate segments for each quality
      await this.generateHLSSegments(quality.url, segmentDir, quality.quality);
      
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bitrate},RESOLUTION=${quality.resolution}\n`;
      masterPlaylist += `${quality.quality}_segments/playlist.m3u8\n\n`;
    }

    fs.writeFileSync(playlistPath, masterPlaylist);
    this.logger.log('HLS master playlist generated');
  }

  private async generateHLSSegments(inputPath: string, outputDir: string, quality: string): Promise<void> {
    const playlistPath = path.join(outputDir, 'playlist.m3u8');
    const segmentPattern = path.join(outputDir, `segment_%03d.ts`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c copy',
          '-f hls',
          '-hls_time 6',
          '-hls_playlist_type vod',
          '-hls_segment_filename ' + segmentPattern,
        ])
        .output(playlistPath)
        .on('end', () => {
          this.logger.log(`HLS segments generated for ${quality}`);
          resolve();
        })
        .on('error', (err) => {
          this.logger.error(`HLS segment generation failed for ${quality}:`, err);
          reject(err);
        })
        .run();
    });
  }

  private async generateDASHManifest(outputDir: string, qualities: any[]): Promise<void> {
    // DASH manifest generation would be implemented here
    // This is a simplified version - in production, use MP4Box or similar tools
    const manifestPath = path.join(outputDir, 'manifest.mpd');
    
    let manifest = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT0H0M0S" profiles="urn:mpeg:dash:profile:isoff-live:2011">
  <Period>
    <AdaptationSet mimeType="video/mp4" codecs="avc1.42E01E">`;

    for (const quality of qualities) {
      manifest += `
      <Representation id="${quality.quality}" bandwidth="${quality.bitrate}" width="${quality.resolution.split('x')[0]}" height="${quality.resolution.split('x')[1]}">
        <BaseURL>${quality.quality}.mp4</BaseURL>
      </Representation>`;
    }

    manifest += `
    </AdaptationSet>
  </Period>
</MPD>`;

    fs.writeFileSync(manifestPath, manifest);
    this.logger.log('DASH manifest generated');
  }

  private async updateContentWithProcessedVideo(
    contentId: string,
    qualities: any[],
    metadata: any
  ): Promise<void> {
    try {
      // Update content with video information
      await this.prisma.content.update({
        where: { id: contentId },
        data: {
          duration: Math.round(metadata.format.duration),
          isPublished: true,
        },
      });

      // Delete existing quality levels
      await this.prisma.qualityLevel.deleteMany({
        where: { contentId },
      });

      // Create new quality levels
      for (const quality of qualities) {
        await this.prisma.qualityLevel.create({
          data: {
            contentId,
            quality: quality.quality,
            resolution: quality.resolution,
            bitrate: quality.bitrate,
            url: quality.url,
          },
        });
      }

      this.logger.log(`Database updated for content: ${contentId}`);
    } catch (error) {
      this.logger.error(`Database update failed for content: ${contentId}`, error);
      throw error;
    }
  }

  async queueVideoProcessing(contentId: string, inputPath: string): Promise<void> {
    const outputDir = path.join(
      this.configService.get<string>('VIDEO_OUTPUT_PATH') || './public/videos',
      contentId
    );

    const job: VideoProcessingJob = {
      contentId,
      inputPath,
      outputDir,
      qualities: this.qualityPresets.slice(0, 5), // Process up to 1080p by default
    };

    await this.videoQueue.add('process-video', job, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    });

    this.logger.log(`Video processing job queued for content: ${contentId}`);
  }

  getQualityPresets(): VideoQuality[] {
    return this.qualityPresets;
  }
}
