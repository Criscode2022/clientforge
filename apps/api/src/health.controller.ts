import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  check() {
    return {
      ok: true,
      service: 'clientforge-api',
      db: this.db.source,
      timestamp: new Date().toISOString(),
    };
  }
}
