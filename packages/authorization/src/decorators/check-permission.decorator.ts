import { SetMetadata } from '@nestjs/common';

export const CHECK_PERMISSION_KEY = 'checkPermission';

export interface CheckPermissionOptions {
  /** Tipo de recurso (organization, user, event, etc.) */
  resource: string;

  /** Acción a verificar (view, create, update, delete, etc.) */
  action: string;

  /** Nombre del parámetro de ruta que contiene el ID del recurso */
  idParam?: string;
}

/**
 * Decorator para verificar permisos con Cerbos
 *
 * @example
 * @CheckPermission({ resource: 'organization', action: 'update', idParam: 'slug' })
 * async update(@Param('slug') slug: string) { ... }
 */
export const CheckPermission = (options: CheckPermissionOptions) =>
  SetMetadata(CHECK_PERMISSION_KEY, options);
