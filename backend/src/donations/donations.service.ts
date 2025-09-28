import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface Donation {
  id: string;
  donorId: string;
  streamerId: string;
  streamId?: string;
  amount: number;
  currency: string;
  message?: string;
  isAnonymous: boolean;
  giftId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'paypal' | 'crypto' | 'platform_credits';
  transactionId?: string;
  createdAt: Date;
  processedAt?: Date;
}

interface VirtualGift {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl?: string;
  price: number;
  currency: string;
  category: 'hearts' | 'flowers' | 'animals' | 'food' | 'luxury' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isLimited: boolean;
  availableUntil?: Date;
  streamerShare: number; // Percentage streamer gets (e.g., 70%)
  platformFee: number; // Percentage platform takes (e.g., 30%)
  isActive: boolean;
}

interface GiftTransaction {
  id: string;
  senderId: string;
  receiverId: string;
  streamId?: string;
  giftId: string;
  quantity: number;
  totalAmount: number;
  message?: string;
  isAnonymous: boolean;
  status: 'sent' | 'received' | 'expired';
  createdAt: Date;
}

interface PrivateSession {
  id: string;
  streamerId: string;
  viewerId: string;
  title: string;
  description?: string;
  pricePerMinute: number;
  currency: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in minutes
  totalCost: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  streamUrl?: string;
  chatEnabled: boolean;
  recordingEnabled: boolean;
}

interface StreamerEarnings {
  streamerId: string;
  totalDonations: number;
  totalGifts: number;
  totalPrivateSessions: number;
  totalEarnings: number;
  pendingPayouts: number;
  lastPayoutAt?: Date;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
}

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createDonation(
    donorId: string,
    streamerId: string,
    amount: number,
    currency: string = 'USD',
    options?: {
      streamId?: string;
      message?: string;
      isAnonymous?: boolean;
      giftId?: string;
      paymentMethod?: string;
    },
  ): Promise<Donation> {
    try {
      // Validate minimum donation amount
      const minAmount = this.getMinimumDonationAmount(currency);
      if (amount < minAmount) {
        throw new BadRequestException(`Minimum donation amount is ${minAmount} ${currency}`);
      }

      // Validate streamer exists and is active
      const streamer = await this.prisma.user.findUnique({
        where: { id: streamerId },
      });

      if (!streamer || !streamer.isStreamer) {
        throw new NotFoundException('Streamer not found');
      }

      // Create donation record
      const donation: Donation = {
        id: `donation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        donorId,
        streamerId,
        streamId: options?.streamId,
        amount,
        currency,
        message: options?.message,
        isAnonymous: options?.isAnonymous || false,
        giftId: options?.giftId,
        status: 'pending',
        paymentMethod: (options?.paymentMethod as any) || 'card',
        createdAt: new Date(),
      };

      // Save to database
      await this.prisma.donation.create({
        data: donation,
      });

      // Process payment
      const paymentResult = await this.processPayment(donation);
      
      if (paymentResult.success) {
        donation.status = 'completed';
        donation.processedAt = new Date();
        donation.transactionId = paymentResult.transactionId;

        // Update database
        await this.prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: donation.status,
            processedAt: donation.processedAt,
            transactionId: donation.transactionId,
          },
        });

        // Emit events for real-time notifications
        this.eventEmitter.emit('donation.completed', donation);
        
        // Award points to donor
        await this.awardDonationPoints(donorId, amount);
        
        // Update streamer earnings
        await this.updateStreamerEarnings(streamerId, amount, 'donation');

        this.logger.log(`Donation completed: ${donation.id} - ${amount} ${currency}`);
      } else {
        donation.status = 'failed';
        await this.prisma.donation.update({
          where: { id: donation.id },
          data: { status: 'failed' },
        });
      }

      return donation;
    } catch (error) {
      this.logger.error('Error creating donation:', error);
      throw error;
    }
  }

  async sendVirtualGift(
    senderId: string,
    receiverId: string,
    giftId: string,
    quantity: number = 1,
    options?: {
      streamId?: string;
      message?: string;
      isAnonymous?: boolean;
    },
  ): Promise<GiftTransaction> {
    try {
      // Get gift details
      const gift = await this.prisma.virtualGift.findUnique({
        where: { id: giftId },
      });

      if (!gift || !gift.isActive) {
        throw new NotFoundException('Gift not found or not available');
      }

      // Check if gift is still available (for limited gifts)
      if (gift.isLimited && gift.availableUntil && new Date() > gift.availableUntil) {
        throw new BadRequestException('Gift is no longer available');
      }

      const totalAmount = gift.price * quantity;

      // Check sender's balance or process payment
      const hasBalance = await this.checkUserBalance(senderId, totalAmount, gift.currency);
      if (!hasBalance) {
        throw new BadRequestException('Insufficient balance');
      }

      const transaction: GiftTransaction = {
        id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId,
        receiverId,
        streamId: options?.streamId,
        giftId,
        quantity,
        totalAmount,
        message: options?.message,
        isAnonymous: options?.isAnonymous || false,
        status: 'sent',
        createdAt: new Date(),
      };

      // Save transaction
      await this.prisma.giftTransaction.create({
        data: transaction,
      });

      // Deduct from sender's balance
      await this.deductUserBalance(senderId, totalAmount, gift.currency);

      // Calculate streamer earnings (minus platform fee)
      const streamerEarnings = totalAmount * (gift.streamerShare / 100);
      await this.updateStreamerEarnings(receiverId, streamerEarnings, 'gift');

      // Award points to sender
      await this.awardGiftPoints(senderId, totalAmount);

      // Emit events for real-time notifications
      this.eventEmitter.emit('gift.sent', {
        transaction,
        gift,
        sender: await this.prisma.user.findUnique({ where: { id: senderId } }),
        receiver: await this.prisma.user.findUnique({ where: { id: receiverId } }),
      });

      this.logger.log(`Gift sent: ${transaction.id} - ${gift.name} x${quantity}`);

      return transaction;
    } catch (error) {
      this.logger.error('Error sending virtual gift:', error);
      throw error;
    }
  }

  async createPrivateSession(
    streamerId: string,
    viewerId: string,
    sessionDetails: {
      title: string;
      description?: string;
      pricePerMinute: number;
      currency?: string;
      scheduledAt?: Date;
      chatEnabled?: boolean;
      recordingEnabled?: boolean;
    },
  ): Promise<PrivateSession> {
    try {
      // Validate streamer availability
      const streamer = await this.prisma.user.findUnique({
        where: { id: streamerId },
      });

      if (!streamer || !streamer.isStreamer || !streamer.allowsPrivateSessions) {
        throw new BadRequestException('Streamer not available for private sessions');
      }

      const session: PrivateSession = {
        id: `private_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        streamerId,
        viewerId,
        title: sessionDetails.title,
        description: sessionDetails.description,
        pricePerMinute: sessionDetails.pricePerMinute,
        currency: sessionDetails.currency || 'USD',
        status: 'scheduled',
        scheduledAt: sessionDetails.scheduledAt || new Date(),
        totalCost: 0, // Will be calculated when session ends
        paymentStatus: 'pending',
        chatEnabled: sessionDetails.chatEnabled ?? true,
        recordingEnabled: sessionDetails.recordingEnabled ?? false,
      };

      // Save session
      await this.prisma.privateSession.create({
        data: session,
      });

      // Emit event for notifications
      this.eventEmitter.emit('private_session.scheduled', session);

      this.logger.log(`Private session scheduled: ${session.id}`);

      return session;
    } catch (error) {
      this.logger.error('Error creating private session:', error);
      throw error;
    }
  }

  async startPrivateSession(sessionId: string, streamerId: string): Promise<PrivateSession> {
    try {
      const session = await this.prisma.privateSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.streamerId !== streamerId) {
        throw new NotFoundException('Private session not found');
      }

      if (session.status !== 'scheduled') {
        throw new BadRequestException('Session cannot be started');
      }

      // Generate stream URL
      const streamUrl = await this.generatePrivateStreamUrl(sessionId);

      const updatedSession = await this.prisma.privateSession.update({
        where: { id: sessionId },
        data: {
          status: 'active',
          startedAt: new Date(),
          streamUrl,
        },
      });

      // Emit event for real-time notifications
      this.eventEmitter.emit('private_session.started', updatedSession);

      this.logger.log(`Private session started: ${sessionId}`);

      return updatedSession as any;
    } catch (error) {
      this.logger.error('Error starting private session:', error);
      throw error;
    }
  }

  async endPrivateSession(sessionId: string, streamerId: string): Promise<PrivateSession> {
    try {
      const session = await this.prisma.privateSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.streamerId !== streamerId) {
        throw new NotFoundException('Private session not found');
      }

      if (session.status !== 'active') {
        throw new BadRequestException('Session is not active');
      }

      const endTime = new Date();
      const duration = session.startedAt 
        ? Math.ceil((endTime.getTime() - session.startedAt.getTime()) / (1000 * 60))
        : 0;
      
      const totalCost = duration * session.pricePerMinute;

      // Process payment
      const paymentResult = await this.processPrivateSessionPayment(
        session.viewerId,
        totalCost,
        session.currency,
      );

      const updatedSession = await this.prisma.privateSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          endedAt: endTime,
          duration,
          totalCost,
          paymentStatus: paymentResult.success ? 'paid' : 'pending',
        },
      });

      if (paymentResult.success) {
        // Calculate streamer earnings (minus platform fee)
        const platformFee = 0.3; // 30% platform fee
        const streamerEarnings = totalCost * (1 - platformFee);
        await this.updateStreamerEarnings(streamerId, streamerEarnings, 'private_session');

        // Award points to viewer
        await this.awardPrivateSessionPoints(session.viewerId, totalCost);
      }

      // Emit event
      this.eventEmitter.emit('private_session.ended', updatedSession);

      this.logger.log(`Private session ended: ${sessionId} - Duration: ${duration}min, Cost: ${totalCost}`);

      return updatedSession as any;
    } catch (error) {
      this.logger.error('Error ending private session:', error);
      throw error;
    }
  }

  async getStreamerEarnings(
    streamerId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time' = 'monthly',
  ): Promise<StreamerEarnings> {
    try {
      const dateRange = this.getDateRangeForPeriod(period);

      const donations = await this.prisma.donation.aggregate({
        where: {
          streamerId,
          status: 'completed',
          ...(dateRange && {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          }),
        },
        _sum: {
          amount: true,
        },
      });

      const gifts = await this.prisma.giftTransaction.aggregate({
        where: {
          receiverId: streamerId,
          status: 'sent',
          ...(dateRange && {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          }),
        },
        _sum: {
          totalAmount: true,
        },
      });

      const privateSessions = await this.prisma.privateSession.aggregate({
        where: {
          streamerId,
          status: 'completed',
          paymentStatus: 'paid',
          ...(dateRange && {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          }),
        },
        _sum: {
          totalCost: true,
        },
      });

      const totalDonations = donations._sum.amount || 0;
      const totalGifts = (gifts._sum.totalAmount || 0) * 0.7; // 70% to streamer
      const totalPrivateSessions = (privateSessions._sum.totalCost || 0) * 0.7; // 70% to streamer
      const totalEarnings = totalDonations + totalGifts + totalPrivateSessions;

      // Get pending payouts
      const pendingPayouts = await this.getPendingPayouts(streamerId);

      return {
        streamerId,
        totalDonations,
        totalGifts,
        totalPrivateSessions,
        totalEarnings,
        pendingPayouts,
        currency: 'USD',
        period,
      };
    } catch (error) {
      this.logger.error('Error getting streamer earnings:', error);
      throw error;
    }
  }

  async getVirtualGifts(category?: string, rarity?: string): Promise<VirtualGift[]> {
    try {
      const gifts = await this.prisma.virtualGift.findMany({
        where: {
          isActive: true,
          ...(category && { category }),
          ...(rarity && { rarity }),
          OR: [
            { isLimited: false },
            {
              isLimited: true,
              availableUntil: {
                gt: new Date(),
              },
            },
          ],
        },
        orderBy: [
          { rarity: 'asc' },
          { price: 'asc' },
        ],
      });

      return gifts as any;
    } catch (error) {
      this.logger.error('Error getting virtual gifts:', error);
      throw error;
    }
  }

  async getDonationHistory(
    userId: string,
    type: 'sent' | 'received',
    limit: number = 50,
  ): Promise<Donation[]> {
    try {
      const donations = await this.prisma.donation.findMany({
        where: {
          [type === 'sent' ? 'donorId' : 'streamerId']: userId,
          status: 'completed',
        },
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          streamer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return donations as any;
    } catch (error) {
      this.logger.error('Error getting donation history:', error);
      throw error;
    }
  }

  // Helper methods
  private getMinimumDonationAmount(currency: string): number {
    const minimums = {
      USD: 1,
      EUR: 1,
      GBP: 1,
      CAD: 1,
      AUD: 1,
    };
    return minimums[currency] || 1;
  }

  private async processPayment(donation: Donation): Promise<{ success: boolean; transactionId?: string }> {
    // Implement payment processing logic
    // This would integrate with Stripe, PayPal, etc.
    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
    };
  }

  private async checkUserBalance(userId: string, amount: number, currency: string): Promise<boolean> {
    // Check if user has sufficient balance in their wallet
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    return wallet && wallet.balance >= amount;
  }

  private async deductUserBalance(userId: string, amount: number, currency: string): Promise<void> {
    await this.prisma.userWallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });
  }

  private async updateStreamerEarnings(
    streamerId: string,
    amount: number,
    type: 'donation' | 'gift' | 'private_session',
  ): Promise<void> {
    await this.prisma.streamerEarnings.upsert({
      where: { streamerId },
      update: {
        totalEarnings: {
          increment: amount,
        },
        [`total${type.charAt(0).toUpperCase() + type.slice(1)}s`]: {
          increment: amount,
        },
      },
      create: {
        streamerId,
        totalEarnings: amount,
        [`total${type.charAt(0).toUpperCase() + type.slice(1)}s`]: amount,
      },
    });
  }

  private async awardDonationPoints(userId: string, amount: number): Promise<void> {
    // Award 1 point per dollar donated
    const points = Math.floor(amount);
    await this.awardPoints(userId, points, 'donation');
  }

  private async awardGiftPoints(userId: string, amount: number): Promise<void> {
    // Award 2 points per dollar spent on gifts
    const points = Math.floor(amount * 2);
    await this.awardPoints(userId, points, 'gift');
  }

  private async awardPrivateSessionPoints(userId: string, amount: number): Promise<void> {
    // Award 3 points per dollar spent on private sessions
    const points = Math.floor(amount * 3);
    await this.awardPoints(userId, points, 'private_session');
  }

  private async awardPoints(userId: string, points: number, source: string): Promise<void> {
    await this.prisma.userPoints.upsert({
      where: { userId },
      update: {
        totalPoints: {
          increment: points,
        },
        availablePoints: {
          increment: points,
        },
      },
      create: {
        userId,
        totalPoints: points,
        availablePoints: points,
      },
    });

    // Log points transaction
    await this.prisma.pointsTransaction.create({
      data: {
        userId,
        points,
        type: 'earned',
        source,
        description: `Earned ${points} points from ${source}`,
      },
    });
  }

  private async generatePrivateStreamUrl(sessionId: string): Promise<string> {
    // Generate secure stream URL for private session
    return `${this.configService.get('PRIVATE_STREAM_BASE_URL')}/${sessionId}`;
  }

  private async processPrivateSessionPayment(
    userId: string,
    amount: number,
    currency: string,
  ): Promise<{ success: boolean; transactionId?: string }> {
    // Process payment for private session
    return {
      success: true,
      transactionId: `pvt_${Date.now()}`,
    };
  }

  private async getPendingPayouts(streamerId: string): Promise<number> {
    const pendingPayouts = await this.prisma.streamerPayout.aggregate({
      where: {
        streamerId,
        status: 'pending',
      },
      _sum: {
        amount: true,
      },
    });

    return pendingPayouts._sum.amount || 0;
  }

  private getDateRangeForPeriod(period: string): { start: Date; end: Date } | null {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case 'weekly':
        start.setDate(now.getDate() - 7);
        return { start, end: now };
      case 'monthly':
        start.setMonth(now.getMonth() - 1);
        return { start, end: now };
      case 'yearly':
        start.setFullYear(now.getFullYear() - 1);
        return { start, end: now };
      default:
        return null;
    }
  }
}
