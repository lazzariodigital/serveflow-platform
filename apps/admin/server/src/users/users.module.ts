import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GlobalUser, GlobalUserSchema } from '@serveflow/db';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GlobalUser.name, schema: GlobalUserSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
