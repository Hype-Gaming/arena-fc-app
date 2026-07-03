import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { BilheteCategoria } from '@prisma/client';

const CATEGORIA_KEYS = Object.values(BilheteCategoria);

export class CreateBilheteDto {
  @IsOptional() @IsString() titulo?: string;
  @IsIn(CATEGORIA_KEYS) categoria!: BilheteCategoria;
  @IsString() homeTeam!: string;
  @IsString() awayTeam!: string;
  @IsOptional() @IsString() homeColor?: string;
  @IsOptional() @IsString() awayColor?: string;
  @IsOptional() @IsString() competition?: string;
  @IsISO8601() startsAt!: string;
  @IsNumber() @IsPositive() odd!: number;
  /** Create-and-publish in one go (default true — admin usually wants it live). */
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class UpdateBilheteDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsIn(CATEGORIA_KEYS) categoria?: BilheteCategoria;
  @IsOptional() @IsString() homeTeam?: string;
  @IsOptional() @IsString() awayTeam?: string;
  @IsOptional() @IsString() homeColor?: string;
  @IsOptional() @IsString() awayColor?: string;
  @IsOptional() @IsString() competition?: string;
  @IsOptional() @IsISO8601() startsAt?: string;
  @IsOptional() @IsNumber() @IsPositive() odd?: number;
}

export class SetBilheteResultDto {
  @IsIn(['pending', 'green', 'red']) resultado!: 'pending' | 'green' | 'red';
}

export class PublishBilheteDto {
  @IsBoolean() published!: boolean;
}
