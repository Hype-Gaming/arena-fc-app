import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { UsersViewService } from './users-view.service';

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/users')
export class UsersViewController {
  constructor(private readonly service: UsersViewService) {}

  @Get() list() { return this.service.listWithBalances(); }
}
