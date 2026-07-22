import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TelegramGateService, TelegramGateState } from './telegram-gate.service';

@UseGuards(JwtAuthGuard)
@Controller('me/telegram-gate')
export class TelegramGateController {
  constructor(private readonly service: TelegramGateService) {}

  /** Current gate state for the app's first-access popup. */
  @Get()
  state(@CurrentUser() user: AuthUser): Promise<TelegramGateState> {
    return this.service.getState(user.userId);
  }

  /** User clicked the Telegram CTA — starts the 10-minute wait. */
  @Post('click')
  click(@CurrentUser() user: AuthUser): Promise<TelegramGateState> {
    return this.service.recordClick(user.userId);
  }
}
