import { Module } from '@nestjs/common';
import { IptvController } from './iptv.controller';
import { IptvService } from './iptv.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IptvController],
  providers: [IptvService],
  exports: [IptvService],
})
export class IptvModule {}
