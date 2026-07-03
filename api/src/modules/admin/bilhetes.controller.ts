// api/src/modules/admin/bilhetes.controller.ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminBilhetesService } from './bilhetes.service';
import {
  CreateBilheteDto,
  ImportBetslipDto,
  PublishBilheteDto,
  SetBilheteResultDto,
  UpdateBilheteDto,
} from './dto/bilhete.dto';

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/bilhetes')
export class AdminBilhetesController {
  constructor(private readonly service: AdminBilhetesService) {}

  @Get() list() { return this.service.list(); }
  @Post() create(@Body() dto: CreateBilheteDto) { return this.service.create(dto); }
  @Post('import-betslip') importBetslip(@Body() dto: ImportBetslipDto) {
    return this.service.importBetslip(dto.json, dto.categoria, dto.publish);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateBilheteDto) {
    return this.service.update(id, dto);
  }
  @Patch(':id/result') setResult(@Param('id') id: string, @Body() dto: SetBilheteResultDto) {
    return this.service.setResult(id, dto.resultado);
  }
  @Patch(':id/publish') setPublished(@Param('id') id: string, @Body() dto: PublishBilheteDto) {
    return this.service.setPublished(id, dto.published);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
