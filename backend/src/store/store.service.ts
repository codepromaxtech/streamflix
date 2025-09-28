import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'avatar' | 'emote' | 'badge' | 'theme' | 'subscription' | 'credits' | 'gift_bundle';
  type: 'digital' | 'subscription' | 'bundle';
  price: number;
  originalPrice?: number;
  currency: string;
  discount?: number;
  isLimited: boolean;
  availableUntil?: Date;
  stock?: number;
  isActive: boolean;
  tags: string[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  paymentMethod: 'card' | 'wallet' | 'paypal' | 'crypto';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  purchasedAt: Date;
  deliveredAt?: Date;
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  items: string[]; // Array of item IDs
  originalPrice: number;
  bundlePrice: number;
  discount: number;
  isLimited: boolean;
  availableUntil?: Date;
  isActive: boolean;
}

interface Subscription {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  trialDays?: number;
  isPopular: boolean;
  isActive: boolean;
}

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultStore();
  }

  private async initializeDefaultStore(): Promise<void> {
    await this.createDefaultStoreItems();
    await this.createDefaultBundles();
    await this.createDefaultSubscriptions();
  }

  async getStoreItems(
    category?: string,
    type?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<StoreItem[]> {
    try {
      const items = await this.prisma.storeItem.findMany({
        where: {
          isActive: true,
          ...(category && { category }),
          ...(type && { type }),
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
          { isLimited: 'desc' },
          { discount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      });

      return items as any;
    } catch (error) {
      this.logger.error('Error fetching store items:', error);
      throw error;
    }
  }

  async getFeaturedItems(): Promise<StoreItem[]> {
    try {
      const featuredItems = await this.prisma.storeItem.findMany({
        where: {
          isActive: true,
          OR: [
            { isLimited: true },
            { discount: { gt: 0 } },
            { tags: { has: 'featured' } },
          ],
        },
        orderBy: { discount: 'desc' },
        take: 8,
      });

      return featuredItems as any;
    } catch (error) {
      this.logger.error('Error fetching featured items:', error);
      return [];
    }
  }

  async purchaseItem(
    userId: string,
    itemId: string,
    quantity: number = 1,
    paymentMethod: 'card' | 'wallet' | 'paypal' | 'crypto' = 'card',
  ): Promise<Purchase> {
    try {
      // Get item details
      const item = await this.prisma.storeItem.findUnique({
        where: { id: itemId },
      });

      if (!item || !item.isActive) {
        throw new NotFoundException('Item not found or not available');
      }

      // Check stock for limited items
      if (item.stock !== null && item.stock < quantity) {
        throw new BadRequestException('Insufficient stock');
      }

      // Check if item is still available (for limited items)
      if (item.isLimited && item.availableUntil && new Date() > item.availableUntil) {
        throw new BadRequestException('Item is no longer available');
      }

      const totalAmount = (item.discount ? 
        item.price * (1 - item.discount / 100) : 
        item.price) * quantity;

      // Check user balance if paying with wallet
      if (paymentMethod === 'wallet') {
        const userWallet = await this.prisma.userWallet.findUnique({
          where: { userId },
        });

        if (!userWallet || userWallet.balance < totalAmount) {
          throw new BadRequestException('Insufficient wallet balance');
        }
      }

      const purchase: Purchase = {
        id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        itemId,
        quantity,
        totalAmount,
        currency: item.currency,
        paymentMethod,
        status: 'pending',
        purchasedAt: new Date(),
      };

      // Save purchase
      await this.prisma.purchase.create({
        data: purchase,
      });

      // Process payment
      const paymentResult = await this.processPayment(purchase);

      if (paymentResult.success) {
        purchase.status = 'completed';
        purchase.transactionId = paymentResult.transactionId;
        purchase.deliveredAt = new Date();

        // Update purchase in database
        await this.prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            status: purchase.status,
            transactionId: purchase.transactionId,
            deliveredAt: purchase.deliveredAt,
          },
        });

        // Deliver item to user
        await this.deliverItem(userId, item, quantity);

        // Update stock
        if (item.stock !== null) {
          await this.prisma.storeItem.update({
            where: { id: itemId },
            data: {
              stock: {
                decrement: quantity,
              },
            },
          });
        }

        // Deduct from wallet if paid with wallet
        if (paymentMethod === 'wallet') {
          await this.prisma.userWallet.update({
            where: { userId },
            data: {
              balance: {
                decrement: totalAmount,
              },
            },
          });
        }

        // Emit purchase event
        this.eventEmitter.emit('store.purchase', {
          purchase,
          item,
          user: await this.prisma.user.findUnique({ where: { id: userId } }),
        });

        this.logger.log(`Item purchased: ${itemId} by user ${userId}`);
      } else {
        purchase.status = 'failed';
        await this.prisma.purchase.update({
          where: { id: purchase.id },
          data: { status: 'failed' },
        });
      }

      return purchase;
    } catch (error) {
      this.logger.error('Error purchasing item:', error);
      throw error;
    }
  }

  async purchaseBundle(
    userId: string,
    bundleId: string,
    paymentMethod: 'card' | 'wallet' | 'paypal' | 'crypto' = 'card',
  ): Promise<Purchase[]> {
    try {
      const bundle = await this.prisma.bundle.findUnique({
        where: { id: bundleId },
      });

      if (!bundle || !bundle.isActive) {
        throw new NotFoundException('Bundle not found or not available');
      }

      // Check if bundle is still available
      if (bundle.isLimited && bundle.availableUntil && new Date() > bundle.availableUntil) {
        throw new BadRequestException('Bundle is no longer available');
      }

      const purchases: Purchase[] = [];

      // Purchase each item in the bundle
      for (const itemId of bundle.items) {
        const purchase = await this.purchaseItem(userId, itemId, 1, paymentMethod);
        purchases.push(purchase);
      }

      // Apply bundle discount (refund difference)
      const totalItemPrice = bundle.originalPrice;
      const bundleDiscount = totalItemPrice - bundle.bundlePrice;

      if (bundleDiscount > 0 && paymentMethod === 'wallet') {
        await this.prisma.userWallet.update({
          where: { userId },
          data: {
            balance: {
              increment: bundleDiscount,
            },
          },
        });
      }

      this.logger.log(`Bundle purchased: ${bundleId} by user ${userId}`);

      return purchases;
    } catch (error) {
      this.logger.error('Error purchasing bundle:', error);
      throw error;
    }
  }

  async getUserPurchases(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Purchase[]> {
    try {
      const purchases = await this.prisma.purchase.findMany({
        where: { userId },
        include: {
          item: true,
        },
        orderBy: { purchasedAt: 'desc' },
        skip: offset,
        take: limit,
      });

      return purchases as any;
    } catch (error) {
      this.logger.error('Error fetching user purchases:', error);
      throw error;
    }
  }

  async getStoreStats(): Promise<any> {
    try {
      const totalItems = await this.prisma.storeItem.count({
        where: { isActive: true },
      });

      const totalPurchases = await this.prisma.purchase.count({
        where: { status: 'completed' },
      });

      const totalRevenue = await this.prisma.purchase.aggregate({
        where: { status: 'completed' },
        _sum: { totalAmount: true },
      });

      const topItems = await this.prisma.purchase.groupBy({
        by: ['itemId'],
        where: { status: 'completed' },
        _count: { itemId: true },
        _sum: { totalAmount: true },
        orderBy: { _count: { itemId: 'desc' } },
        take: 10,
      });

      return {
        totalItems,
        totalPurchases,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        topItems,
      };
    } catch (error) {
      this.logger.error('Error fetching store stats:', error);
      throw error;
    }
  }

  private async processPayment(purchase: Purchase): Promise<{ success: boolean; transactionId?: string }> {
    // Simulate payment processing
    // In production, integrate with actual payment providers
    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
    };
  }

  private async deliverItem(userId: string, item: any, quantity: number): Promise<void> {
    try {
      switch (item.category) {
        case 'avatar':
          await this.prisma.userReward.create({
            data: {
              userId,
              rewardType: 'avatar',
              rewardId: item.id,
              source: 'purchase',
              unlockedAt: new Date(),
            },
          });
          break;

        case 'credits':
          const creditAmount = item.metadata?.creditAmount || 100;
          await this.prisma.userWallet.upsert({
            where: { userId },
            update: {
              balance: {
                increment: creditAmount * quantity,
              },
            },
            create: {
              userId,
              balance: creditAmount * quantity,
              currency: 'USD',
            },
          });
          break;

        case 'subscription':
          // Handle subscription activation
          const durationDays = item.metadata?.durationDays || 30;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + durationDays);

          await this.prisma.userSubscription.upsert({
            where: { userId },
            update: {
              plan: item.metadata?.plan || 'premium',
              expiresAt: expiryDate,
              isActive: true,
            },
            create: {
              userId,
              plan: item.metadata?.plan || 'premium',
              expiresAt: expiryDate,
              isActive: true,
            },
          });
          break;

        default:
          // For other items, just create a generic reward
          await this.prisma.userReward.create({
            data: {
              userId,
              rewardType: item.category,
              rewardId: item.id,
              source: 'purchase',
              unlockedAt: new Date(),
              metadata: { quantity },
            },
          });
      }
    } catch (error) {
      this.logger.error('Error delivering item:', error);
      throw error;
    }
  }

  private async createDefaultStoreItems(): Promise<void> {
    const defaultItems = [
      {
        id: 'avatar_premium_1',
        name: 'Golden Crown Avatar',
        description: 'Exclusive golden crown avatar with animated effects',
        imageUrl: '/store/avatars/golden_crown.png',
        category: 'avatar',
        type: 'digital',
        price: 25.00,
        currency: 'USD',
        isLimited: false,
        isActive: true,
        tags: ['premium', 'animated', 'exclusive'],
        metadata: { animated: true, rarity: 'legendary' },
      },
      {
        id: 'credits_100',
        name: '100 Platform Credits',
        description: 'Add 100 credits to your wallet for donations and gifts',
        imageUrl: '/store/credits/credits_100.png',
        category: 'credits',
        type: 'digital',
        price: 10.00,
        currency: 'USD',
        isLimited: false,
        isActive: true,
        tags: ['credits', 'wallet'],
        metadata: { creditAmount: 100 },
      },
      {
        id: 'premium_month',
        name: 'Premium Subscription (1 Month)',
        description: 'Unlock premium features for 30 days',
        imageUrl: '/store/subscriptions/premium_month.png',
        category: 'subscription',
        type: 'subscription',
        price: 9.99,
        currency: 'USD',
        isLimited: false,
        isActive: true,
        tags: ['premium', 'subscription'],
        metadata: { plan: 'premium', durationDays: 30 },
      },
      {
        id: 'gift_bundle_valentine',
        name: 'Valentine\'s Gift Bundle',
        description: 'Special Valentine\'s Day gift collection',
        imageUrl: '/store/bundles/valentine_bundle.png',
        category: 'gift_bundle',
        type: 'bundle',
        price: 15.00,
        originalPrice: 25.00,
        discount: 40,
        currency: 'USD',
        isLimited: true,
        availableUntil: new Date('2024-02-14'),
        isActive: true,
        tags: ['valentine', 'limited', 'bundle'],
      },
    ];

    for (const item of defaultItems) {
      await this.prisma.storeItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
  }

  private async createDefaultBundles(): Promise<void> {
    const defaultBundles = [
      {
        id: 'starter_bundle',
        name: 'Starter Bundle',
        description: 'Perfect for new users - includes avatar, credits, and premium trial',
        imageUrl: '/store/bundles/starter_bundle.png',
        items: ['avatar_premium_1', 'credits_100', 'premium_month'],
        originalPrice: 44.99,
        bundlePrice: 29.99,
        discount: 33,
        isLimited: false,
        isActive: true,
      },
    ];

    for (const bundle of defaultBundles) {
      await this.prisma.bundle.upsert({
        where: { id: bundle.id },
        update: bundle,
        create: bundle,
      });
    }
  }

  private async createDefaultSubscriptions(): Promise<void> {
    const defaultSubscriptions = [
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        description: 'Monthly premium subscription',
        features: [
          'Ad-free viewing',
          'HD quality streaming',
          'Exclusive content access',
          'Priority customer support',
          'Advanced analytics',
        ],
        price: 9.99,
        currency: 'USD',
        billingCycle: 'monthly',
        trialDays: 7,
        isPopular: true,
        isActive: true,
      },
      {
        id: 'premium_yearly',
        name: 'Premium Yearly',
        description: 'Yearly premium subscription with 2 months free',
        features: [
          'All Premium Monthly features',
          '2 months free',
          'Exclusive yearly subscriber perks',
          'Priority feature access',
        ],
        price: 99.99,
        currency: 'USD',
        billingCycle: 'yearly',
        trialDays: 14,
        isPopular: false,
        isActive: true,
      },
    ];

    for (const subscription of defaultSubscriptions) {
      await this.prisma.subscription.upsert({
        where: { id: subscription.id },
        update: subscription,
        create: subscription,
      });
    }
  }
}
