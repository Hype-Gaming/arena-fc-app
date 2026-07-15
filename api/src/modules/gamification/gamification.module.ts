import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
