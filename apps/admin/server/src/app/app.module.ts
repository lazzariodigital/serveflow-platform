import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { FusionAuthGuard } from '@serveflow/auth/server';
import { env, SYSTEM_DB_NAME } from '@serveflow/config';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// ════════════════════════════════════════════════════════════════
// Admin Server App Module (Control Plane)
// ════════════════════════════════════════════════════════════════
// - Connects directly to system database (db_serveflow_sys)
// - Uses FusionAuthGuard for admin authentication
// - No TenantMiddleware (this is the control plane)
// ════════════════════════════════════════════════════════════════

@Module({
  imports: [
    // Connect to system database directly
    MongooseModule.forRoot(env.MONGODB_URI, {
      dbName: SYSTEM_DB_NAME,
    }),
    // Feature modules
    TenantsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global auth guard - all routes require admin authentication
    // Use @Public() decorator to make endpoints public
    {
      provide: APP_GUARD,
      useClass: FusionAuthGuard,
    },
  ],
})
export class AppModule {}
