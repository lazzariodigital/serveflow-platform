import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Tenant,
  TenantSchema,
  RoleTemplate,
  RoleTemplateSchema,
  MongooseConnectionService,
} from '@serveflow/db';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [
    // Register models for injection (system database)
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: RoleTemplate.name, schema: RoleTemplateSchema },
    ]),
  ],
  controllers: [TenantsController],
  providers: [
    TenantsService,
    // For dynamic tenant database connections
    MongooseConnectionService,
  ],
  exports: [TenantsService],
})
export class TenantsModule {}
