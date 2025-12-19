import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData() {
    return {
      service: 'Serveflow Admin API',
      version: '1.0.0',
      docs: '/api/health',
    };
  }
}
