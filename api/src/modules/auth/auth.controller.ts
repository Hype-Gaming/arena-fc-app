import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestCodeDto } from './dto/request-code.dto';
import { VerifyDto } from './dto/verify.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('request-code')
  @HttpCode(200)
  requestCode(@Body() dto: RequestCodeDto) {
    return this.auth.requestCode(dto.email);
  }

  /**
   * DEV-ONLY email login (no OTP). Disabled unless ALLOW_DEV_LOGIN=true, so it
   * is off by default and in production. Lets the team test without codes.
   */
  @Post('dev-login')
  @HttpCode(200)
  devLogin(@Body() dto: RequestCodeDto) {
    if (process.env.ALLOW_DEV_LOGIN !== 'true') {
      throw new ForbiddenException('dev-login is disabled');
    }
    return this.auth.devLogin(dto.email);
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Body() dto: VerifyDto) {
    return this.auth.verify(dto.email, dto.code);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
