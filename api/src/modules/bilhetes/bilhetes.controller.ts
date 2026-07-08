// api/src/modules/bilhetes/bilhetes.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BilhetesService } from './bilhetes.service';

@Controller('bilhetes')
@UseGuards(JwtAuthGuard)
export class BilhetesController {
  constructor(private readonly bilhetes: BilhetesService) {}

  @Get()
  getFeed(@CurrentUser() user: AuthUser) {
    return this.bilhetes.getFeed(user.userId);
  }

  /** "Últimos greens": published tickets that already hit, most recent first. */
  @Get('historico')
  getHistorico() {
    return this.bilhetes.getHistorico();
  }
}
