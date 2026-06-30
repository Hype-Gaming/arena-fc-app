// api/src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthResult, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  health(): Promise<HealthResult> {
    return this.healthService.check();
  }
}
