import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './services/stripe.service';
import { SslcommerzService } from './services/sslcommerz.service';
import { PaypalService } from './services/paypal.service';
import { PaymentStatus, SubscriptionType } from '@prisma/client';

export interface CreatePaymentDto {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'sslcommerz' | 'paypal';
  subscriptionType?: SubscriptionType;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  paymentUrl?: string;
  clientSecret?: string;
  error?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private stripeService: StripeService,
    private sslcommerzService: SslcommerzService,
    private paypalService: PaypalService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<PaymentResult> {
    try {
      // Create payment record in database
      const payment = await this.prisma.payment.create({
        data: {
          userId: createPaymentDto.userId,
          amount: createPaymentDto.amount,
          currency: createPaymentDto.currency,
          status: PaymentStatus.PENDING,
          paymentMethod: createPaymentDto.paymentMethod,
          subscriptionType: createPaymentDto.subscriptionType,
        },
      });

      // Process payment based on method
      let result: PaymentResult;

      switch (createPaymentDto.paymentMethod) {
        case 'stripe':
          result = await this.stripeService.createPaymentIntent({
            amount: createPaymentDto.amount,
            currency: createPaymentDto.currency,
            paymentId: payment.id,
            userId: createPaymentDto.userId,
          });
          break;

        case 'sslcommerz':
          result = await this.sslcommerzService.initiatePayment({
            amount: createPaymentDto.amount,
            currency: createPaymentDto.currency,
            paymentId: payment.id,
            userId: createPaymentDto.userId,
            returnUrl: createPaymentDto.returnUrl,
            cancelUrl: createPaymentDto.cancelUrl,
          });
          break;

        case 'paypal':
          result = await this.paypalService.createOrder({
            amount: createPaymentDto.amount,
            currency: createPaymentDto.currency,
            paymentId: payment.id,
            userId: createPaymentDto.userId,
            returnUrl: createPaymentDto.returnUrl,
            cancelUrl: createPaymentDto.cancelUrl,
          });
          break;

        default:
          throw new BadRequestException('Unsupported payment method');
      }

      // Update payment with external payment ID
      if (result.success && result.paymentId) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { paymentIntentId: result.paymentId },
        });
      }

      return {
        ...result,
        paymentId: payment.id,
      };
    } catch (error) {
      this.logger.error('Payment creation failed:', error);
      return {
        success: false,
        paymentId: '',
        error: error.message || 'Payment creation failed',
      };
    }
  }

  async confirmPayment(paymentId: string, paymentIntentId: string): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true },
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

      // Verify payment with respective service
      let isConfirmed = false;

      switch (payment.paymentMethod) {
        case 'stripe':
          isConfirmed = await this.stripeService.confirmPayment(paymentIntentId);
          break;
        case 'sslcommerz':
          isConfirmed = await this.sslcommerzService.verifyPayment(paymentIntentId);
          break;
        case 'paypal':
          isConfirmed = await this.paypalService.captureOrder(paymentIntentId);
          break;
      }

      if (isConfirmed) {
        // Update payment status
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.COMPLETED },
        });

        // Create or update subscription if applicable
        if (payment.subscriptionType) {
          await this.createOrUpdateSubscription(payment.userId, payment.subscriptionType);
        }

        this.logger.log(`Payment confirmed: ${paymentId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Payment confirmation failed:', error);
      return false;
    }
  }

  async handleWebhook(provider: string, payload: any, signature?: string): Promise<boolean> {
    try {
      switch (provider) {
        case 'stripe':
          return await this.stripeService.handleWebhook(payload, signature);
        case 'sslcommerz':
          return await this.sslcommerzService.handleWebhook(payload);
        case 'paypal':
          return await this.paypalService.handleWebhook(payload);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Webhook handling failed for ${provider}:`, error);
      return false;
    }
  }

  async getPaymentHistory(userId: string, limit = 10, offset = 0) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        subscriptionType: true,
        createdAt: true,
      },
    });
  }

  private async createOrUpdateSubscription(userId: string, subscriptionType: SubscriptionType) {
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

    if (existingSubscription) {
      await this.prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planType: subscriptionType,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          userId,
          planType: subscriptionType,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
      });

      if (!subscription) {
        throw new BadRequestException('No active subscription found');
      }

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });

      return true;
    } catch (error) {
      this.logger.error('Subscription cancellation failed:', error);
      return false;
    }
  }
}
