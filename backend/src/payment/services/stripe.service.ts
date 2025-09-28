import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  paymentId: string;
  userId: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(dto.amount * 100), // Convert to cents
        currency: dto.currency.toLowerCase(),
        metadata: {
          paymentId: dto.paymentId,
          userId: dto.userId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      this.logger.error('Stripe payment intent creation failed:', error);
      return {
        success: false,
        paymentId: '',
        error: error.message,
      };
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    try {
      if (!this.stripe) {
        return false;
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status === 'succeeded';
    } catch (error) {
      this.logger.error('Stripe payment confirmation failed:', error);
      return false;
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<boolean> {
    try {
      if (!this.stripe) {
        return false;
      }

      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.error('Stripe webhook secret not configured');
        return false;
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
          // Handle successful payment
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object as Stripe.PaymentIntent;
          this.logger.log(`Payment failed: ${failedPayment.id}`);
          // Handle failed payment
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          this.logger.log(`Subscription ${event.type}: ${subscription.id}`);
          // Handle subscription changes
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Stripe webhook handling failed:', error);
      return false;
    }
  }

  async createCustomer(email: string, name: string): Promise<string | null> {
    try {
      if (!this.stripe) {
        return null;
      }

      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      return customer.id;
    } catch (error) {
      this.logger.error('Stripe customer creation failed:', error);
      return null;
    }
  }

  async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription | null> {
    try {
      if (!this.stripe) {
        return null;
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      this.logger.error('Stripe subscription creation failed:', error);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      if (!this.stripe) {
        return false;
      }

      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      return true;
    } catch (error) {
      this.logger.error('Stripe subscription cancellation failed:', error);
      return false;
    }
  }
}
