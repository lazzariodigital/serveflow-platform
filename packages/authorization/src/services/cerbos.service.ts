import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { GRPC } from '@cerbos/grpc';
import type { CheckResourceRequest, Value } from '@cerbos/core';
import { env } from '@serveflow/config';

type CerbosAttributes = Record<string, Value>;

export interface CerbosPrincipal {
  id: string;
  roles: string[];
  attr: {
    organizationIds: string[];
    email?: string;
    tenantSlug?: string;
  };
}

export interface CerbosResource {
  kind: string;
  id: string;
  attr: CerbosAttributes;
}

export interface CheckResult {
  allowed: boolean;
  actions: Record<string, boolean>;
}

@Injectable()
export class CerbosService implements OnModuleInit {
  private client!: GRPC;
  private readonly logger = new Logger(CerbosService.name);

  async onModuleInit() {
    const url = env.CERBOS_GRPC_URL;
    const tls = env.CERBOS_TLS_ENABLED;

    this.client = new GRPC(url, { tls });
    this.logger.log(`Cerbos client initialized: ${url} (TLS: ${tls})`);
  }

  /**
   * Verifica múltiples acciones sobre un recurso
   */
  async check(
    principal: CerbosPrincipal,
    resource: CerbosResource,
    actions: string[],
    scope?: string
  ): Promise<CheckResult> {
    // Include scope in principal attributes for scoped policy matching
    const principalAttr = {
      ...principal.attr,
      ...(scope && { scope }),
    } as CerbosAttributes;

    const request: CheckResourceRequest = {
      principal: {
        id: principal.id,
        roles: principal.roles,
        attr: principalAttr,
        // No usar scope por ahora - las policies no están scoped por tenant
      },
      resource: {
        kind: resource.kind,
        id: resource.id,
        attr: resource.attr as CerbosAttributes,
      },
      actions,
    };

    this.logger.debug(`Cerbos request: ${JSON.stringify(request, null, 2)}`);

    const result = await this.client.checkResource(request);

    this.logger.debug(`Cerbos response for actions [${actions.join(', ')}]: ${JSON.stringify(result, null, 2)}`);

    const actionResults: Record<string, boolean> = {};
    for (const action of actions) {
      actionResults[action] = result.isAllowed(action);
    }

    return {
      allowed: actions.every((a) => actionResults[a]),
      actions: actionResults,
    };
  }

  /**
   * Verifica una sola acción (helper)
   */
  async isAllowed(
    principal: CerbosPrincipal,
    resource: CerbosResource,
    action: string,
    scope?: string
  ): Promise<boolean> {
    const result = await this.check(principal, resource, [action], scope);
    return result.allowed;
  }

  /**
   * Construye Principal desde AuthenticatedUser
   */
  buildPrincipal(user: {
    fusionauthUserId: string;
    roles: string[];
    organizationIds: string[];
    email?: string;
    tenantSlug?: string;
  }): CerbosPrincipal {
    return {
      id: user.fusionauthUserId,
      roles: user.roles,
      attr: {
        organizationIds: user.organizationIds || [],
        email: user.email,
        tenantSlug: user.tenantSlug,
      },
    };
  }
}
