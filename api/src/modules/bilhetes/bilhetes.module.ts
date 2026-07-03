// api/src/modules/bilhetes/bilhetes.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BilhetesController } from './bilhetes.controller';
import { BilhetesService } from './bilhetes.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BilhetesController],
  providers: [BilhetesService],
  exports: [BilhetesService],
})
export class BilhetesModule {}
