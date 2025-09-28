import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as WebSocket from 'ws';
import * as ffmpeg from 'fluent-ffmpeg';

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  streamerId: string;
  streamKey: string;
  rtmpUrl: string;
  hlsUrl: string;
  status: 'preparing' | 'live' | 'ended' | 'error';
  viewerCount: number;
  startTime?: Date;
  endTime?: Date;
  thumbnailUrl?: string;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  maxViewers?: number;
  category?: string;
  tags?: string[];
}

interface StreamViewer {
  id: string;
  userId?: string;
  streamId: string;
  joinedAt: Date;
  lastSeen: Date;
  userAgent?: string;
  ipAddress?: string;
}

interface ChatMessage {
  id: string;
  streamId: string;
  userId?: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'join' | 'leave' | 'system';
  metadata?: any;
}

@Injectable()
export class LiveStreamingService {
  private readonly logger = new Logger(LiveStreamingService.name);
  private activeStreams: Map<string, LiveStream> = new Map();
  private streamViewers: Map<string, Set<StreamViewer>> = new Map();
  private chatConnections: Map<string, WebSocket[]> = new Map();
  private rtmpServer: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeRTMPServer();
    this.startViewerCountUpdater();
  }

  private async initializeRTMPServer(): Promise<void> {
    try {
      // Initialize RTMP server for receiving live streams
      // This would typically use a library like node-media-server
      this.logger.log('RTMP server initialized');
    } catch (error) {
      this.logger.error('Failed to initialize RTMP server:', error);
    }
  }

  async createLiveStream(
    streamerId: string,
    title: string,
    description?: string,
    options?: {
      chatEnabled?: boolean;
      recordingEnabled?: boolean;
      maxViewers?: number;
      category?: string;
      tags?: string[];
    },
  ): Promise<LiveStream> {
    try {
      // Generate unique stream key and URLs
      const streamKey = this.generateStreamKey();
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const rtmpUrl = `${this.configService.get('RTMP_SERVER_URL')}/${streamKey}`;
      const hlsUrl = `${this.configService.get('HLS_SERVER_URL')}/${streamId}/playlist.m3u8`;

      const liveStream: LiveStream = {
        id: streamId,
        title,
        description,
        streamerId,
        streamKey,
        rtmpUrl,
        hlsUrl,
        status: 'preparing',
        viewerCount: 0,
        chatEnabled: options?.chatEnabled ?? true,
        recordingEnabled: options?.recordingEnabled ?? false,
        maxViewers: options?.maxViewers,
        category: options?.category,
        tags: options?.tags,
      };

      // Save to database
      await this.prisma.liveStream.create({
        data: {
          id: streamId,
          title,
          description,
          streamerId,
          streamKey,
          rtmpUrl,
          hlsUrl,
          status: 'preparing',
          chatEnabled: liveStream.chatEnabled,
          recordingEnabled: liveStream.recordingEnabled,
          maxViewers: liveStream.maxViewers,
          category: liveStream.category,
          tags: liveStream.tags,
        },
      });

      // Store in memory
      this.activeStreams.set(streamId, liveStream);
      this.streamViewers.set(streamId, new Set());
      this.chatConnections.set(streamId, []);

      this.logger.log(`Live stream created: ${streamId} by user ${streamerId}`);
      
      // Emit event for real-time notifications
      this.eventEmitter.emit('stream.created', liveStream);

      return liveStream;
    } catch (error) {
      this.logger.error('Error creating live stream:', error);
      throw new BadRequestException('Failed to create live stream');
    }
  }

  async startStream(streamId: string, streamerId: string): Promise<void> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream || stream.streamerId !== streamerId) {
        throw new BadRequestException('Stream not found or unauthorized');
      }

      // Update stream status
      stream.status = 'live';
      stream.startTime = new Date();

      // Update database
      await this.prisma.liveStream.update({
        where: { id: streamId },
        data: {
          status: 'live',
          startTime: stream.startTime,
        },
      });

      // Start HLS transcoding
      await this.startHLSTranscoding(stream);

      // Start recording if enabled
      if (stream.recordingEnabled) {
        await this.startRecording(stream);
      }

      this.logger.log(`Stream started: ${streamId}`);
      
      // Emit event for real-time notifications
      this.eventEmitter.emit('stream.started', stream);

      // Notify followers/subscribers
      await this.notifyStreamStart(stream);
    } catch (error) {
      this.logger.error('Error starting stream:', error);
      throw new BadRequestException('Failed to start stream');
    }
  }

  async endStream(streamId: string, streamerId: string): Promise<void> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream || stream.streamerId !== streamerId) {
        throw new BadRequestException('Stream not found or unauthorized');
      }

      // Update stream status
      stream.status = 'ended';
      stream.endTime = new Date();

      // Update database
      await this.prisma.liveStream.update({
        where: { id: streamId },
        data: {
          status: 'ended',
          endTime: stream.endTime,
          finalViewerCount: stream.viewerCount,
        },
      });

      // Stop transcoding and recording
      await this.stopHLSTranscoding(streamId);
      if (stream.recordingEnabled) {
        await this.stopRecording(streamId);
      }

      // Disconnect all viewers
      await this.disconnectAllViewers(streamId);

      // Clean up memory
      this.activeStreams.delete(streamId);
      this.streamViewers.delete(streamId);
      this.chatConnections.delete(streamId);

      this.logger.log(`Stream ended: ${streamId}`);
      
      // Emit event for real-time notifications
      this.eventEmitter.emit('stream.ended', stream);
    } catch (error) {
      this.logger.error('Error ending stream:', error);
      throw new BadRequestException('Failed to end stream');
    }
  }

  async joinStream(streamId: string, userId?: string, metadata?: any): Promise<StreamViewer> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream) {
        throw new BadRequestException('Stream not found');
      }

      if (stream.status !== 'live') {
        throw new BadRequestException('Stream is not live');
      }

      // Check viewer limit
      if (stream.maxViewers && stream.viewerCount >= stream.maxViewers) {
        throw new BadRequestException('Stream has reached maximum viewer capacity');
      }

      const viewer: StreamViewer = {
        id: `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        streamId,
        joinedAt: new Date(),
        lastSeen: new Date(),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      };

      // Add viewer to stream
      const viewers = this.streamViewers.get(streamId);
      viewers.add(viewer);

      // Update viewer count
      stream.viewerCount = viewers.size;

      // Update database
      await this.prisma.streamViewer.create({
        data: {
          id: viewer.id,
          userId: viewer.userId,
          streamId: viewer.streamId,
          joinedAt: viewer.joinedAt,
          userAgent: viewer.userAgent,
          ipAddress: viewer.ipAddress,
        },
      });

      // Emit viewer joined event
      this.eventEmitter.emit('viewer.joined', { stream, viewer });

      // Send chat message if chat is enabled
      if (stream.chatEnabled && userId) {
        await this.sendSystemChatMessage(streamId, `${metadata?.username || 'Anonymous'} joined the stream`);
      }

      this.logger.log(`Viewer ${viewer.id} joined stream ${streamId}`);

      return viewer;
    } catch (error) {
      this.logger.error('Error joining stream:', error);
      throw new BadRequestException('Failed to join stream');
    }
  }

  async leaveStream(streamId: string, viewerId: string): Promise<void> {
    try {
      const viewers = this.streamViewers.get(streamId);
      if (!viewers) {
        return;
      }

      // Find and remove viewer
      const viewer = Array.from(viewers).find(v => v.id === viewerId);
      if (viewer) {
        viewers.delete(viewer);

        // Update stream viewer count
        const stream = this.activeStreams.get(streamId);
        if (stream) {
          stream.viewerCount = viewers.size;
        }

        // Update database
        await this.prisma.streamViewer.update({
          where: { id: viewerId },
          data: { leftAt: new Date() },
        });

        // Emit viewer left event
        this.eventEmitter.emit('viewer.left', { stream, viewer });

        this.logger.log(`Viewer ${viewerId} left stream ${streamId}`);
      }
    } catch (error) {
      this.logger.error('Error leaving stream:', error);
    }
  }

  async sendChatMessage(
    streamId: string,
    userId: string,
    message: string,
    username: string,
  ): Promise<ChatMessage> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream || !stream.chatEnabled) {
        throw new BadRequestException('Chat not available for this stream');
      }

      // Validate message
      if (!message.trim() || message.length > 500) {
        throw new BadRequestException('Invalid message');
      }

      // Check if user is not banned/muted
      await this.validateChatPermissions(streamId, userId);

      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamId,
        userId,
        username,
        message: message.trim(),
        timestamp: new Date(),
        type: 'message',
      };

      // Save to database
      await this.prisma.chatMessage.create({
        data: {
          id: chatMessage.id,
          streamId: chatMessage.streamId,
          userId: chatMessage.userId,
          username: chatMessage.username,
          message: chatMessage.message,
          timestamp: chatMessage.timestamp,
          type: chatMessage.type,
        },
      });

      // Broadcast to all connected clients
      await this.broadcastChatMessage(streamId, chatMessage);

      return chatMessage;
    } catch (error) {
      this.logger.error('Error sending chat message:', error);
      throw new BadRequestException('Failed to send chat message');
    }
  }

  async getStreamAnalytics(streamId: string, streamerId: string): Promise<any> {
    try {
      const stream = await this.prisma.liveStream.findUnique({
        where: { id: streamId },
        include: {
          _count: {
            select: {
              viewers: true,
              chatMessages: true,
            },
          },
        },
      });

      if (!stream || stream.streamerId !== streamerId) {
        throw new BadRequestException('Stream not found or unauthorized');
      }

      // Get detailed analytics
      const analytics = {
        streamInfo: {
          id: stream.id,
          title: stream.title,
          status: stream.status,
          startTime: stream.startTime,
          endTime: stream.endTime,
          duration: stream.endTime && stream.startTime 
            ? stream.endTime.getTime() - stream.startTime.getTime() 
            : null,
        },
        viewerStats: {
          totalViewers: stream._count.viewers,
          peakViewers: stream.peakViewerCount || 0,
          currentViewers: this.activeStreams.get(streamId)?.viewerCount || 0,
          averageWatchTime: await this.calculateAverageWatchTime(streamId),
        },
        chatStats: {
          totalMessages: stream._count.chatMessages,
          messagesPerMinute: await this.calculateMessagesPerMinute(streamId),
        },
        engagement: {
          chatParticipation: await this.calculateChatParticipation(streamId),
          viewerRetention: await this.calculateViewerRetention(streamId),
        },
      };

      return analytics;
    } catch (error) {
      this.logger.error('Error getting stream analytics:', error);
      throw new BadRequestException('Failed to get stream analytics');
    }
  }

  private generateStreamKey(): string {
    return `sk_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private async startHLSTranscoding(stream: LiveStream): Promise<void> {
    try {
      // Start FFmpeg process to transcode RTMP to HLS
      const outputPath = `/tmp/hls/${stream.id}`;
      
      ffmpeg(stream.rtmpUrl)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-f hls',
          '-hls_time 6',
          '-hls_list_size 10',
          '-hls_flags delete_segments',
          `-hls_segment_filename ${outputPath}/segment_%03d.ts`,
        ])
        .output(`${outputPath}/playlist.m3u8`)
        .on('start', () => {
          this.logger.log(`HLS transcoding started for stream ${stream.id}`);
        })
        .on('error', (error) => {
          this.logger.error(`HLS transcoding error for stream ${stream.id}:`, error);
        })
        .run();
    } catch (error) {
      this.logger.error('Error starting HLS transcoding:', error);
    }
  }

  private async stopHLSTranscoding(streamId: string): Promise<void> {
    try {
      // Stop FFmpeg process
      // Implementation depends on how processes are tracked
      this.logger.log(`HLS transcoding stopped for stream ${streamId}`);
    } catch (error) {
      this.logger.error('Error stopping HLS transcoding:', error);
    }
  }

  private async startRecording(stream: LiveStream): Promise<void> {
    try {
      // Start recording the stream
      const recordingPath = `/recordings/${stream.id}_${Date.now()}.mp4`;
      
      ffmpeg(stream.rtmpUrl)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-preset fast',
        ])
        .output(recordingPath)
        .on('start', () => {
          this.logger.log(`Recording started for stream ${stream.id}`);
        })
        .on('end', () => {
          this.logger.log(`Recording completed for stream ${stream.id}`);
          // Process recorded file (upload to storage, create VOD, etc.)
        })
        .on('error', (error) => {
          this.logger.error(`Recording error for stream ${stream.id}:`, error);
        })
        .run();
    } catch (error) {
      this.logger.error('Error starting recording:', error);
    }
  }

  private async stopRecording(streamId: string): Promise<void> {
    try {
      // Stop recording process
      this.logger.log(`Recording stopped for stream ${streamId}`);
    } catch (error) {
      this.logger.error('Error stopping recording:', error);
    }
  }

  private async disconnectAllViewers(streamId: string): Promise<void> {
    try {
      const viewers = this.streamViewers.get(streamId);
      if (viewers) {
        for (const viewer of viewers) {
          await this.leaveStream(streamId, viewer.id);
        }
      }

      // Close all chat connections
      const chatConnections = this.chatConnections.get(streamId);
      if (chatConnections) {
        chatConnections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      }
    } catch (error) {
      this.logger.error('Error disconnecting viewers:', error);
    }
  }

  private async notifyStreamStart(stream: LiveStream): Promise<void> {
    try {
      // Notify followers/subscribers about stream start
      // This would typically involve push notifications, emails, etc.
      this.logger.log(`Notifying followers about stream start: ${stream.id}`);
    } catch (error) {
      this.logger.error('Error notifying stream start:', error);
    }
  }

  private async validateChatPermissions(streamId: string, userId: string): Promise<void> {
    // Check if user is banned or muted in this stream
    // Implementation would check database for bans/mutes
  }

  private async sendSystemChatMessage(streamId: string, message: string): Promise<void> {
    const systemMessage: ChatMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      streamId,
      username: 'System',
      message,
      timestamp: new Date(),
      type: 'system',
    };

    await this.broadcastChatMessage(streamId, systemMessage);
  }

  private async broadcastChatMessage(streamId: string, message: ChatMessage): Promise<void> {
    const connections = this.chatConnections.get(streamId);
    if (connections) {
      const messageData = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageData);
        }
      });
    }
  }

  private async calculateAverageWatchTime(streamId: string): Promise<number> {
    // Calculate average watch time from viewer data
    return 0; // Placeholder
  }

  private async calculateMessagesPerMinute(streamId: string): Promise<number> {
    // Calculate messages per minute from chat data
    return 0; // Placeholder
  }

  private async calculateChatParticipation(streamId: string): Promise<number> {
    // Calculate percentage of viewers who participated in chat
    return 0; // Placeholder
  }

  private async calculateViewerRetention(streamId: string): Promise<number> {
    // Calculate viewer retention rate
    return 0; // Placeholder
  }

  private startViewerCountUpdater(): void {
    // Update viewer counts periodically
    setInterval(() => {
      this.updateViewerCounts();
    }, 30000); // Update every 30 seconds
  }

  private async updateViewerCounts(): Promise<void> {
    try {
      for (const [streamId, stream] of this.activeStreams) {
        if (stream.status === 'live') {
          const viewers = this.streamViewers.get(streamId);
          if (viewers) {
            stream.viewerCount = viewers.size;
            
            // Update peak viewer count
            await this.prisma.liveStream.update({
              where: { id: streamId },
              data: {
                currentViewerCount: stream.viewerCount,
                peakViewerCount: {
                  set: Math.max(stream.viewerCount, 0),
                },
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error updating viewer counts:', error);
    }
  }
}
