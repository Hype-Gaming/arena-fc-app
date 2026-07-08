import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';
import { RefreshDto } from './refresh.dto';

describe('Auth DTOs', () => {
  it('rejects an invalid email on LoginDto', async () => {
    const dto = plainToInstance(LoginDto, { email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('accepts a valid email on LoginDto', async () => {
    const dto = plainToInstance(LoginDto, { email: 'a@b.com' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a RefreshDto with an empty refreshToken', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: '' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('refreshToken');
  });
});
