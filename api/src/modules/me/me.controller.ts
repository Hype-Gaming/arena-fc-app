import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MeService, MeProfile } from './me.service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  /** Perfil screen header: email, current plan and live credit balance. */
  @Get()
  async getMine(@CurrentUser() user: AuthUser): Promise<MeProfile> {
    return this.me.getProfile(user.userId);
  }
}
