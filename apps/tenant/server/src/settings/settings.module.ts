import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

// ════════════════════════════════════════════════════════════════
// Settings Module
//
// Gestiona la configuración de apps (dashboard y webapp) del tenant.
// ════════════════════════════════════════════════════════════════

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
