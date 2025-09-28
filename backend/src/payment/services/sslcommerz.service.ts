import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

interface InitiatePaymentDto {
  amount: number;
  currency: string;
  paymentId: string;
  userId: string;
  returnUrl?: string;
  cancelUrl?: string;
}

@Injectable()
export class SslcommerzService {
  private readonly logger = new Logger(SslcommerzService.name);
  private readonly baseUrl: string;
  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly isLive: boolean;

  constructor(private configService: ConfigService) {
    this.storeId = this.configService.get<string>('SSLCOMMERZ_STORE_ID') || '';
    this.storePassword = this.configService.get<string>('SSLCOMMERZ_STORE_PASSWORD') || '';
    this.isLive = this.configService.get<boolean>('SSLCOMMERZ_IS_LIVE') || false;
    this.baseUrl = this.isLive 
      ? 'https://securepay.sslcommerz.com'
      : 'https://sandbox.sslcommerz.com';
  }

  async initiatePayment(dto: InitiatePaymentDto) {
    try {
      if (!this.storeId || !this.storePassword) {
        throw new Error('SSLCommerz credentials not configured');
      }

      const data = {
        store_id: this.storeId,
        store_passwd: this.storePassword,
        total_amount: dto.amount,
        currency: dto.currency,
        tran_id: dto.paymentId,
        success_url: dto.returnUrl || `${this.configService.get('NEXT_PUBLIC_API_URL')}/payment/sslcommerz/success`,
        fail_url: dto.cancelUrl || `${this.configService.get('NEXT_PUBLIC_API_URL')}/payment/sslcommerz/fail`,
        cancel_url: dto.cancelUrl || `${this.configService.get('NEXT_PUBLIC_API_URL')}/payment/sslcommerz/cancel`,
        ipn_url: `${this.configService.get('NEXT_PUBLIC_API_URL')}/payment/sslcommerz/ipn`,
        shipping_method: 'NO',
        product_name: 'StreamFlix Subscription',
        product_category: 'Digital Service',
        product_profile: 'digital-goods',
        cus_name: 'Customer',
        cus_email: 'customer@example.com',
        cus_add1: 'Dhaka',
        cus_city: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        ship_name: 'Customer',
        ship_add1: 'Dhaka',
        ship_city: 'Dhaka',
        ship_postcode: '1000',
        ship_country: 'Bangladesh',
      };

      const response = await axios.post(`${this.baseUrl}/gwprocess/v4/api.php`, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          paymentId: response.data.sessionkey,
          paymentUrl: response.data.GatewayPageURL,
        };
      } else {
        return {
          success: false,
          paymentId: '',
          error: response.data.failedreason || 'Payment initiation failed',
        };
      }
    } catch (error) {
      this.logger.error('SSLCommerz payment initiation failed:', error);
      return {
        success: false,
        paymentId: '',
        error: error.message || 'Payment initiation failed',
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    try {
      if (!this.storeId || !this.storePassword) {
        return false;
      }

      const data = {
        store_id: this.storeId,
        store_passwd: this.storePassword,
        tran_id: transactionId,
      };

      const response = await axios.post(`${this.baseUrl}/validator/api/validationserverAPI.php`, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data.status === 'VALID';
    } catch (error) {
      this.logger.error('SSLCommerz payment verification failed:', error);
      return false;
    }
  }

  async handleWebhook(payload: any): Promise<boolean> {
    try {
      // Verify the webhook signature
      if (!this.verifyWebhookSignature(payload)) {
        this.logger.error('Invalid SSLCommerz webhook signature');
        return false;
      }

      const { status, tran_id, amount, currency } = payload;

      switch (status) {
        case 'VALID':
          this.logger.log(`SSLCommerz payment successful: ${tran_id}`);
          // Handle successful payment
          break;

        case 'FAILED':
          this.logger.log(`SSLCommerz payment failed: ${tran_id}`);
          // Handle failed payment
          break;

        case 'CANCELLED':
          this.logger.log(`SSLCommerz payment cancelled: ${tran_id}`);
          // Handle cancelled payment
          break;

        default:
          this.logger.log(`Unknown SSLCommerz status: ${status}`);
      }

      return true;
    } catch (error) {
      this.logger.error('SSLCommerz webhook handling failed:', error);
      return false;
    }
  }

  private verifyWebhookSignature(payload: any): boolean {
    try {
      // SSLCommerz webhook verification logic
      const { store_id, store_passwd } = payload;
      return store_id === this.storeId && store_passwd === this.storePassword;
    } catch (error) {
      return false;
    }
  }

  async refundPayment(transactionId: string, amount: number, reason: string): Promise<boolean> {
    try {
      if (!this.storeId || !this.storePassword) {
        return false;
      }

      const data = {
        store_id: this.storeId,
        store_passwd: this.storePassword,
        bank_tran_id: transactionId,
        refund_amount: amount,
        refund_remarks: reason,
        refe_id: `REF_${Date.now()}`,
      };

      const response = await axios.post(`${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data.status === 'SUCCESS';
    } catch (error) {
      this.logger.error('SSLCommerz refund failed:', error);
      return false;
    }
  }
}
