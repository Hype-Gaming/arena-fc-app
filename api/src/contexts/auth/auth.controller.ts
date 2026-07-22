import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthUser, JwtAuthGuard } from './jwt-auth.guard';
import { RefreshDto } from './dto/refresh.dto';
import { AdminSessionDto } from './dto/admin-session.dto';

// Login is email-only (no password), so an unthrottled /auth/login lets anyone
// mass-create users and mint tokens; refresh/admin-session are brute-force
// surfaces too. Cap them per IP. (Throttling is skipped under test — see
// ThrottlerModule.forRoot in AppModule.)
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Email-only login: a valid email enters the app (as a free user). */
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('admin/session')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  adminSession(@CurrentUser() user: AuthUser, @Body() dto: AdminSessionDto) {
    return this.auth.issueAdminSession(user.userId, user.email, dto.password);
  }
}
