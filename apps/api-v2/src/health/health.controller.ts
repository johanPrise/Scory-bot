import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'scory-api-v2',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/health')
  apiHealth() {
    return this.health();
  }
}
