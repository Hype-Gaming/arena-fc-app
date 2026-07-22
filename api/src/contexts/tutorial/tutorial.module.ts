import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { TutorialController } from './tutorial.controller';
import { TutorialService } from './tutorial.service';

@Module({
  imports: [PrismaModule, AuthModule, AdminModule],
  controllers: [TutorialController],
  providers: [TutorialService],
})
export class TutorialModule {}
