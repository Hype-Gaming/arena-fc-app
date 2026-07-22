import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class MatchSearchQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  q!: string;
}
