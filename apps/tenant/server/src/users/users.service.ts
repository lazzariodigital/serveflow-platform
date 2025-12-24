import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import type { Model } from 'mongoose';
import {
  createFusionAuthUser,
  createFusionAuthUserWithApps,
  updateFusionAuthUser,
  deleteFusionAuthUser,
} from '@serveflow/auth';
import {
  createUser as createUserInDb,
  getUserByFusionauthId,
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
// Este servicio coordina operaciones entre FusionAuth y MongoDB.
// FLUJO DIRECTO: API → FusionAuth + MongoDB en mismo request (no webhooks)
//
// MIGRACIÓN MONGOOSE: Ahora recibe Model<User> en lugar de Db
// ════════════════════════════════════════════════════════════════

@Injectable()
export class UsersService {
  /**
   * Crea un usuario en FusionAuth + MongoDB.
   * FLUJO DIRECTO: No espera webhook, crea en ambos sistemas inmediatamente.
   *
   * @param userModel - Mongoose User Model (inyectado por TenantMiddleware)
   * @param fusionauthTenantId - ID del tenant de FusionAuth (inyectado por TenantMiddleware)
   * @param fusionauthApplicationId - ID de la aplicación FusionAuth (webapp o dashboard)
   * @param dto - Datos del usuario a crear (validated by Zod)
   * @param defaultRole - Rol por defecto a asignar (default: 'client')
   * @returns Usuario creado
   */
  async create(
    userModel: Model<User>,
    fusionauthTenantId: string,
    fusionauthApplicationId: string,
    dto: CreateUserRequest,
    defaultRole: string = 'client'
  ): Promise<User> {
    // 1. Verificar que el email no existe en MongoDB
    const existingUser = await getUserByEmail(userModel, dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // 2. Crear usuario en FusionAuth
      // Si se proporciona password, se usa directamente
      // Si no, se envía email para establecer contraseña
      const fusionauthUser = await createFusionAuthUser({
        email: dto.email,
        password: dto.password, // Puede ser undefined
        firstName: dto.firstName,
        lastName: dto.lastName,
        tenantId: fusionauthTenantId,
        applicationId: fusionauthApplicationId,
        roles: [defaultRole], // Role must exist in the Application
        sendSetPasswordEmail: !dto.password, // Solo enviar email si no hay password
      });

      // 3. Crear usuario en MongoDB
      const user = await createUserInDb(userModel, {
        fusionauthUserId: fusionauthUser.id,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        imageUrl: dto.imageUrl || fusionauthUser.imageUrl,
        status: 'active',
        isVerified: fusionauthUser.verified || false,
        organizationIds: dto.organizationIds || [],
      });

      console.log(`[UsersService] User ${fusionauthUser.id} created via direct flow`);

      return user;
    } catch (error) {
      // Si falla crear en FusionAuth, no creamos en MongoDB
      console.error('[UsersService] Error creating user:', error);

      throw new BadRequestException(
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Crea un usuario con múltiples registrations en FusionAuth.
   * Según 03-PERMISOS.md sección 5.1:
   * - user.data.roles: Todos los roles del usuario
   * - user.data.organizationIds: Todas las organizaciones
   * - registrations[]: Una por app con subset de roles permitidos
   *
   * @param userModel - Mongoose User Model
   * @param fusionauthTenantId - ID del tenant de FusionAuth
   * @param tenantSlug - Slug del tenant
   * @param applications - Array de { id, roles } para cada app
   * @param dto - Datos del usuario (validated by Zod)
   * @returns Usuario creado
   */
  async createWithMultipleApps(
    userModel: Model<User>,
    fusionauthTenantId: string,
    tenantSlug: string,
    applications: { id: string; roles: string[] }[],
    dto: CreateUserRequest
  ): Promise<User> {
    // 1. Verificar que el email no existe en MongoDB
    const existingUser = await getUserByEmail(userModel, dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // 2. Crear usuario en FusionAuth con múltiples registrations
      const fusionauthUser = await createFusionAuthUserWithApps({
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        tenantId: fusionauthTenantId,
        tenantSlug,
        roles: dto.roles,
        organizationIds: dto.organizationIds,
        primaryOrganizationId: dto.primaryOrganizationId,
        registrations: applications.map((app) => ({
          applicationId: app.id,
          roles: app.roles,
        })),
        sendSetPasswordEmail: !dto.password,
      });

      // 3. Crear usuario en MongoDB
      const user = await createUserInDb(userModel, {
        fusionauthUserId: fusionauthUser.id,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        imageUrl: dto.imageUrl || fusionauthUser.imageUrl,
        status: 'active',
        isVerified: fusionauthUser.verified || false,
        organizationIds: dto.organizationIds || [],
      });

      console.log(`[UsersService] User ${fusionauthUser.id} created with ${applications.length} app registrations`);

      return user;
    } catch (error) {
      console.error('[UsersService] Error creating user with multiple apps:', error);

      throw new BadRequestException(
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Obtiene un usuario por su FusionAuth User ID.
   *
   * @param userModel - Mongoose User Model
   * @param fusionauthUserId - ID del usuario en FusionAuth
   * @returns Usuario o null
   */
  async findByFusionauthId(userModel: Model<User>, fusionauthUserId: string): Promise<User | null> {
    console.log(`[UsersService.findByFusionauthId] Looking for fusionauthUserId: ${fusionauthUserId}`);
    const user = await getUserByFusionauthId(userModel, fusionauthUserId);
    console.log(`[UsersService.findByFusionauthId] Result:`, user ? `Found user ${user.email}` : 'Not found');
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
   * Actualiza un usuario en FusionAuth + MongoDB.
   *
   * @param userModel - Mongoose User Model
   * @param fusionauthUserId - ID del usuario en FusionAuth
   * @param dto - Datos a actualizar (validated by Zod)
   * @returns Usuario actualizado
   */
  async update(
    userModel: Model<User>,
    fusionauthUserId: string,
    dto: UpdateUserRequest
  ): Promise<User> {
    // 1. Verificar que el usuario existe
    const existingUser = await getUserByFusionauthId(userModel, fusionauthUserId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    try {
      // 2. Actualizar en FusionAuth (solo campos que FusionAuth maneja)
      if (dto.firstName || dto.lastName || dto.imageUrl) {
        await updateFusionAuthUser(fusionauthUserId, {
          firstName: dto.firstName || existingUser.firstName,
          lastName: dto.lastName || existingUser.lastName,
          imageUrl: dto.imageUrl,
        });
      }

      // 3. Actualizar en MongoDB
      const updatedUser = await updateUser(userModel, fusionauthUserId, {
        ...dto,
      });

      if (!updatedUser) {
        throw new NotFoundException('User not found after update');
      }

      console.log(`[UsersService] User ${fusionauthUserId} updated`);

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
   * @param fusionauthUserId - ID del usuario en FusionAuth
   * @returns Usuario archivado
   */
  async archive(userModel: Model<User>, fusionauthUserId: string): Promise<User> {
    const user = await getUserByFusionauthId(userModel, fusionauthUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Marcar como archived en MongoDB
      // Nota: FusionAuth maneja el estado del usuario separadamente
      const archivedUser = await archiveUserInDb(userModel, fusionauthUserId);

      if (!archivedUser) {
        throw new NotFoundException('User not found after archive');
      }

      console.log(`[UsersService] User ${fusionauthUserId} archived`);

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
   * Elimina permanentemente un usuario de FusionAuth + MongoDB.
   * ⚠️ OPERACIÓN IRREVERSIBLE - Usar con precaución.
   *
   * @param userModel - Mongoose User Model
   * @param fusionauthUserId - ID del usuario en FusionAuth
   * @returns True si se eliminó
   */
  async remove(userModel: Model<User>, fusionauthUserId: string): Promise<boolean> {
    const user = await getUserByFusionauthId(userModel, fusionauthUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // 1. Eliminar de FusionAuth
      await deleteFusionAuthUser(fusionauthUserId);

      // 2. Eliminar de MongoDB
      const deleted = await deleteUserFromDb(userModel, fusionauthUserId);

      console.log(`[UsersService] User ${fusionauthUserId} permanently deleted`);

      return deleted;
    } catch (error) {
      console.error('[UsersService] Error deleting user:', error);

      throw new BadRequestException(
        `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
