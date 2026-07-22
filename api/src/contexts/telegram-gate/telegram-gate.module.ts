import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TelegramGateService } from './telegram-gate.service';
import { TelegramGateController } from './telegram-gate.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TelegramGateController],
  providers: [TelegramGateService],
})
export class TelegramGateModule {}
