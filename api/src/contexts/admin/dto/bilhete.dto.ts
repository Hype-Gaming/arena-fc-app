import {
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BilheteCategoria } from '@prisma/client';

const CATEGORIA_KEYS = Object.values(BilheteCategoria);

export class BilheteLegDto {
  @IsString() homeTeam!: string;
  @IsString() awayTeam!: string;
  @IsString() mercado!: string;
  @IsString() selecao!: string;
  @IsOptional() @IsNumber() @IsPositive() linha?: number;
  @IsNumber() @IsPositive() odd!: number;
  @IsOptional() @IsString() eventExternalId?: string;
  @IsOptional() @Transform(({ value }) => value == null ? value : String(value)) @IsString() @Matches(/^[1-9]\d*$/) oddId?: string;
}

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
  @IsOptional() @IsISO8601() validUntil?: string;
  @IsNumber() @IsPositive() odd!: number;
  @IsOptional() @Transform(({ value }) => value == null ? value : String(value)) @IsString() @Matches(/^[1-9]\d*$/) oddId?: string;
  @IsOptional() @IsString() eventDeepLink?: string;
  @IsOptional() @IsString() eventExternalId?: string;
  /** Esportiva's shared coupon URL, validated by the service. */
  @IsOptional() @IsString() esportivaShareUrl?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => BilheteLegDto)
  legs?: BilheteLegDto[];
  /** Create-and-publish in one go (default true — admin usually wants it live). */
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class FromEventsDto {
  @IsOptional() @IsIn(CATEGORIA_KEYS) categoria?: BilheteCategoria;
  @IsOptional() @IsString() mercado?: string;
  @IsOptional() @IsNumber() @IsPositive() limit?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) eventExternalIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) eventPicks?: {
    eventExternalId: string;
    mercado?: string;
    selecao?: string;
    linha?: number | null;
  }[];
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
  @IsOptional() @IsISO8601() validUntil?: string;
  @IsOptional() @IsNumber() @IsPositive() odd?: number;
  @IsOptional() @IsString() esportivaShareUrl?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => BilheteLegDto)
  legs?: BilheteLegDto[];
}

export class SetBilheteResultDto {
  @IsIn(['pending', 'green', 'red']) resultado!: 'pending' | 'green' | 'red';
}

export class PublishBilheteDto {
  @IsBoolean() published!: boolean;
}
