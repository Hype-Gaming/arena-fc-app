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
  @IsOptional() @IsString() mercado?: string;
  @IsOptional() @IsString() selecao?: string;
  @IsOptional() @IsNumber() @IsPositive() linha?: number;
  @IsString() homeTeam!: string;
  @IsString() awayTeam!: string;
  @IsOptional() @IsString() homeColor?: string;
  @IsOptional() @IsString() awayColor?: string;
  @IsOptional() @IsString() homeLogo?: string;
  @IsOptional() @IsString() awayLogo?: string;
  @IsOptional() @IsString() competition?: string;
  @IsISO8601() startsAt!: string;
  @IsNumber() @IsPositive() odd!: number;
  @IsOptional() @IsString() eventDeepLink?: string;
  @IsOptional() @IsString() eventExternalId?: string;
  /** Create-and-publish in one go (default true — admin usually wants it live). */
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class FromEventsDto {
  @IsOptional() @IsIn(CATEGORIA_KEYS) categoria?: BilheteCategoria;
  @IsOptional() @IsString() mercado?: string;
  @IsOptional() @IsNumber() @IsPositive() limit?: number;
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class ImportBetslipDto {
  /** JSON copied from the Esportiva localStorage key WSDK_esportiva_betSelections. */
  @IsString() json!: string;
  @IsIn(Object.values(BilheteCategoria)) categoria!: BilheteCategoria;
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class UpdateBilheteDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsIn(CATEGORIA_KEYS) categoria?: BilheteCategoria;
  @IsOptional() @IsString() mercado?: string;
  @IsOptional() @IsString() selecao?: string;
  @IsOptional() @IsNumber() @IsPositive() linha?: number;
  @IsOptional() @IsString() homeTeam?: string;
  @IsOptional() @IsString() awayTeam?: string;
  @IsOptional() @IsString() homeColor?: string;
  @IsOptional() @IsString() awayColor?: string;
  @IsOptional() @IsString() homeLogo?: string;
  @IsOptional() @IsString() awayLogo?: string;
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
