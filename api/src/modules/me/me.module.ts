import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CreditsModule } from '../credits/credits.module';
import { MeService } from './me.service';
import { MeController } from './me.controller';

@Module({
  imports: [PrismaModule, AuthModule, CreditsModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
