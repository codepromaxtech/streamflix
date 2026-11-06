import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionType } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    return subscription || null;
  }

  async getPlans() {
    return [
      {
        type: 'FREE',
        name: 'Basic Free',
        price: 0,
        currency: 'USD',
        features: ['SD Quality (480p)', 'Ad-supported', '1 Device'],
      },
      {
        type: 'BASIC',
        name: 'Standard HD',
        price: 9.99,
        currency: 'USD',
        features: ['HD Quality (1080p)', 'No Ads', '2 Devices at once', 'Offline Downloads'],
      },
      {
        type: 'PREMIUM',
        name: 'Premium Ultra 4K',
        price: 15.99,
        currency: 'USD',
        features: ['Ultra HD (4K) & HDR', 'Spatial Audio', '4 Devices at once', 'Unlimited Downloads'],
      },
    ];
  }
}
