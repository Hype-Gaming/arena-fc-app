// api/src/modules/bilhetes/bilhetes.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SportsFeedModule } from '../sports-feed/sports-feed.module';
import { BilhetesController } from './bilhetes.controller';
import { BilhetesService } from './bilhetes.service';
import { SettleService } from './settle.service';

@Module({
  imports: [PrismaModule, AuthModule, SportsFeedModule],
  controllers: [BilhetesController],
  providers: [BilhetesService, SettleService],
  exports: [BilhetesService, SettleService],
})
export class BilhetesModule {}
