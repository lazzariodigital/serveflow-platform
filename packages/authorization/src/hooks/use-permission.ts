'use client';

import { useCallback, useState, useRef } from 'react';

interface PermissionCheckOptions {
  resource: string;
  action: string;
  resourceId?: string;
  resourceAttr?: Record<string, unknown>;
}

interface UsePermissionResult {
  checkPermission: (options: PermissionCheckOptions) => Promise<boolean>;
  isLoading: boolean;
}

/**
 * Hook para verificar permisos con Cerbos
 *
 * @example
 * ```tsx
 * const { checkPermission, isLoading } = usePermission();
 *
 * const handleClick = async () => {
 *   const allowed = await checkPermission({
 *     resource: 'organization',
 *     action: 'update',
 *     resourceId: 'org-slug'
 *   });
 *   if (allowed) {
 *     // proceed
 *   }
 * };
 * ```
 */
export function usePermission(): UsePermissionResult {
  const [isLoading, setIsLoading] = useState(false);
  const cache = useRef<Map<string, boolean>>(new Map());

  const checkPermission = useCallback(
    async (options: PermissionCheckOptions): Promise<boolean> => {
      const cacheKey = JSON.stringify(options);

      // Retornar de cache si existe
      if (cache.current.has(cacheKey)) {
        return cache.current.get(cacheKey)!;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          cache.current.set(cacheKey, false);
          return false;
        }

        const { allowed } = await response.json();
        cache.current.set(cacheKey, allowed);
        return allowed;
      } catch {
        cache.current.set(cacheKey, false);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { checkPermission, isLoading };
}
