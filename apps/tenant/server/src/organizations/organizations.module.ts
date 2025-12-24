import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

// ════════════════════════════════════════════════════════════════
// Organizations Module
//
// Gestiona las organizaciones (sedes/sucursales) del tenant.
// ════════════════════════════════════════════════════════════════

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
