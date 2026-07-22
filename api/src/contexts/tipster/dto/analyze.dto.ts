import { IsString, IsNotEmpty } from 'class-validator';

export class AnalyzeDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;
}
