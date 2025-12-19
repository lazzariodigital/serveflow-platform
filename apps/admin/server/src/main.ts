/**
 * Admin Server (Control Plane)
 *
 * API for platform administration:
 * - Tenant CRUD operations
 * - System monitoring
 * - Platform configuration
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  console.log('Starting Admin Server (Control Plane)...');

  const app = await NestFactory.create(AppModule);

  // CORS configuration for admin dashboard
  app.enableCors({
    origin: [
      'http://localhost:3002',
      'http://localhost:4000',
      'http://admin.localhost:3002',
      /\.serveflow\.com$/,
    ],
    credentials: true,
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const port = process.env.PORT || 3102;
  await app.listen(port);

  Logger.log(
    `🚀 Admin Server running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(`   Tenants:`);
  Logger.log(`   - GET  /api/tenants       - List tenants`);
  Logger.log(`   - GET  /api/tenants/:slug - Get tenant`);
  Logger.log(`   - POST /api/tenants       - Create tenant`);
  Logger.log(`   - PUT  /api/tenants/:slug - Update tenant`);
  Logger.log(`   - DEL  /api/tenants/:slug - Delete tenant`);
  Logger.log(`   Users:`);
  Logger.log(`   - GET  /api/users/admin           - List admin users`);
  Logger.log(`   - POST /api/users/admin           - Create admin user`);
  Logger.log(`   - GET  /api/users/tenant/:id      - List tenant users`);
  Logger.log(`   - GET  /api/users/:id             - Get user`);
  Logger.log(`   - PUT  /api/users/:id             - Update user`);
  Logger.log(`   - DEL  /api/users/:id             - Delete user`);
}

bootstrap();
