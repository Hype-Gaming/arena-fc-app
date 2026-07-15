import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const GRANT_TYPES = ['credits', 'plan', 'category_access', 'ia_unlimited'] as const;
const BILHETE_CATEGORIAS = [
  'safes',
  'pro',
  'ultra',
  'alavancagem',
  'multiplas',
  'secundario',
  'ligas',
] as const;

export class CreateProductDto {
  @IsString() provider!: string;
  @IsString() externalProductId!: string;
  @IsIn(GRANT_TYPES) grantType!: (typeof GRANT_TYPES)[number];
  @IsOptional() @IsInt() @Min(1) grantCredits!: number | null;
  @IsOptional() @IsString() grantPlanKey!: string | null;
  @IsOptional() @IsIn(BILHETE_CATEGORIAS) grantCategory?: string | null;
  /** Subscription length in days for 'plan' products; omit/null = lifetime (VIDA). */
  @IsOptional() @IsInt() @Min(1) grantPeriodDays?: number | null;
  @IsBoolean() active!: boolean;
}

export class UpdateProductDto {
  @IsOptional() @IsInt() @Min(1) grantCredits?: number | null;
  @IsOptional() @IsString() grantPlanKey?: string | null;
  @IsOptional() @IsIn(BILHETE_CATEGORIAS) grantCategory?: string | null;
  @IsOptional() @IsInt() @Min(1) grantPeriodDays?: number | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
