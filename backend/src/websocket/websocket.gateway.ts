import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

interface StreamRoom {
  streamId: string;
  viewers: Set<string>;
  streamer?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'donation' | 'gift';
  metadata?: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private streamRooms: Map<string, StreamRoom> = new Map();
  private userRooms: Map<string, Set<string>> = new Map(); // userId -> Set of room names

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authenticate user
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.log(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          name: true,
          avatar: true,
          isVerified: true,
          role: true,
        },
      });

      if (!user) {
        this.logger.log(`Invalid user for client ${client.id}`);
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.user = user;
      this.connectedUsers.set(user.id, client);
      this.userRooms.set(user.id, new Set());

      // Join user to their personal room for direct notifications
      client.join(`user:${user.id}`);

      this.logger.log(`User ${user.name} (${user.id}) connected via WebSocket`);

      // Send connection confirmation
      client.emit('connected', {
        userId: user.id,
        timestamp: new Date(),
      });

      // Send any pending notifications
      await this.sendPendingNotifications(client);

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Leave all rooms
      const userRooms = this.userRooms.get(client.userId);
      if (userRooms) {
        userRooms.forEach(room => {
          this.leaveRoom(client, room);
        });
      }

      this.connectedUsers.delete(client.userId);
      this.userRooms.delete(client.userId);
      
      this.logger.log(`User ${client.userId} disconnected from WebSocket`);
    }
  }

  // Stream-related events
  @SubscribeMessage('join_stream')
  async handleJoinStream(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { streamId: string },
  ) {
    try {
      if (!client.userId) return;

      const { streamId } = data;
      const roomName = `stream:${streamId}`;

      // Verify stream exists and is live
      const stream = await this.prisma.liveStream.findUnique({
        where: { id: streamId },
        include: {
          streamer: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      if (!stream || stream.status !== 'live') {
        client.emit('error', { message: 'Stream not found or not live' });
        return;
      }

      // Join stream room
      client.join(roomName);
      this.userRooms.get(client.userId)?.add(roomName);

      // Update stream room data
      if (!this.streamRooms.has(streamId)) {
        this.streamRooms.set(streamId, {
          streamId,
          viewers: new Set(),
          streamer: stream.streamerId,
        });
      }

      const streamRoom = this.streamRooms.get(streamId);
      streamRoom.viewers.add(client.userId);

      // Notify room about new viewer
      this.server.to(roomName).emit('viewer_joined', {
        userId: client.userId,
        username: client.user.name,
        viewerCount: streamRoom.viewers.size,
        timestamp: new Date(),
      });

      // Send current stream info to the new viewer
      client.emit('stream_joined', {
        streamId,
        streamer: stream.streamer,
        viewerCount: streamRoom.viewers.size,
        timestamp: new Date(),
      });

      this.logger.log(`User ${client.userId} joined stream ${streamId}`);

    } catch (error) {
      this.logger.error('Error joining stream:', error);
      client.emit('error', { message: 'Failed to join stream' });
    }
  }

  @SubscribeMessage('leave_stream')
  async handleLeaveStream(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { streamId: string },
  ) {
    try {
      if (!client.userId) return;

      const { streamId } = data;
      const roomName = `stream:${streamId}`;

      this.leaveRoom(client, roomName);

      client.emit('stream_left', {
        streamId,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Error leaving stream:', error);
    }
  }

  @SubscribeMessage('send_chat_message')
  async handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { streamId: string; message: string },
  ) {
    try {
      if (!client.userId || !data.message?.trim()) return;

      const { streamId, message } = data;
      const roomName = `stream:${streamId}`;

      // Verify user is in the stream room
      if (!client.rooms.has(roomName)) {
        client.emit('error', { message: 'You must join the stream first' });
        return;
      }

      // Check if user is banned or muted
      const isBanned = await this.checkUserBanned(client.userId, streamId);
      if (isBanned) {
        client.emit('error', { message: 'You are banned from this chat' });
        return;
      }

      // Rate limiting check
      const canSendMessage = await this.checkRateLimit(client.userId, 'chat');
      if (!canSendMessage) {
        client.emit('error', { message: 'You are sending messages too fast' });
        return;
      }

      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: client.userId,
        username: client.user.name,
        message: message.trim(),
        timestamp: new Date(),
        type: 'message',
      };

      // Save message to database
      await this.prisma.chatMessage.create({
        data: {
          id: chatMessage.id,
          streamId,
          userId: client.userId,
          username: client.user.name,
          message: chatMessage.message,
          timestamp: chatMessage.timestamp,
          type: chatMessage.type,
        },
      });

      // Broadcast to all viewers in the stream
      this.server.to(roomName).emit('chat_message', chatMessage);

      this.logger.log(`Chat message sent by ${client.userId} in stream ${streamId}`);

    } catch (error) {
      this.logger.error('Error sending chat message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  // Donation and gift events
  @SubscribeMessage('donation_alert')
  async handleDonationAlert(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    try {
      const { streamId, donation } = data;
      const roomName = `stream:${streamId}`;

      // Verify this is the streamer or admin
      const stream = await this.prisma.liveStream.findUnique({
        where: { id: streamId },
      });

      if (!stream || (stream.streamerId !== client.userId && client.user.role !== 'admin')) {
        return;
      }

      // Broadcast donation alert to all viewers
      this.server.to(roomName).emit('donation_alert', {
        id: donation.id,
        donorName: donation.isAnonymous ? 'Anonymous' : donation.donorName,
        amount: donation.amount,
        currency: donation.currency,
        message: donation.message,
        timestamp: new Date(),
      });

      this.logger.log(`Donation alert sent for stream ${streamId}: $${donation.amount}`);

    } catch (error) {
      this.logger.error('Error sending donation alert:', error);
    }
  }

  @SubscribeMessage('gift_alert')
  async handleGiftAlert(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    try {
      const { streamId, gift } = data;
      const roomName = `stream:${streamId}`;

      // Broadcast gift alert to all viewers
      this.server.to(roomName).emit('gift_alert', {
        id: gift.id,
        senderName: gift.isAnonymous ? 'Anonymous' : gift.senderName,
        giftName: gift.giftName,
        quantity: gift.quantity,
        animation: gift.animationUrl,
        timestamp: new Date(),
      });

      this.logger.log(`Gift alert sent for stream ${streamId}: ${gift.quantity}x ${gift.giftName}`);

    } catch (error) {
      this.logger.error('Error sending gift alert:', error);
    }
  }

  // Notification events
  @SubscribeMessage('mark_notification_read')
  async handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    try {
      if (!client.userId) return;

      await this.prisma.notification.updateMany({
        where: {
          id: data.notificationId,
          userId: client.userId,
        },
        data: { isRead: true },
      });

      client.emit('notification_marked_read', {
        notificationId: data.notificationId,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Error marking notification as read:', error);
    }
  }

  // Admin events
  @SubscribeMessage('moderate_chat')
  async handleModerateChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { streamId: string; action: 'delete' | 'ban' | 'timeout'; targetUserId?: string; messageId?: string },
  ) {
    try {
      if (!client.userId) return;

      // Verify user has moderation permissions
      const hasPermission = await this.checkModerationPermission(client.userId, data.streamId);
      if (!hasPermission) {
        client.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      const roomName = `stream:${data.streamId}`;

      switch (data.action) {
        case 'delete':
          if (data.messageId) {
            this.server.to(roomName).emit('message_deleted', {
              messageId: data.messageId,
              moderatorId: client.userId,
              timestamp: new Date(),
            });
          }
          break;

        case 'ban':
          if (data.targetUserId) {
            // Ban user from chat
            await this.banUserFromStream(data.targetUserId, data.streamId);
            
            this.server.to(roomName).emit('user_banned', {
              userId: data.targetUserId,
              moderatorId: client.userId,
              timestamp: new Date(),
            });
          }
          break;

        case 'timeout':
          if (data.targetUserId) {
            // Timeout user for 10 minutes
            await this.timeoutUser(data.targetUserId, data.streamId, 10);
            
            this.server.to(roomName).emit('user_timeout', {
              userId: data.targetUserId,
              duration: 10,
              moderatorId: client.userId,
              timestamp: new Date(),
            });
          }
          break;
      }

    } catch (error) {
      this.logger.error('Error moderating chat:', error);
    }
  }

  // Public methods for external services
  async sendNotificationToUser(userId: string, notification: any): Promise<void> {
    const client = this.connectedUsers.get(userId);
    if (client) {
      client.emit('notification', notification);
    }
  }

  async broadcastToStream(streamId: string, event: string, data: any): Promise<void> {
    const roomName = `stream:${streamId}`;
    this.server.to(roomName).emit(event, data);
  }

  async updateStreamViewerCount(streamId: string): Promise<void> {
    const streamRoom = this.streamRooms.get(streamId);
    if (streamRoom) {
      const roomName = `stream:${streamId}`;
      this.server.to(roomName).emit('viewer_count_update', {
        viewerCount: streamRoom.viewers.size,
        timestamp: new Date(),
      });
    }
  }

  // Private helper methods
  private leaveRoom(client: AuthenticatedSocket, roomName: string): void {
    client.leave(roomName);
    this.userRooms.get(client.userId)?.delete(roomName);

    // Handle stream room cleanup
    if (roomName.startsWith('stream:')) {
      const streamId = roomName.replace('stream:', '');
      const streamRoom = this.streamRooms.get(streamId);
      
      if (streamRoom && client.userId) {
        streamRoom.viewers.delete(client.userId);
        
        // Notify room about viewer leaving
        this.server.to(roomName).emit('viewer_left', {
          userId: client.userId,
          viewerCount: streamRoom.viewers.size,
          timestamp: new Date(),
        });

        // Clean up empty rooms
        if (streamRoom.viewers.size === 0) {
          this.streamRooms.delete(streamId);
        }
      }
    }
  }

  private async sendPendingNotifications(client: AuthenticatedSocket): Promise<void> {
    try {
      if (!client.userId) return;

      const pendingNotifications = await this.prisma.notification.findMany({
        where: {
          userId: client.userId,
          isRead: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (pendingNotifications.length > 0) {
        client.emit('pending_notifications', {
          notifications: pendingNotifications,
          count: pendingNotifications.length,
        });
      }
    } catch (error) {
      this.logger.error('Error sending pending notifications:', error);
    }
  }

  private async checkUserBanned(userId: string, streamId: string): Promise<boolean> {
    try {
      const ban = await this.prisma.streamBan.findFirst({
        where: {
          userId,
          streamId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      return !!ban;
    } catch (error) {
      return false;
    }
  }

  private async checkRateLimit(userId: string, action: string): Promise<boolean> {
    try {
      // Simple rate limiting - 1 message per second
      const key = `rate_limit:${userId}:${action}`;
      const lastAction = await this.prisma.rateLimit.findUnique({
        where: { key },
      });

      const now = new Date();
      const oneSecondAgo = new Date(now.getTime() - 1000);

      if (lastAction && lastAction.lastAction > oneSecondAgo) {
        return false;
      }

      // Update rate limit record
      await this.prisma.rateLimit.upsert({
        where: { key },
        update: { lastAction: now },
        create: { key, lastAction: now },
      });

      return true;
    } catch (error) {
      return true; // Allow on error
    }
  }

  private async checkModerationPermission(userId: string, streamId: string): Promise<boolean> {
    try {
      // Check if user is the streamer
      const stream = await this.prisma.liveStream.findUnique({
        where: { id: streamId },
      });

      if (stream?.streamerId === userId) {
        return true;
      }

      // Check if user is a moderator
      const moderator = await this.prisma.streamModerator.findFirst({
        where: {
          userId,
          streamId,
          isActive: true,
        },
      });

      return !!moderator;
    } catch (error) {
      return false;
    }
  }

  private async banUserFromStream(userId: string, streamId: string): Promise<void> {
    try {
      await this.prisma.streamBan.create({
        data: {
          userId,
          streamId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          reason: 'Chat violation',
        },
      });
    } catch (error) {
      this.logger.error('Error banning user:', error);
    }
  }

  private async timeoutUser(userId: string, streamId: string, minutes: number): Promise<void> {
    try {
      await this.prisma.streamTimeout.create({
        data: {
          userId,
          streamId,
          expiresAt: new Date(Date.now() + minutes * 60 * 1000),
        },
      });
    } catch (error) {
      this.logger.error('Error timing out user:', error);
    }
  }
}
