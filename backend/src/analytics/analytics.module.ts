import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [AdvancedAnalyticsService],
  exports: [AdvancedAnalyticsService],
})
export class AnalyticsModule {}
