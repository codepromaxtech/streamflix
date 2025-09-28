import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentResolver } from './payment.resolver';
import { StripeService } from './services/stripe.service';
import { SslcommerzService } from './services/sslcommerz.service';
import { PaypalService } from './services/paypal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UsersModule,
    SubscriptionModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentResolver,
    StripeService,
    SslcommerzService,
    PaypalService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
