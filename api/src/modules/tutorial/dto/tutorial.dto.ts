import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TutorialStepInput {
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsString() imageUrl?: string;
}

export class PublishVersionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TutorialStepInput)
  steps!: TutorialStepInput[];
}
