export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailService {
  /** Send a one-time passcode to the given email address. */
  sendOtp(email: string, code: string): Promise<void>;
}
