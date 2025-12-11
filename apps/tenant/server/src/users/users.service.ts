import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import type { Model } from 'mongoose';
import {
  createFronteggUser,
  updateFronteggUser,
  deleteFronteggUser,
} from '@serveflow/auth';
import {
  createUser as createUserInDb,
  getUserByFronteggId,
  getUserByEmail,
  listUsers,
  updateUser,
  archiveUser as archiveUserInDb,
  deleteUser as deleteUserFromDb,
  countUsers,
  type User,
} from '@serveflow/db';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  ListUsersRequest,
} from '@serveflow/core';

// ════════════════════════════════════════════════════════════════
// Users Service
//
// Este servicio coordina operaciones entre Frontegg y MongoDB.
// FLUJO DIRECTO: API → Frontegg + MongoDB en mismo request (no webhooks)
//
// MIGRACIÓN MONGOOSE: Ahora recibe Model<User> en lugar de Db
// ════════════════════════════════════════════════════════════════

@Injectable()
export class UsersService {
  /**
   * Crea un usuario en Frontegg + MongoDB.
   * FLUJO DIRECTO: No espera webhook, crea en ambos sistemas inmediatamente.
   *
   * @param userModel - Mongoose User Model (inyectado por TenantMiddleware)
   * @param fronteggTenantId - ID del tenant de Frontegg (inyectado por TenantMiddleware)
   * @param dto - Datos del usuario a crear (validated by Zod)
   * @returns Usuario creado
   */
  async create(
    userModel: Model<User>,
    fronteggTenantId: string,
    dto: CreateUserRequest
  ): Promise<User> {
    // 1. Verificar que el email no existe en MongoDB
    const existingUser = await getUserByEmail(userModel, dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // 2. Crear usuario en Frontegg
      // Frontegg requires at least one role
      const defaultRoleId = process.env['FRONTEGG_DEFAULT_ROLE_ID'];
      if (!defaultRoleId) {
        throw new BadRequestException(
          'FRONTEGG_DEFAULT_ROLE_ID not configured. Create a role in Frontegg Portal > Entitlements > Roles and add its ID to .env'
        );
      }

      const fronteggUser = await createFronteggUser({
        email: dto.email,
        name: `${dto.firstName || ''} ${dto.lastName || ''}`.trim(),
        tenantId: fronteggTenantId,
        roleIds: [defaultRoleId],
        metadata: {
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      // 3. Crear usuario en MongoDB
      const user = await createUserInDb(userModel, {
        fronteggUserId: fronteggUser.id,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        imageUrl: dto.imageUrl || fronteggUser.profilePictureUrl,
        status: 'active',
        isVerified: fronteggUser.verified || false,
        organizationIds: dto.organizationIds || [],
      });

      console.log(`[UsersService] User ${fronteggUser.id} created via direct flow`);

      return user;
    } catch (error) {
      // Si falla crear en Frontegg, no creamos en MongoDB
      console.error('[UsersService] Error creating user:', error);

      throw new BadRequestException(
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Obtiene un usuario por su Frontegg User ID.
   *
   * @param userModel - Mongoose User Model
   * @param fronteggUserId - ID del usuario en Frontegg
   * @returns Usuario o null
   */
  async findByFronteggId(userModel: Model<User>, fronteggUserId: string): Promise<User | null> {
    console.log(`[UsersService.findByFronteggId] Looking for fronteggUserId: ${fronteggUserId}`);
    const user = await getUserByFronteggId(userModel, fronteggUserId);
    console.log(`[UsersService.findByFronteggId] Result:`, user ? `Found user ${user.email}` : 'Not found');
    return user;
  }

  /**
   * Obtiene un usuario por su email.
   *
   * @param userModel - Mongoose User Model
   * @param email - Email del usuario
   * @returns Usuario o null
   */
  async findByEmail(userModel: Model<User>, email: string): Promise<User | null> {
    return getUserByEmail(userModel, email);
  }

  /**
   * Lista todos los usuarios del tenant con paginación y filtros.
   *
   * @param userModel - Mongoose User Model
   * @param options - Opciones de filtrado y paginación (validated by Zod)
   * @returns Array de usuarios
   */
  async findAll(
    userModel: Model<User>,
    options: ListUsersRequest
  ): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const users = await listUsers(userModel, {
      status: options.status,
      organizationId: options.organizationId,
      limit,
      skip,
    });

    const total = await countUsers(userModel, {
      ...(options.status && { status: options.status }),
      ...(options.organizationId && { organizationIds: options.organizationId }),
    });

    return {
      users,
      total,
      page,
      limit,
    };
  }

  /**
   * Actualiza un usuario en Frontegg + MongoDB.
   *
   * @param userModel - Mongoose User Model
   * @param fronteggUserId - ID del usuario en Frontegg
   * @param dto - Datos a actualizar (validated by Zod)
   * @param fronteggTenantId - Frontegg tenant ID for API calls (optional - skip Frontegg update if not provided)
   * @returns Usuario actualizado
   */
  async update(
    userModel: Model<User>,
    fronteggUserId: string,
    dto: UpdateUserRequest,
    fronteggTenantId?: string
  ): Promise<User> {
    // 1. Verificar que el usuario existe
    const existingUser = await getUserByFronteggId(userModel, fronteggUserId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    try {
      // 2. Actualizar en Frontegg (solo campos que Frontegg maneja)
      // Only call Frontegg API if we have a tenantId
      if (fronteggTenantId && (dto.firstName || dto.lastName)) {
        await updateFronteggUser(fronteggUserId, fronteggTenantId, {
          name: `${dto.firstName || existingUser.firstName || ''} ${dto.lastName || existingUser.lastName || ''}`.trim(),
          metadata: {
            ...(dto.firstName && { firstName: dto.firstName }),
            ...(dto.lastName && { lastName: dto.lastName }),
          },
        });
      }

      // 3. Actualizar en MongoDB
      const updatedUser = await updateUser(userModel, fronteggUserId, {
        ...dto,
      });

      if (!updatedUser) {
        throw new NotFoundException('User not found after update');
      }

      console.log(`[UsersService] User ${fronteggUserId} updated`);

      return updatedUser;
    } catch (error) {
      console.error('[UsersService] Error updating user:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Archiva un usuario (soft delete).
   * Marca el usuario como archived en MongoDB.
   *
   * @param userModel - Mongoose User Model
   * @param fronteggUserId - ID del usuario en Frontegg
   * @returns Usuario archivado
   */
  async archive(userModel: Model<User>, fronteggUserId: string): Promise<User> {
    const user = await getUserByFronteggId(userModel, fronteggUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Marcar como archived en MongoDB
      // Nota: Frontegg maneja el estado del usuario separadamente
      const archivedUser = await archiveUserInDb(userModel, fronteggUserId);

      if (!archivedUser) {
        throw new NotFoundException('User not found after archive');
      }

      console.log(`[UsersService] User ${fronteggUserId} archived`);

      return archivedUser;
    } catch (error) {
      console.error('[UsersService] Error archiving user:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to archive user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Elimina permanentemente un usuario de Frontegg + MongoDB.
   * ⚠️ OPERACIÓN IRREVERSIBLE - Usar con precaución.
   *
   * @param userModel - Mongoose User Model
   * @param fronteggUserId - ID del usuario en Frontegg
   * @param fronteggTenantId - Frontegg tenant ID for API calls (optional - skip Frontegg delete if not provided)
   * @returns True si se eliminó
   */
  async remove(userModel: Model<User>, fronteggUserId: string, fronteggTenantId?: string): Promise<boolean> {
    const user = await getUserByFronteggId(userModel, fronteggUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // 1. Eliminar de Frontegg (only if tenantId provided)
      if (fronteggTenantId) {
        await deleteFronteggUser(fronteggUserId, fronteggTenantId);
      }

      // 2. Eliminar de MongoDB
      const deleted = await deleteUserFromDb(userModel, fronteggUserId);

      console.log(`[UsersService] User ${fronteggUserId} permanently deleted`);

      return deleted;
    } catch (error) {
      console.error('[UsersService] Error deleting user:', error);

      throw new BadRequestException(
        `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
