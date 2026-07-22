import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../admin/admin-role.guard';
import { TutorialService } from './tutorial.service';
import { PublishVersionDto } from './dto/tutorial.dto';

@Controller('tutorial')
export class TutorialController {
  constructor(private readonly service: TutorialService) {}

  @UseGuards(JwtAuthGuard)
  @Get('latest')
  getLatest() {
    return this.service.getLatest();
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post('versions')
  publish(@Body() dto: PublishVersionDto) {
    return this.service.publishVersion(dto);
  }
}
