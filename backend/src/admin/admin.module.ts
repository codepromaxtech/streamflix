import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { ContentManagementService } from './services/content-management.service';
import { UserManagementService } from './services/user-management.service';
import { AnalyticsService } from './services/analytics.service';
import { AdManagementService } from './services/ad-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    UploadModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminResolver,
    ContentManagementService,
    UserManagementService,
    AnalyticsService,
    AdManagementService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
