import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { VideoProcessorService } from './video-processor.service';
import { VideoController } from './video.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => AuthModule),
    BullModule.registerQueue({
      name: 'video-processing',
    }),
  ],
  controllers: [VideoController],
  providers: [VideoProcessorService],
  exports: [VideoProcessorService],
})
export class VideoModule {}
