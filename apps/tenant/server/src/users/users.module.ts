import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// ════════════════════════════════════════════════════════════════
// Users Module
// ════════════════════════════════════════════════════════════════

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export para que otros módulos puedan usarlo
})
export class UsersModule {}
