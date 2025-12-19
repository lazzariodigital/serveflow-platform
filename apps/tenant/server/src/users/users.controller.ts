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
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@serveflow/auth';
import { CurrentUser, Public, RequireTenant } from '@serveflow/auth/server';
import {
  CreateUserRequest,
  CreateUserRequestSchema,
  ListUsersRequest,
  ListUsersRequestSchema,
  UpdateUserRequest,
  UpdateUserRequestSchema,
  ZodValidationPipe,
} from '@serveflow/core';
import type { TenantRequest } from '@serveflow/tenants';
import { UsersService } from './users.service';

// ════════════════════════════════════════════════════════════════
// Users Controller
//
// Endpoints para gestión de usuarios del tenant.
// Todos los endpoints requieren autenticación (FusionAuthGuard aplicado globalmente).
//
// MIGRACIÓN MONGOOSE: Ahora extrae userModel del request (inyectado por TenantMiddleware)
// ════════════════════════════════════════════════════════════════

@Controller('users-tenant')
@RequireTenant() // Todos los endpoints requieren tenant
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/users
   * Crea un nuevo usuario.
   * Solo admins pueden crear usuarios.
   */
  @Post('')
  @Public()
  async create(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(CreateUserRequestSchema)) dto: CreateUserRequest
  ) {
    const { userModel, tenant } = req;

    const user = await this.usersService.create(
      userModel,
      tenant.fusionauthTenantId,
      tenant.fusionauthApplicationId,
      dto
    );

    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  /**
   * GET /api/users
   * Lista todos los usuarios del tenant con paginación y filtros.
   */
  @Get()
  async findAll(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(ListUsersRequestSchema)) query: ListUsersRequest
  ) {
    const { userModel } = req;

    const result = await this.usersService.findAll(userModel, query);

    return {
      success: true,
      data: result.users,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * GET /api/users/me
   * Obtiene el perfil del usuario actual.
   */
  @Get('me')
  async getMe(@Req() req: TenantRequest, @CurrentUser() user: AuthenticatedUser) {
    const { userModel, tenant } = req;

    console.log(`[UsersController.getMe] fusionauthUserId: ${user.fusionauthUserId}, tenant: ${tenant?.slug}`);

    const dbUser = await this.usersService.findByFusionauthId(userModel, user.fusionauthUserId);

    console.log(`[UsersController.getMe] dbUser found: ${!!dbUser}`);

    return {
      success: true,
      data: dbUser,
    };
  }

  /**
   * GET /api/users/:fusionauthUserId
   * Obtiene un usuario específico por su FusionAuth User ID.
   */
  @Get(':fusionauthUserId')
  async findOne(@Req() req: TenantRequest, @Param('fusionauthUserId') fusionauthUserId: string) {
    const { userModel } = req;

    const user = await this.usersService.findByFusionauthId(userModel, fusionauthUserId);

    return {
      success: true,
      data: user,
    };
  }

  /**
   * PUT /api/users/:fusionauthUserId
   * Actualiza un usuario.
   * Solo admins pueden actualizar usuarios.
   */
  @Put(':fusionauthUserId')
  async update(
    @Req() req: TenantRequest,
    @Param('fusionauthUserId') fusionauthUserId: string,
    @Body(new ZodValidationPipe(UpdateUserRequestSchema)) dto: UpdateUserRequest
  ) {
    const { userModel } = req;

    const user = await this.usersService.update(userModel, fusionauthUserId, dto);

    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  /**
   * DELETE /api/users/:fusionauthUserId/archive
   * Archiva un usuario (soft delete).
   */
  @Delete(':fusionauthUserId/archive')
  @HttpCode(HttpStatus.OK)
  async archive(@Req() req: TenantRequest, @Param('fusionauthUserId') fusionauthUserId: string) {
    const { userModel } = req;

    const user = await this.usersService.archive(userModel, fusionauthUserId);

    return {
      success: true,
      data: user,
      message: 'User archived successfully',
    };
  }

  /**
   * DELETE /api/users/:fusionauthUserId
   * Elimina permanentemente un usuario.
   * ⚠️ OPERACIÓN IRREVERSIBLE
   */
  @Delete(':fusionauthUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: TenantRequest, @Param('fusionauthUserId') fusionauthUserId: string) {
    const { userModel } = req;

    await this.usersService.remove(userModel, fusionauthUserId);

    // No content response
    return;
  }
}
