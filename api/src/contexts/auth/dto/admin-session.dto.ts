import { IsOptional, IsString } from 'class-validator';

export class AdminSessionDto {
  // Optional so the endpoint still works when ADMIN_PANEL_PASSWORD is unset
  // (gate disabled). When the gate is on, AuthService rejects a missing/wrong
  // password with 401.
  @IsOptional()
  @IsString()
  password?: string;
}
