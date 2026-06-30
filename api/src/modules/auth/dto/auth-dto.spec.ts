import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RequestCodeDto } from './request-code.dto';
import { VerifyDto } from './verify.dto';
import { RefreshDto } from './refresh.dto';

describe('Auth DTOs', () => {
  it('rejects an invalid email on RequestCodeDto', async () => {
    const dto = plainToInstance(RequestCodeDto, { email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('accepts a valid email on RequestCodeDto', async () => {
    const dto = plainToInstance(RequestCodeDto, { email: 'a@b.com' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a VerifyDto whose code is not 6 digits', async () => {
    const dto = plainToInstance(VerifyDto, { email: 'a@b.com', code: '12' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('code');
  });

  it('accepts a valid VerifyDto', async () => {
    const dto = plainToInstance(VerifyDto, { email: 'a@b.com', code: '123456' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a RefreshDto with an empty refreshToken', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: '' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('refreshToken');
  });
});
