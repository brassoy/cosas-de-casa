import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

interface HealthStatus {
  status: 'ok';
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'El servicio está operativo' })
  check(): HealthStatus {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
