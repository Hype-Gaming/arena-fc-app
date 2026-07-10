import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MeService, MeProfile } from './me.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  /** Perfil screen header: email, current plan and live credit balance. */
  @Get()
  async getMine(@CurrentUser() user: AuthUser): Promise<MeProfile> {
    return this.me.getProfile(user.userId);
  }

  /** Update the caller's nickname and/or preset avatar. */
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<MeProfile> {
    return this.me.updateProfile(user.userId, dto);
  }
}
