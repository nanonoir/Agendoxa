import { Controller, Get } from '@nestjs/common';
import { healthResponseSchema, type HealthResponse } from '@agendoxa/shared';

@Controller()
export class AppController {
  @Get('health')
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({ status: 'ok' });
  }
}
