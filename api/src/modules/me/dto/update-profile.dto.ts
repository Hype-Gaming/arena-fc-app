import { IsIn, IsOptional, Length, Matches } from 'class-validator';
import { AVATAR_KEYS } from '../avatar.constants';

/** PATCH /me/profile — self-service identity (nickname + preset avatar). */
export class UpdateProfileDto {
  @IsOptional()
  @Length(2, 24, { message: 'nickname deve ter entre 2 e 24 caracteres' })
  @Matches(/^[\p{L}\p{N} _.-]+$/u, {
    message: 'nickname contém caracteres inválidos',
  })
  nickname?: string;

  @IsOptional()
  @IsIn(AVATAR_KEYS, { message: 'avatarKey inválido' })
  avatarKey?: string;
}
