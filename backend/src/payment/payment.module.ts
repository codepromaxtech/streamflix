import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeService } from './services/stripe.service';
import { SslcommerzService } from './services/sslcommerz.service';
import { PaypalService } from './services/paypal.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    StripeService,
    SslcommerzService,
    PaypalService,
  ],
  exports: [PaymentService, StripeService, SslcommerzService, PaypalService],
})
export class PaymentModule {}
