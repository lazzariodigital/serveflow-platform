import { Body, Controller, Post, Req, Logger } from '@nestjs/common';
import type { Value } from '@cerbos/core';
import {
  CerbosService,
  CerbosResource,
  ResourceLoaderService,
} from '@serveflow/authorization/server';
import type { AuthRequest } from '@serveflow/auth';

interface CheckPermissionDto {
  resource: string;
  action: string;
  resourceId?: string;
  resourceAttr?: Record<string, unknown>;
}

interface CheckPermissionResponse {
  allowed: boolean;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly cerbosService: CerbosService,
    private readonly resourceLoader: ResourceLoaderService
  ) {}

  /**
   * POST /api/auth/check
   * Verifica si el usuario actual tiene permiso para una acción
   */
  @Post('check')
  async checkPermission(
    @Req() req: AuthRequest,
    @Body() dto: CheckPermissionDto
  ): Promise<CheckPermissionResponse> {
    const user = req.user;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = (req as any).tenant;

    // Construir principal
    const principal = this.cerbosService.buildPrincipal({
      fusionauthUserId: user.fusionauthUserId,
      roles: user.roles || [],
      organizationIds: user.organizationIds || [],
      email: user.email,
      tenantSlug: tenant?.slug,
    });

    // Cargar atributos del recurso si hay ID
    let resourceAttr = dto.resourceAttr || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (dto.resourceId && (req as any).mongooseConnection) {
      const loadedAttr = await this.resourceLoader.loadAttributes(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).mongooseConnection,
        dto.resource,
        dto.resourceId
      );
      resourceAttr = { ...loadedAttr, ...resourceAttr };
    }

    // Construir recurso
    const resource: CerbosResource = {
      kind: dto.resource,
      id: dto.resourceId || '',
      attr: resourceAttr as Record<string, Value>,
    };

    // Verificar con Cerbos
    const allowed = await this.cerbosService.isAllowed(
      principal,
      resource,
      dto.action,
      tenant?.slug
    );

    this.logger.debug(
      `Auth check: ${dto.action} on ${dto.resource}:${dto.resourceId || 'new'} = ${allowed}`
    );

    return { allowed };
  }
}
