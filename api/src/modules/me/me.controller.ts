import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MeService, MeProfile, TelegramUnlockStatus } from './me.service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  /** Perfil screen header: email, current plan and live credit balance. */
  @Get()
  async getMine(@CurrentUser() user: AuthUser): Promise<MeProfile> {
    return this.me.getProfile(user.userId);
  }

  @Get('telegram-unlock')
  getTelegramUnlock(
    @CurrentUser() user: AuthUser,
  ): Promise<TelegramUnlockStatus> {
    return this.me.getTelegramUnlockStatus(user.userId);
  }

  @Post('telegram-unlock/start')
  startTelegramUnlock(
    @CurrentUser() user: AuthUser,
  ): Promise<TelegramUnlockStatus> {
    return this.me.startTelegramUnlock(user.userId);
  }

  @Post('telegram-unlock/claim')
  claimTelegramUnlock(
    @CurrentUser() user: AuthUser,
  ): Promise<TelegramUnlockStatus> {
    return this.me.claimTelegramUnlock(user.userId);
  }
}
