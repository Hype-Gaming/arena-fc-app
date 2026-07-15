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
import { AdminBilhetesController } from './bilhetes.controller';
import { AdminBilhetesService } from './bilhetes.service';
import { AdminTeamsController } from './teams.controller';
import { AdminTeamsService } from './teams.service';
import { AdminSportEventsController } from './sport-events.controller';
import { SportsFeedModule } from '../sports-feed/sports-feed.module';

@Module({
  imports: [PrismaModule, AuthModule, GamificationModule, SportsFeedModule],
  controllers: [
    CategoriesController,
    MatchesController,
    EntradasController,
    ProductsController,
    UsersViewController,
    AdminBilhetesController,
    AdminTeamsController,
    AdminSportEventsController,
  ],
  providers: [
    AdminRoleGuard,
    CategoriesService,
    MatchesService,
    EntradasService,
    ProductsService,
    UsersViewService,
    AdminBilhetesService,
    AdminTeamsService,
  ],
  exports: [AdminRoleGuard],
})
export class AdminModule {}
