import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { AdminRoleGuard } from './admin-role.guard';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { EntradasController } from './entradas.controller';
import { EntradasService } from './entradas.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { UsersViewController } from './users-view.controller';
import { UsersViewService } from './users-view.service';

@Module({
  imports: [PrismaModule, AuthModule, GamificationModule],
  controllers: [
    CategoriesController,
    MatchesController,
    EntradasController,
    ProductsController,
    UsersViewController,
  ],
  providers: [
    AdminRoleGuard,
    CategoriesService,
    MatchesService,
    EntradasService,
    ProductsService,
    UsersViewService,
  ],
  exports: [AdminRoleGuard],
})
export class AdminModule {}
