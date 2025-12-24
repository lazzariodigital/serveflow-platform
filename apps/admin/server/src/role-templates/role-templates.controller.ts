import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '@serveflow/auth/server';
import {
  CreateRoleTemplateDto,
  RoleTemplatesService,
  UpdateRoleTemplateDto,
} from './role-templates.service';

// ════════════════════════════════════════════════════════════════
// Role Templates Controller (Admin API)
// ════════════════════════════════════════════════════════════════
// Endpoints:
//   GET    /api/role-templates          - List all role templates
//   GET    /api/role-templates/:slug    - Get role template by slug
//   POST   /api/role-templates          - Create a new role template
//   PUT    /api/role-templates/:slug    - Update a role template
//   DELETE /api/role-templates/:slug    - Delete a role template
//   POST   /api/role-templates/seed     - Seed default role templates
//
// All endpoints require superadmin role
// ════════════════════════════════════════════════════════════════

@Controller('role-templates')
@Roles('superadmin')
export class RoleTemplatesController {
  constructor(private readonly roleTemplatesService: RoleTemplatesService) {}

  /**
   * List all role templates
   */
  @Get()
  async list() {
    const templates = await this.roleTemplatesService.list();
    return { templates };
  }

  /**
   * Seed default role templates
   * POST /api/role-templates/seed
   */
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed() {
    const result = await this.roleTemplatesService.seed();
    return { 
      message: 'Role templates seeded successfully',
      ...result,
    };
  }

  /**
   * Get a single role template by slug
   */
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.roleTemplatesService.getBySlug(slug);
  }

  /**
   * Create a new role template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRoleTemplateDto) {
    return this.roleTemplatesService.create(dto);
  }

  /**
   * Update a role template
   */
  @Put(':slug')
  async update(@Param('slug') slug: string, @Body() dto: UpdateRoleTemplateDto) {
    return this.roleTemplatesService.update(slug, dto);
  }

  /**
   * Delete a role template
   */
  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('slug') slug: string) {
    await this.roleTemplatesService.delete(slug);
  }
}
