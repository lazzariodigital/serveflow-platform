import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Value } from '@cerbos/core';
import { CerbosService, CerbosResource } from '../services/cerbos.service';
import { ResourceLoaderService } from '../services/resource-loader.service';
import {
  CHECK_PERMISSION_KEY,
  CheckPermissionOptions,
} from '../decorators/check-permission.decorator';

@Injectable()
export class CerbosGuard implements CanActivate {
  private readonly logger = new Logger(CerbosGuard.name);

  constructor(
    private reflector: Reflector,
    private cerbosService: CerbosService,
    private resourceLoader: ResourceLoaderService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Obtener metadata del decorator
    const permission = this.reflector.getAllAndOverride<CheckPermissionOptions>(
      CHECK_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Si no hay decorator, permitir (otros guards manejan)
    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;

    // 2. Validar que hay usuario autenticado
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 3. Construir Principal desde el usuario autenticado
    const principal = this.cerbosService.buildPrincipal({
      fusionauthUserId: user.fusionauthUserId,
      roles: user.roles || [],
      organizationIds: user.organizationIds || [],
      email: user.email,
      tenantSlug: tenant?.slug,
    });

    // 4. Obtener ID del recurso si se especificó
    // Para operaciones de colección (list, create) usar "*" como placeholder
    const resourceId = permission.idParam
      ? request.params[permission.idParam]
      : '*';

    // 5. Cargar atributos del recurso desde MongoDB
    // Solo cargar si hay un ID específico (no "*" para operaciones de colección)
    const resourceAttr =
      resourceId && resourceId !== '*' && request.mongooseConnection
        ? await this.resourceLoader.loadAttributes(
            request.mongooseConnection,
            permission.resource,
            resourceId
          )
        : {};

    // 6. Construir objeto Resource para Cerbos
    // Usar el _id de MongoDB como resource ID si está disponible (para comparar con organizationIds)
    // Si no, usar el resourceId original (slug, etc.)
    const cerbosResourceId = resourceAttr._id || resourceId;

    const resource: CerbosResource = {
      kind: permission.resource,
      id: cerbosResourceId,
      attr: resourceAttr as Record<string, Value>,
    };

    // 7. Consultar Cerbos con scope del tenant
    const isAllowed = await this.cerbosService.isAllowed(
      principal,
      resource,
      permission.action,
      tenant?.slug // scope para scoped policies
    );

    this.logger.debug(
      `Permission check: ${permission.action} on ${permission.resource}:${cerbosResourceId} ` +
        `for user ${user.fusionauthUserId} (roles: ${user.roles.join(',')}) = ${isAllowed}`
    );

    // 8. Lanzar excepción si no permitido
    if (!isAllowed) {
      throw new ForbiddenException(
        `Permission denied: cannot ${permission.action} ${permission.resource}`
      );
    }

    return true;
  }
}
