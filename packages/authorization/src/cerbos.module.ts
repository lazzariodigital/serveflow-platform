import { Module, Global } from '@nestjs/common';
import { CerbosService } from './services/cerbos.service';
import { ResourceLoaderService } from './services/resource-loader.service';

@Global()
@Module({
  providers: [CerbosService, ResourceLoaderService],
  exports: [CerbosService, ResourceLoaderService],
})
export class CerbosModule {}
