import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { EntradasService } from './entradas.service';
import { CreateEntradaDto, UpdateEntradaDto } from './dto/entrada.dto';
import { SetResultDto } from './dto/set-result.dto';

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/entradas')
export class EntradasController {
  constructor(private readonly service: EntradasService) {}

  @Get() findByMatch(@Query('matchId') matchId: string) {
    return this.service.findByMatch(matchId);
  }
  @Post() create(@Body() dto: CreateEntradaDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateEntradaDto) {
    return this.service.update(id, dto);
  }
  @Patch(':id/result') setResult(@Param('id') id: string, @Body() dto: SetResultDto) {
    return this.service.setResult(id, dto.result);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
