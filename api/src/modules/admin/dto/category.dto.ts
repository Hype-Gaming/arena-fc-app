import { IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsString() icon!: string;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() icon?: string;
}
