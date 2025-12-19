import { Controller, Get } from '@nestjs/common';
import { Public } from '@serveflow/auth/server';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint (public)
   */
  @Public()
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'admin-server',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Root endpoint (public)
   */
  @Public()
  @Get()
  getData() {
    return this.appService.getData();
  }
}
