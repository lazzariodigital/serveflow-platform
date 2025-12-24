import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleTemplate, RoleTemplateSchema } from '@serveflow/db';
import { RoleTemplatesController } from './role-templates.controller';
import { RoleTemplatesService } from './role-templates.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RoleTemplate.name, schema: RoleTemplateSchema }]),
  ],
  controllers: [RoleTemplatesController],
  providers: [RoleTemplatesService],
  exports: [RoleTemplatesService],
})
export class RoleTemplatesModule {}
