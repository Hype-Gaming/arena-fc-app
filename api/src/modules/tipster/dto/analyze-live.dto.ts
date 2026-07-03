import { IsString, IsNotEmpty } from 'class-validator';

export class AnalyzeLiveDto {
  /** Provider event id of the live match (from GET /tipster/live). */
  @IsString()
  @IsNotEmpty()
  externalId!: string;
}
