import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateEntradaDto {
  @IsString() matchId!: string;
  @IsString() market!: string;
  @IsString() selection!: string;
  @IsNumber() odd!: number;
  @IsString() justification!: string;
  @IsNumber() @Min(0) costInCredits!: number;
}

export class UpdateEntradaDto {
  @IsOptional() @IsString() market?: string;
  @IsOptional() @IsString() selection?: string;
  @IsOptional() @IsNumber() odd?: number;
  @IsOptional() @IsString() justification?: string;
  @IsOptional() @IsNumber() @Min(0) costInCredits?: number;
}
