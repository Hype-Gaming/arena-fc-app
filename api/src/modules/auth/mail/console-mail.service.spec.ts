import { ConsoleMailService } from './console-mail.service';

describe('ConsoleMailService', () => {
  it('logs the OTP email to the console and resolves', async () => {
    const service = new ConsoleMailService();
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await service.sendOtp('user@example.com', '123456');

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = spy.mock.calls[0].join(' ');
    expect(logged).toContain('user@example.com');
    expect(logged).toContain('123456');

    spy.mockRestore();
  });
});
