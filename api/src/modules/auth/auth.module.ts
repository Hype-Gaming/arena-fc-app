import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MAIL_SERVICE } from './mail/mail.service';
import { ConsoleMailService } from './mail/console-mail.service';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    { provide: MAIL_SERVICE, useClass: ConsoleMailService },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
