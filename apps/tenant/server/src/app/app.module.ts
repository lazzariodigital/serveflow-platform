import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { APP_GUARD } from '@nestjs/core';
import { FusionAuthGuard } from '@serveflow/auth/server';
import { ServeflowMongooseModule } from '@serveflow/db';
import { TenantMiddleware } from '@serveflow/tenants';
import { UsersModule } from '../users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Mongoose connection service for multi-tenant database access
    ServeflowMongooseModule,
    UsersModule,
    // WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global auth guard - all routes require authentication by default
    // Use @Public() decorator to make endpoints public
    {
      provide: APP_GUARD,
      useClass: FusionAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes
    // This resolves the tenant from subdomain and injects tenant + userModel
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
