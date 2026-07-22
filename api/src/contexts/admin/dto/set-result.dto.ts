import { IsIn } from 'class-validator';

export class SetResultDto {
  @IsIn(['green', 'red']) result!: 'green' | 'red';
}
