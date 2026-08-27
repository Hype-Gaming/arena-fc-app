// api/src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthResult, HealthService } from './health.service';

export interface LivenessResult {
  status: 'ok';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  health(): Promise<HealthResult> {
    return this.healthService.check();
  }

  /**
   * Process-only probe. It must never query the database: Docker calls this
   * endpoint every few seconds and a DB query would keep serverless Postgres
   * awake indefinitely, exhausting its compute quota.
   */
  @Get('live')
  live(): LivenessResult {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
