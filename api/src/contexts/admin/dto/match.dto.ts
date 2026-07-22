import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

const STATUSES = ['scheduled', 'live', 'finished'] as const;

export class CreateMatchDto {
  @IsString() categoryId!: string;
  @IsString() homeTeam!: string;
  @IsString() awayTeam!: string;
  @IsString() competition!: string;
  @IsISO8601() startsAt!: string;
  @IsIn(STATUSES) status!: (typeof STATUSES)[number];
}

export class UpdateMatchDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() homeTeam?: string;
  @IsOptional() @IsString() awayTeam?: string;
  @IsOptional() @IsString() competition?: string;
  @IsOptional() @IsISO8601() startsAt?: string;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
}
