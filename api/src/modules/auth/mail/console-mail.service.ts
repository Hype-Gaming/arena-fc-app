import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';

@Injectable()
export class ConsoleMailService implements MailService {
  async sendOtp(email: string, code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[mail] OTP for ${email}: ${code}`);
  }
}
