import { Module } from '@nestjs/common';
import { StreamWebSocketGateway } from './websocket.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [StreamWebSocketGateway],
  exports: [StreamWebSocketGateway],
})
export class WebSocketModule {}
