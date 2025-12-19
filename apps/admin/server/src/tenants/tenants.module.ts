import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '@serveflow/db';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [
    // Register Tenant model for injection
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
