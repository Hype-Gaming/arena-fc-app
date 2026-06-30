import { Module } from '@nestjs/common';
import { TipsterController } from './tipster.controller';
import { TipsterService } from './tipster.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CreditsModule } from '../credits/credits.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, CreditsModule, AuthModule],
  controllers: [TipsterController],
  providers: [TipsterService],
})
export class TipsterModule {}
