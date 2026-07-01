import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const GRANT_TYPES = ['credits', 'plan'] as const;

export class CreateProductDto {
  @IsString() provider!: string;
  @IsString() externalProductId!: string;
  @IsIn(GRANT_TYPES) grantType!: (typeof GRANT_TYPES)[number];
  @IsOptional() @IsInt() @Min(1) grantCredits!: number | null;
  @IsOptional() @IsString() grantPlanKey!: string | null;
  @IsBoolean() active!: boolean;
}

export class UpdateProductDto {
  @IsOptional() @IsInt() @Min(1) grantCredits?: number | null;
  @IsOptional() @IsString() grantPlanKey?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
