import { Module, Global } from '@nestjs/common';
import { MongooseConnectionService } from './connection.service';

@Global()
@Module({
  providers: [MongooseConnectionService],
  exports: [MongooseConnectionService],
})
export class ServeflowMongooseModule {}
