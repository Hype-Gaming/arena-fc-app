import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { MatchesService } from './matches.service';
import { CreateMatchDto, UpdateMatchDto } from './dto/match.dto';

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/matches')
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() dto: CreateMatchDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateMatchDto) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
