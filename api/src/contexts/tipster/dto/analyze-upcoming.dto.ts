import { IsString, IsNotEmpty } from 'class-validator';

export class AnalyzeUpcomingDto {
  /** Provider event id of the upcoming match (from GET /tipster/upcoming). */
  @IsString()
  @IsNotEmpty()
  externalId!: string;
}
