import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService, CreatePaymentDto } from './payment.service';
import { Request } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  async createPayment(@Body() dto: CreatePaymentDto) {
    if (!dto.userId || !dto.amount || !dto.currency || !dto.paymentMethod) {
      throw new BadRequestException('userId, amount, currency, and paymentMethod are required');
    }
    return this.paymentService.createPayment(dto);
  }

  @Post('confirm')
  async confirmPayment(
    @Body('paymentId') paymentId: string,
    @Body('paymentIntentId') paymentIntentId: string,
  ) {
    if (!paymentId || !paymentIntentId) {
      throw new BadRequestException('paymentId and paymentIntentId are required');
    }
    const success = await this.paymentService.confirmPayment(paymentId, paymentIntentId);
    return { success };
  }

  @Post('webhook/:provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    const success = await this.paymentService.handleWebhook(
      provider,
      payload,
      stripeSignature,
    );
    return { received: success };
  }

  @Get('history')
  async getPaymentHistory(
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.paymentService.getPaymentHistory(
      userId,
      limit ? Number(limit) : 10,
      offset ? Number(offset) : 0,
    );
  }

  @Post('cancel-subscription')
  async cancelSubscription(@Body('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    const success = await this.paymentService.cancelSubscription(userId);
    return { success };
  }
}
