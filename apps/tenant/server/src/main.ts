/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  console.log('Starting Tenant Server...');

  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS configuration for development
  // Allows requests from tenant-dashboard (port 3000) with credentials
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow any subdomain of localhost on port 3000 (development)
      if (origin.match(/^http:\/\/[\w-]+\.localhost:3000$/)) {
        callback(null, true);
        return;
      }
      // Allow localhost:3000 without subdomain
      if (origin === 'http://localhost:3000') {
        callback(null, true);
        return;
      }
      // In production, allow same-origin requests
      if (process.env.NODE_ENV === 'production') {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  });
  const port = process.env.PORT || 3100;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
