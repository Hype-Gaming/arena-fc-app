import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SyncTeamsDto {
  /** API-Football league id (71 = Brasileirão Série A). */
  @IsOptional() @IsInt() @Min(1) league?: number;
  /** Free plan only covers 2022–2024. */
  @IsOptional() @IsInt() @Min(2022) @Max(2024) season?: number;
}
