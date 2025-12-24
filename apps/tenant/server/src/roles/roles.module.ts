import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

// ════════════════════════════════════════════════════════════════
// Roles Module
// ════════════════════════════════════════════════════════════════

@Module({
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
