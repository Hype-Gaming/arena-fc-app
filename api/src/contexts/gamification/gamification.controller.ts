import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GamificationService } from './gamification.service';
import { ProfileGamificationDto } from './dto/profile-gamification.dto';

@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  /** Perfil screen: XP, level bounds, and achievement status for the caller. */
  @Get('me')
  async getMine(
    @CurrentUser() user: AuthUser,
  ): Promise<ProfileGamificationDto> {
    return this.gamification.getProfileGamification(user.userId);
  }
}
